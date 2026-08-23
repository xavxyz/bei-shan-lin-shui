import { fileURLToPath } from "node:url";

/**
 * Racine du contenu lue par le site. Surchargeable par `CONTENT_ROOT`, ce dont
 * se servent les tests de bout en bout pour bâtir un site sur des fixtures.
 */
export const contentRoot =
  process.env.CONTENT_ROOT ?? fileURLToPath(new URL("../../../content", import.meta.url));

/** Préfixe d'URL sous lequel les images du contenu sont servies. */
export const CONTENT_IMAGES_BASE = "/content-images";
