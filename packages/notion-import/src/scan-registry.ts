import { parseDocument } from "yaml";
import { variationSchema, z } from "@bsls/schema";
import type { PlanError } from "./plan-file.js";
import { variationIdSchema } from "./plan-file.js";

/**
 * Le registre des scans : une entrée par fichier du Drive, ce que l'agent y lit
 * et la pièce qu'il propose. Plusieurs sous-agents y écrivent en parallèle ;
 * le relire ici attrape ce qu'aucun d'eux ne voit — une valeur hors
 * vocabulaire, une lecture qui n'est pas du chinois, un fichier en double, une
 * pièce qui n'existe nulle part.
 */

/** Ce que `match` peut valoir en dehors d'un slug de pièce. */
export const SCAN_VERDICTS = ["new", "unidentified", "discarded"] as const;

const scanEntrySchema = z.object({
  file: z.string().regex(/\.(jpe?g|heic)$/i, "attendu : le nom d'un fichier JPEG ou HEIC du Drive"),
  /** Une colonne lue, en caractères : les notes en français vont en commentaire. */
  read: z.array(z.string().regex(/^[^A-Za-z]*$/, "attendu : des caractères, sans lettres latines")),
  match: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]),
  script: variationSchema.shape.script.optional(),
  variation: variationIdSchema.optional(),
});

export const scanRegistrySchema = z.object({ scans: z.array(scanEntrySchema) });

export type ScanEntry = z.infer<typeof scanEntrySchema>;
export type ScanRegistryResult =
  { ok: true; scans: ScanEntry[] } | { ok: false; errors: PlanError[] };

/**
 * Relit le registre. `knownSlugs` est l'ensemble des pièces auxquelles un scan
 * peut se rattacher : celles du plan et celles du contenu. Chaque erreur
 * désigne le fichier du scan, pas son rang dans la liste.
 */
export function parseScanRegistry(
  text: string,
  { knownSlugs }: { knownSlugs: ReadonlySet<string> },
): ScanRegistryResult {
  const document = parseDocument(text);
  if (document.errors.length > 0) {
    return {
      ok: false,
      errors: document.errors.map((error) => ({ path: "", message: error.message })),
    };
  }

  const raw = document.toJS() as { scans?: { file?: unknown }[] } | null;
  const at = (path: (string | number)[]) => {
    const [, index, ...rest] = path;
    const file = typeof index === "number" ? raw?.scans?.[index]?.file : undefined;
    return typeof file === "string" ? [file, ...rest].join(".") : path.join(".");
  };

  const parsed = scanRegistrySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: at(issue.path),
        message: issue.message,
      })),
    };
  }

  const errors: PlanError[] = [];
  const seen = new Set<string>();
  for (const scan of parsed.data.scans) {
    if (seen.has(scan.file)) {
      errors.push({ path: scan.file, message: "fichier déjà au registre" });
    }
    seen.add(scan.file);

    const verdict = (SCAN_VERDICTS as readonly string[]).includes(scan.match);
    if (!verdict && !knownSlugs.has(scan.match)) {
      errors.push({
        path: `${scan.file}.match`,
        message: `aucune pièce « ${scan.match} » ; attendu : un slug du plan ou du contenu, ou ${SCAN_VERDICTS.join(", ")}`,
      });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, scans: parsed.data.scans };
}
