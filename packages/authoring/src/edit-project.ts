import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { projectFile } from "@bsls/content";
import { projectFileSchema, type ProjectFile } from "@bsls/schema";
import { applyChange, checkYaml, type ChangeOf } from "./edit-document.js";
import type { Outcome } from "./piece-file.js";

/**
 * Lit un projet valide, lui applique une édition textuelle et l'écrit s'il est
 * encore valide, comme `editPiece` pour une pièce. Un refus n'écrit rien.
 */
export async function editProject<T extends object>(
  root: string,
  projectId: string,
  change: ChangeOf<ProjectFile, T>,
): Promise<Outcome<T>> {
  const path = join(root, projectFile(projectId));
  const text = await readFile(path, "utf8").catch(() => undefined);
  if (text === undefined) return { ok: false, message: `projet inconnu : ${projectId}` };

  const check = (yaml: string) => checkYaml(projectFileSchema, yaml);
  const changed = await applyChange(projectFile(projectId), text, check, change);
  if (!changed.ok) return changed;

  await writeFile(path, changed.text, "utf8");
  return { ok: true, ...changed.result };
}
