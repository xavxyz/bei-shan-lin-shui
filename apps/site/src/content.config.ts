import { defineCollection } from "astro:content";
import type { Loader } from "astro/loaders";
import { formatContentErrors, loadContent, type Content } from "@bsls/content";
import { loadedPieceSchema, loadedProjectSchema } from "@bsls/schema";
import { contentRoot } from "./content-root.js";

/**
 * Le contenu est relu à chaque chargement de collection : en développement,
 * une édition sur le disque doit se voir sans redémarrer le serveur.
 */
async function readContent(): Promise<Content> {
  const result = await loadContent(contentRoot);
  if (result.ok) return result.content;
  // Un contenu invalide casse le build, jamais la production.
  throw new Error(`Contenu invalide sous ${contentRoot}\n\n${formatContentErrors(result.errors)}`);
}

/** Alimente une collection depuis le content layer, seul point d'entrée du contenu. */
function contentLoader(name: string, select: (content: Content) => { id: string }[]): Loader {
  return {
    name: `bsls:${name}`,
    load: async ({ store, parseData }) => {
      store.clear();
      for (const entry of select(await readContent())) {
        store.set({ id: entry.id, data: await parseData({ id: entry.id, data: entry }) });
      }
    },
  };
}

const projects = defineCollection({
  loader: contentLoader("projects", (content) => content.projects),
  schema: loadedProjectSchema,
});

const pieces = defineCollection({
  loader: contentLoader("pieces", (content) =>
    content.pieces.map((piece) => ({ ...piece, id: piece.slug })),
  ),
  schema: loadedPieceSchema.extend({ id: loadedPieceSchema.shape.slug }),
});

export const collections = { projects, pieces };
