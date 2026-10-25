import { readFile } from "node:fs/promises";

/**
 * Le texte d'un fichier, ou `undefined` s'il n'existe pas. Toute autre erreur
 * de lecture, permissions comprises, remonte telle quelle : un fichier
 * illisible n'est pas un fichier absent.
 */
export async function readIfPresent(path: string): Promise<string | undefined> {
  return readFile(path, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
}
