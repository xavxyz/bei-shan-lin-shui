import type { LoadedPiece } from "@bsls/schema";

/**
 * Répartit les pièces que le content layer a rendues : celles qui ont une image
 * vont au mur, les autres attendent leur scan. Le site public n'en reçoit que
 * des premières — la règle publique vit dans le content layer — ; seul le mode
 * admin, qui reçoit tout, a donc des pièces sans scan.
 */
export function hang(pieces: LoadedPiece[]): { wall: LoadedPiece[]; unscanned: LoadedPiece[] } {
  return {
    wall: pieces.filter((piece) => piece.featuredImage !== null),
    unscanned: pieces.filter((piece) => piece.featuredImage === null),
  };
}
