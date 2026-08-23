import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * Écrit un vrai export Notion dans un répertoire temporaire : un CSV, ses
 * sous-pages Markdown, ses fichiers joints. Les tests observent ce que le
 * lecteur en retourne, jamais un système de fichiers simulé.
 */
export async function writeExportTree(files: Record<string, string | Buffer>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "bsls-notion-"));

  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents);
  }

  return root;
}
