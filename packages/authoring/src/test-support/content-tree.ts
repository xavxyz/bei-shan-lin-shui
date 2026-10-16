import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Écrit une vraie racine de contenu, fichier par fichier et au caractère près :
 * les tests d'écriture comparent des octets, commentaires YAML compris.
 */
export async function writeContentTree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "bsls-authoring-"));
  for (const [path, contents] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), contents, "utf8");
  }
  return root;
}

export async function readPieceFile(root: string, slug: string): Promise<string> {
  return readFile(join(root, "pieces", slug, "piece.md"), "utf8");
}

export const PROJECT_FILE = `title: Explorations personnelles
presentation: |
  戈之研究
theme: jade
`;
