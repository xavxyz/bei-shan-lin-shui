import { fileURLToPath } from "node:url";

/**
 * Racine du contenu lue par le site. Surchargeable par `CONTENT_ROOT`, ce dont
 * se servent les tests de bout en bout pour bâtir un site sur des fixtures.
 */
export const contentRoot =
  process.env.CONTENT_ROOT ?? fileURLToPath(new URL("../../../content", import.meta.url));

/**
 * Mode admin, activé par `BSLS_ADMIN=1` au `dev` comme au `build`, et
 * seulement en local : le site montre aussi les pièces non publiées, marquées
 * comme telles. Le build déployé ne l'active jamais.
 */
export const adminMode = process.env.BSLS_ADMIN === "1";
