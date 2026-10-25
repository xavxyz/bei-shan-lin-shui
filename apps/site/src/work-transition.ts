import type { LoadedPiece, LoadedVersion } from "@bsls/schema";
import { featuredVersion } from "@bsls/content/featured";

/**
 * Le nom de transition de vue d'une œuvre, que portent sa vignette au mur et
 * l'image d'ouverture de sa page : la vignette cliquée grandit jusqu'à l'œuvre.
 * Le préfixe évite un identifiant CSS qui commencerait par un chiffre.
 */
export function workTransitionName(slug: string): string {
  return `piece-${slug}`;
}

/**
 * Le nom de transition que porte une version sur la page pièce : seule la
 * version de l'image mise en avant, celle de la vignette, courante ou
 * antérieure, le porte ; deux éléments du même nom annuleraient la transition.
 */
export function versionTransitionName(
  piece: LoadedPiece,
  version: LoadedVersion,
): string | undefined {
  return featuredVersion(piece.versions)?.id === version.id
    ? workTransitionName(piece.slug)
    : undefined;
}
