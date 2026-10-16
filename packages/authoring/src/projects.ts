import { access } from "node:fs/promises";
import { join } from "node:path";
import { projectFile } from "@bsls/content";

/** Les identifiants de projet qui n'ont pas de fichier dans `projects/`. */
export async function projectsMissing(root: string, ids: string[]): Promise<string[]> {
  const missing: string[] = [];
  for (const id of ids) {
    const found = await access(join(root, projectFile(id))).then(
      () => true,
      () => false,
    );
    if (!found) missing.push(id);
  }
  return missing;
}
