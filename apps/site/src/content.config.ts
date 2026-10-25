import { defineCollection } from "astro:content";
import type { Loader } from "astro/loaders";
import type { Content } from "@bsls/content";
import { loadedPieceSchema, loadedProjectSchema } from "@bsls/schema";
import { readContent } from "./read-content.js";

/**
 * Alimente une collection depuis le content layer, seul point d'entrée du
 * contenu, relu à chaque chargement de collection.
 */
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
