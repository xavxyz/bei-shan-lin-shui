import { editPiece } from "./edit-piece.js";
import type { Outcome } from "./piece-file.js";
import { projectsMissing } from "./projects.js";
import { appendToList } from "./yaml-edit.js";

/**
 * Rattache une pièce à un projet. Une pièce ne rejoint un projet que si elle
 * est reprise pour lui (cf. **Projet** dans `GLOSSARY.md`) : c'est à la skill
 * de l'avoir fait confirmer ; l'opération, elle, n'ajoute que l'identifiant.
 */
export async function attachToProject(
  root: string,
  slug: string,
  projectId: string,
): Promise<Outcome<object>> {
  const missing = await projectsMissing(root, [projectId]);
  if (missing.length > 0) return { ok: false, message: `projet inconnu : ${projectId}` };

  return editPiece(root, slug, (text, data, piece) => {
    if (data.projects.includes(projectId)) {
      return { ok: false, message: `déjà rattachée à ${projectId}` };
    }
    return { edit: appendToList(text, piece, "projects", [projectId]), result: {} };
  });
}
