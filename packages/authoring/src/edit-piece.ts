import { parseDocument, type YAMLMap } from "yaml";
import type { PieceFrontmatter } from "@bsls/schema";
import {
  checkPiece,
  readPiece,
  writePiece,
  type Outcome,
  type PieceText,
  type Refusal,
} from "./piece-file.js";
import { rootMap, type Edit } from "./yaml-edit.js";

type Change<T> = { edit: Edit; result: T } | Refusal;

/**
 * Lit une pièce valide et lui applique une édition textuelle, sans rien écrire :
 * rend la pièce obtenue si elle est encore valide, ou la raison du refus.
 */
export async function prepareEdit<T extends object>(
  root: string,
  slug: string,
  change: (text: string, data: PieceFrontmatter, piece: YAMLMap) => Change<T> | Promise<Change<T>>,
): Promise<Outcome<{ piece: PieceText; result: T }>> {
  const read = await readPiece(root, slug);
  if (!read.ok) return read;

  const before = checkPiece(read.piece.frontmatter);
  if (!before.ok) return { ok: false, message: `${slug} est déjà invalide :\n${before.message}` };

  const map = rootMap(parseDocument(read.piece.frontmatter));
  if (!map) return { ok: false, message: `${slug} : frontmatter illisible` };

  const outcome = await change(read.piece.frontmatter, before.data, map);
  if ("ok" in outcome) return outcome;
  if (!outcome.edit.ok) return outcome.edit;

  const after = checkPiece(outcome.edit.text);
  if (!after.ok) return after;

  return {
    ok: true,
    piece: { ...read.piece, frontmatter: outcome.edit.text },
    result: outcome.result,
  };
}

/** Comme `prepareEdit`, puis écrit la pièce obtenue. Un refus n'écrit rien. */
export async function editPiece<T extends object>(
  root: string,
  slug: string,
  change: Parameters<typeof prepareEdit<T>>[2],
): Promise<Outcome<T>> {
  const prepared = await prepareEdit(root, slug, change);
  if (!prepared.ok) return prepared;

  await writePiece(prepared.piece);
  return { ok: true, ...prepared.result };
}
