import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseDocument, stringify } from "yaml";
import { pieceFile } from "@bsls/content";
import { pieceFrontmatterSchema, type PieceFrontmatter, type z } from "@bsls/schema";

/**
 * Lecture et réécriture d'un `piece.md` au caractère près. Les opérations
 * d'écriture modifient le texte du frontmatter par insertion ou par
 * remplacement d'un seul nœud : ce qu'elles ne visent pas reste identique,
 * commentaires compris.
 */

export type Outcome<T> = ({ ok: true } & T) | { ok: false; message: string };

export type PieceText = {
  slug: string;
  path: string;
  /** Le frontmatter YAML, sans ses délimiteurs, terminé par un saut de ligne. */
  frontmatter: string;
  /** Ce qui suit le délimiteur fermant, rendu tel quel. */
  body: string;
};

const FRONTMATTER = /^---\r?\n([\s\S]*?\r?\n)?---\r?(?:\n|$)/;

export async function readPiece(
  root: string,
  slug: string,
): Promise<Outcome<{ piece: PieceText }>> {
  const path = join(root, pieceFile(slug));
  const text = await readFile(path, "utf8").catch(() => undefined);
  if (text === undefined) return { ok: false, message: `pièce introuvable : ${slug}` };

  const match = FRONTMATTER.exec(text);
  if (!match) return { ok: false, message: `${pieceFile(slug)} : frontmatter YAML introuvable` };

  return {
    ok: true,
    piece: { slug, path, frontmatter: match[1] ?? "", body: text.slice(match[0].length) },
  };
}

export async function writePiece(piece: PieceText): Promise<void> {
  await mkdir(dirname(piece.path), { recursive: true });
  await writeFile(piece.path, `---\n${piece.frontmatter}---\n${piece.body}`, "utf8");
}

/** La pièce telle que le schéma la lit, ou la raison de son refus. */
export function checkPiece(frontmatter: string): Outcome<{ data: PieceFrontmatter }> {
  const result = pieceFrontmatterSchema.safeParse(parseDocument(frontmatter).toJS());
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: describeIssues(result.error) };
}

export function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`)
    .join("\n");
}

/** Sérialisation des fragments écrits : texte long jamais replié, prose en bloc littéral. */
export function toYaml(value: unknown): string {
  return stringify(value, { lineWidth: 0, blockQuote: "literal" });
}

/** Un fragment à écrire, sans ses champs absents : un champ facultatif ne s'écrit pas vide. */
export function compact<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

/** Décale chaque ligne non vide d'un fragment YAML. */
export function indent(fragment: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return fragment
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

export const DATE = /^\d{4}-\d{2}-\d{2}$/;
