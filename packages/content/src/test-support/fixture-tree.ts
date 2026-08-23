import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { stringify } from "yaml";

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
  const root = await mkdtemp(join(tmpdir(), "bsls-content-"));

  for (const [id, project] of Object.entries(tree.projects ?? {})) {
    await write(join(root, "projects", `${id}.yaml`), stringify(project));
  }

  for (const [slug, piece] of Object.entries(tree.pieces ?? {})) {
    await write(join(root, "pieces", slug, "piece.md"), `---\n${stringify(piece)}---\n`);
  }

  for (const file of tree.files ?? []) {
    await write(join(root, file), "");
  }

  return root;
}

async function write(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}
