import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stringify } from "yaml";
import { pieceFile, projectFile } from "../locations.js";

/**
 * Écrit une vraie arborescence de contenu dans un répertoire temporaire.
 * Les tests observent le contenu retourné, jamais un système de fichiers simulé.
 */
export type FixtureTree = {
  /** Fichiers de projet, indexés par identifiant. Sérialisés en YAML. */
  projects?: Record<string, unknown>;
  /** Pièces, indexées par slug de dossier. Sérialisées en frontmatter YAML. */
  pieces?: Record<string, unknown>;
  /** Fichiers image à créer, en chemins relatifs à la racine du contenu. */
  files?: string[];
};

export async function writeFixtureTree(tree: FixtureTree): Promise<string> {
  const files: Record<string, string> = {};
  for (const [id, project] of Object.entries(tree.projects ?? {})) {
    files[projectFile(id)] = stringify(project);
  }
  for (const [slug, piece] of Object.entries(tree.pieces ?? {})) {
    files[pieceFile(slug)] = `---\n${stringify(piece)}---\n`;
  }
  for (const file of tree.files ?? []) files[file] = "";
  return writeTree(files);
}

/**
 * Écrit une arborescence fichier par fichier, au caractère près : pour les
 * tests d'écriture, qui comparent des octets, commentaires YAML compris.
 * Les chemins sont relatifs à la racine retournée.
 */
export async function writeTree(files: Record<string, string | Uint8Array>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "bsls-content-"));
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), contents);
  }
  return root;
}
