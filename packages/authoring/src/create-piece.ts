import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { PIECES_DIR, deriveSlug, disambiguate, pieceFile } from "@bsls/content";
import { projectsMissing } from "./projects.js";
import { DATE, checkPiece, toYaml, writePiece, type Outcome } from "./piece-file.js";

export type VersionDraft = {
  date: string;
  format: string;
  columns?: string[];
  intention?: string;
};

export type PieceDraft = {
  /** Titre chinois, en traditionnel : il donne le slug. */
  title: string;
  source?: { author?: string; work?: string; dynasty?: string; full_text?: string };
  translation?: string;
  projects?: string[];
  pinyin_overrides?: Record<string, string>;
  version: VersionDraft;
};

/**
 * Fait naître une pièce : statut `idea`, une version initiale `v1`, non publiée.
 * Le slug est dérivé du titre une fois pour toutes ; une pièce existante n'est
 * jamais touchée, un homonyme reçoit un slug suffixé.
 */
export async function createPiece(
  root: string,
  draft: PieceDraft,
): Promise<Outcome<{ slug: string; file: string }>> {
  const slug = await availableSlug(root, draft.title);
  return writeNewPiece(root, slug, draft);
}

/** Le slug que prendrait une pièce de ce titre, compte tenu des pièces existantes. */
export async function availableSlug(root: string, title: string): Promise<string> {
  const entries = await readdir(join(root, PIECES_DIR)).catch(() => [] as string[]);
  return disambiguate(deriveSlug(title), new Set(entries));
}

async function writeNewPiece(
  root: string,
  slug: string,
  draft: PieceDraft,
): Promise<Outcome<{ slug: string; file: string }>> {
  if (!DATE.test(String(draft.version?.date ?? ""))) {
    return { ok: false, message: "version.date : attendu une date AAAA-MM-JJ" };
  }

  const frontmatter = toYaml(
    omitEmpty({
      title: draft.title,
      slug,
      status: "idea",
      projects: draft.projects ?? [],
      source: draft.source,
      versions: [
        omitEmpty({
          id: "v1",
          date: draft.version.date,
          format: draft.version.format,
          columns: draft.version.columns,
          intention: draft.version.intention,
        }),
      ],
      translation: draft.translation,
      pinyin_overrides: draft.pinyin_overrides,
      published: false,
    }),
  );

  const checked = checkPiece(frontmatter);
  if (!checked.ok) return checked;

  const missing = await projectsMissing(root, checked.data.projects);
  if (missing.length > 0) return { ok: false, message: `projet inconnu : ${missing.join(", ")}` };

  const file = pieceFile(slug);
  await writePiece({ slug, path: join(root, file), frontmatter, body: "" });
  return { ok: true, slug, file };
}

function omitEmpty<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
