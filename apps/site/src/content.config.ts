import { defineCollection } from "astro:content";
import type { Loader } from "astro/loaders";
import { formatContentErrors, loadContent, type Content } from "@bsls/content";
import { loadedPieceSchema, loadedProjectSchema } from "@bsls/schema";
import { contentRoot } from "./content-root.js";

/**
 * Le contenu n'est lu qu'une fois par build, quel que soit le nombre de
 * collections qui s'en alimentent.
 */
let pending: Promise<Content> | undefined;

async function readContent(): Promise<Content> {
  pending ??= loadContent(contentRoot).then((result) => {
    if (result.ok) return result.content;
    // Un contenu invalide casse le build, jamais la production.
    throw new Error(
      `Contenu invalide sous ${contentRoot}\n\n${formatContentErrors(result.errors)}`,
    );
  });
  return pending;
}

/** Alimente une collection depuis le content layer, seul point d'entrée du contenu. */
function contentLoader(name: string, select: (content: Content) => { id: string }[]): Loader {
  return {
    name: `bsls:${name}`,
    load: async ({ store, parseData }) => {
      store.clear();
      pending = undefined;
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
