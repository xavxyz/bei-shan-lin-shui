import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { PIECES_DIR, deriveSlug, disambiguate, pieceFile } from "@bsls/content";
import { pieceDraftSchema, readDraft, versionEntry } from "./drafts.js";
import { projectsMissing } from "./projects.js";
import { checkPiece, compact, writePiece, type Outcome } from "./piece-file.js";
import { toYaml } from "./yaml-edit.js";

/**
 * Fait naître une pièce : statut `idea`, une version initiale `v1`, publiée ou
 * non selon ce que le brouillon répond.
 * Le slug est dérivé du titre une fois pour toutes ; une pièce existante n'est
 * jamais touchée, un homonyme reçoit un slug suffixé.
 *
 * Le brouillon a la forme de `PieceDraft` ; il est vérifié avant tout.
 */
export async function createPiece(
  root: string,
  input: unknown,
): Promise<Outcome<{ slug: string; file: string }>> {
  const read = readDraft(pieceDraftSchema, input);
  if (!read.ok) return read;
  const draft = read.draft;

  const missing = await projectsMissing(root, draft.projects);
  if (missing.length > 0) return { ok: false, message: `projet inconnu : ${missing.join(", ")}` };

  const slug = await availableSlug(root, draft.title);
  const frontmatter = toYaml(
    compact({
      title: draft.title,
      gloss: draft.gloss,
      slug,
      status: "idea",
      projects: draft.projects,
      source: draft.source,
      versions: [versionEntry("v1", draft.version)],
      pinyin_overrides:
        Object.keys(draft.pinyin_overrides).length > 0 ? draft.pinyin_overrides : undefined,
      published: draft.published,
    }),
  );

  const checked = checkPiece(frontmatter);
  if (!checked.ok) return checked;

  const file = pieceFile(slug);
  await writePiece({ slug, path: join(root, file), frontmatter, body: "" });
  return { ok: true, slug, file };
}

/** Le slug que prendrait une pièce de ce titre, compte tenu des pièces existantes. */
export async function availableSlug(root: string, title: string): Promise<string> {
  const entries = await readdir(join(root, PIECES_DIR)).catch(() => [] as string[]);
  return disambiguate(deriveSlug(title), new Set(entries));
}
