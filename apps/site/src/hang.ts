import type { LoadedPiece } from "@bsls/schema";

/** De la plus récente à la plus ancienne, par la date de leur dernière version ; le slug départage. */
function byLatestVersion(a: LoadedPiece, b: LoadedPiece): number {
  const date = b.latestVersion.date.localeCompare(a.latestVersion.date);
  return date !== 0 ? date : a.slug.localeCompare(b.slug);
}

/**
 * Répartit les pièces que le content layer a rendues : celles qui ont une image
 * vont au mur, accrochées de la plus récente à la plus ancienne ; les autres
 * attendent leur scan. Le site public n'en reçoit que des premières — la règle
 * publique vit dans le content layer — ; seul le mode admin, qui reçoit tout, a
 * donc des pièces sans scan.
 */
export function hang(pieces: LoadedPiece[]): { wall: LoadedPiece[]; unscanned: LoadedPiece[] } {
  return {
    wall: pieces.filter((piece) => piece.featuredImage !== null).sort(byLatestVersion),
    unscanned: pieces.filter((piece) => piece.featuredImage === null),
  };
}
