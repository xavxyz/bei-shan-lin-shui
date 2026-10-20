import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { formatContentErrors, loadContent } from "@bsls/content";
import { parsePlan } from "@bsls/notion-import";
import type { LoadedVersion } from "@bsls/schema";

/** Ce dont les grilles ont besoin d'une version : son format et ses colonnes, en traditionnel. */
export type GridVersion = Pick<LoadedVersion, "id" | "date" | "format"> & { columns: string[] };

export type GridPiece = {
  slug: string;
  title: string;
  /** D'où vient la pièce : `content/`, ou le plan d'import qui la porte encore. */
  origin: string;
  /**
   * Du plus ancien au plus récent : la dernière est l'intention courante. Le
   * content layer les trie ; le plan, append-only, les porte déjà dans cet ordre.
   */
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
    if (!parsed.ok) {
      const errors = parsed.errors.map((error) => `  ${error.path}: ${error.message}`).join("\n");
      return { ok: false, message: `plan invalide : imports/${file}\n${errors}` };
    }
    const planned = parsed.plan.pieces.find((candidate) => candidate.slug === slug);
    if (!planned) continue;
    return {
      ok: true,
      piece: {
        slug,
        title: planned.title,
        origin: `imports/${file}`,
        versions: planned.versions.map((version) => ({
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
