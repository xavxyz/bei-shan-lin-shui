/** Le titre du site, dans l'en-tête et l'onglet : la police du site doit le dessiner. */
export const SITE_TITLE = "背山臨水";

/** L'adresse de TW-Kai réduite aux caractères publiés, servie par le site (ADR 0005). */
export const SITE_FONT_URL = "/fonts/tw-kai.woff2";

/**
 * La déclaration de TW-Kai, posée telle quelle dans la page : le fichier
 * n'existe qu'à la fin du build, Vite ne peut pas le résoudre. TW-Kai n'a
 * qu'une graisse : déclarée pour toutes, elle n'est jamais grossie en faux gras.
 */
export const SITE_FONT_FACE = `@font-face {
  font-family: "TW-Kai";
  src: url("${SITE_FONT_URL}") format("woff2");
  font-weight: 100 900;
  font-display: swap;
}`;
