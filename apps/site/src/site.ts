/** Le titre du site, dans l'en-tête et l'onglet : la police du site doit le dessiner. */
export const SITE_TITLE = "背山臨水";

/** L'adresse de TW-Kai réduite aux caractères publiés, servie par le site (ADR 0005). */
export const SITE_FONT_URL = "/fonts/tw-kai.woff2";

/**
 * L'adresse de la police de secours, réduite aux caractères publiés que TW-Kai
 * ne dessine pas (ADR 0006). Elle n'est servie que si l'un d'eux est publié.
 */
export const FALLBACK_FONT_URL = "/fonts/lxgw-wenkai-tc.woff2";

const codePoint = (character: string) =>
  `U+${character.codePointAt(0)!.toString(16).toUpperCase()}`;

/**
 * Les déclarations des polices du site, posées telles quelles dans la page :
 * les fichiers n'existent qu'à la fin du build, Vite ne peut pas les résoudre.
 * Chacune n'a qu'une graisse : déclarée pour toutes, elle n'est jamais grossie
 * en faux gras. La secours n'est déclarée que pour les caractères qu'elle
 * porte, si elle en porte : une page qui n'en montre aucun ne la charge pas.
 */
export function siteFontFace(fallbackCharacters: string | undefined): string {
  const twKai = `@font-face {
  font-family: "TW-Kai";
  src: url("${SITE_FONT_URL}") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}`;
  if (!fallbackCharacters) return twKai;
  return `${twKai}
@font-face {
  font-family: "LXGW WenKai TC";
  src: url("${FALLBACK_FONT_URL}") format("woff2");
  font-weight: 100 900;
  font-display: swap;
  unicode-range: ${[...fallbackCharacters].map(codePoint).join(", ")};
}`;
}
