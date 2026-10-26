import type { LoadedPiece } from "@bsls/schema";
import { pieceHref } from "@bsls/content";

/** Des pièces à lier, et le projet de la page sous lequel mènent leurs liens. */
export type PieceLinks = {
  pieces: LoadedPiece[];
  /** Absent hors d'une page projet : chaque lien suit l'URL canonique de sa pièce. */
  projectId?: string;
};

/**
 * Le lien d'une pièce depuis une page : sous le projet de la page, sinon
 * l'URL canonique de la pièce (`piece.href`, sous son premier projet), qui
 * n'est pas `pieceHref(slug)` sans projet, la route de repli.
 */
export function linkedPieceHref(piece: LoadedPiece, projectId?: string): string {
  return projectId ? pieceHref(piece.slug, projectId) : piece.href;
}
