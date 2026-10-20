import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { formatContentErrors, loadContent } from "@bsls/content";
import { parsePlan } from "@bsls/notion-import";

/** Ce dont les grilles ont besoin d'une version : son format et ses colonnes, en traditionnel. */
export type GridVersion = { id: string; date: string; format: string; columns: string[] };

export type GridPiece = {
  slug: string;
  title: string;
  /** D'où vient la pièce : `content/`, ou le plan d'import qui la porte encore. */
  origin: string;
  /** Du plus ancien au plus récent : la dernière est l'intention courante. */
  versions: GridVersion[];
};

export type FindResult = { ok: true; piece: GridPiece } | { ok: false; message: string };

const PLAN_SUFFIX = ".plan.yaml";

/**
 * Cherche une pièce par son slug dans le contenu, brouillons compris, puis
 * dans les plans d'import pas encore appliqués. Lit, n'écrit jamais.
 */
export async function findPiece(root: string, slug: string): Promise<FindResult> {
  const loaded = await loadContent(join(root, "content"), { includeUnpublished: true });
  if (!loaded.ok) {
    return { ok: false, message: `contenu invalide :\n${formatContentErrors(loaded.errors)}` };
  }
  const piece = loaded.content.pieces.find((candidate) => candidate.slug === slug);
  if (piece) {
    return {
      ok: true,
      piece: {
        slug,
        title: piece.title.traditional,
        origin: "content/",
        versions: piece.versions.map((version) => ({
          id: version.id,
          date: version.date,
          format: version.format,
          columns: version.columns.map((column) => column.traditional),
        })),
      },
    };
  }

  const imports = join(root, "imports");
  const plans = (await readdir(imports).catch(() => [] as string[]))
    .filter((file) => file.endsWith(PLAN_SUFFIX))
    .sort();
  for (const file of plans) {
    const parsed = parsePlan(await readFile(join(imports, file), "utf8"));
    if (!parsed.ok) continue;
    const planned = parsed.plan.pieces.find((candidate) => candidate.slug === slug);
    if (!planned) continue;
    return {
      ok: true,
      piece: {
        slug,
        title: planned.title,
        origin: `imports/${file}`,
        versions: [...planned.versions]
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((version) => ({
            id: version.id,
            date: version.date,
            format: version.format,
            columns: version.columns,
          })),
      },
    };
  }

  return {
    ok: false,
    message: `aucune pièce « ${slug} » dans content/ ni dans imports/*${PLAN_SUFFIX}`,
  };
}
