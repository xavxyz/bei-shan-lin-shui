import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pieceFile } from "@bsls/content";
import { pieceFrontmatterSchema, type PieceFrontmatter, type z } from "@bsls/schema";
import { checkYaml } from "./edit-document.js";

/**
 * Lecture et réécriture d'un `piece.md` au caractère près. Les opérations
 * d'écriture modifient le texte du frontmatter par insertion ou par
 * remplacement d'un seul nœud : ce qu'elles ne visent pas reste identique,
 * commentaires compris.
 */

/**
 * Un refus : rien n'a été écrit. `path` désigne le champ fautif quand l'appelant
 * le connaît ; `issues` porte les objections du schéma à la pièce obtenue.
 */
export type Refusal = { ok: false; message: string; path?: string; issues?: z.ZodIssue[] };

export type Outcome<T> = ({ ok: true } & T) | Refusal;

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
  return checkYaml(pieceFrontmatterSchema, frontmatter);
}

/** Un fragment à écrire, sans ses champs absents : un champ facultatif ne s'écrit pas vide. */
export function compact<T extends Record<string, unknown>>(record: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
