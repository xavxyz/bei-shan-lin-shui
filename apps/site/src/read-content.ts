import { formatContentErrors, loadContent, type Content } from "@bsls/content";
import { adminMode, contentRoot } from "./content-root.js";

/**
 * Le contenu que le site montre, relu à chaque appel : en développement, une
 * édition sur le disque doit se voir sans redémarrer le serveur.
 */
export async function readContent(): Promise<Content> {
  // Le content layer tient seul la règle publique : publiées, avec une image.
  // En mode admin, il rend tout, et le site ne fait que répartir (mur, « Sans scan »).
  const result = await loadContent(contentRoot, { includeUnpublished: adminMode });
  if (result.ok) return result.content;
  // Un contenu invalide casse le build, jamais la production.
  throw new Error(`Contenu invalide sous ${contentRoot}\n\n${formatContentErrors(result.errors)}`);
}
