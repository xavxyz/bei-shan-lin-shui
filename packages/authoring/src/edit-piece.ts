import type { PieceFrontmatter } from "@bsls/schema";
import { applyChange, type ChangeOf } from "./edit-document.js";
import { checkPiece, readPiece, writePiece, type Outcome, type PieceText } from "./piece-file.js";

/**
 * Lit une pièce valide et lui applique une édition textuelle, sans rien écrire :
 * rend la pièce obtenue si elle est encore valide, ou la raison du refus.
 */
export async function prepareEdit<T extends object>(
  root: string,
  slug: string,
  change: ChangeOf<PieceFrontmatter, T>,
): Promise<Outcome<{ piece: PieceText; result: T }>> {
  const read = await readPiece(root, slug);
  if (!read.ok) return read;

  const changed = await applyChange(slug, read.piece.frontmatter, checkPiece, change);
  if (!changed.ok) return changed;

  return {
    ok: true,
    piece: { ...read.piece, frontmatter: changed.text },
    result: changed.result,
  };
}

/** Comme `prepareEdit`, puis écrit la pièce obtenue. Un refus n'écrit rien. */
export async function editPiece<T extends object>(
  root: string,
  slug: string,
  change: ChangeOf<PieceFrontmatter, T>,
): Promise<Outcome<T>> {
  const prepared = await prepareEdit(root, slug, change);
  if (!prepared.ok) return prepared;

  await writePiece(prepared.piece);
  return { ok: true, ...prepared.result };
}
