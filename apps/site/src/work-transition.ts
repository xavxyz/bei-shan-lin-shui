/**
 * Le nom de transition de vue d'une œuvre, que portent sa vignette au mur et
 * l'image d'ouverture de sa page : la vignette cliquée grandit jusqu'à l'œuvre.
 * Le préfixe évite un identifiant CSS qui commencerait par un chiffre.
 */
export function workTransitionName(slug: string): string {
  return `piece-${slug}`;
}
