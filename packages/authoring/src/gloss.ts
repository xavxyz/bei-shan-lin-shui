import { pieceFieldsSchema, z } from "@bsls/schema";
import { readDraft } from "./drafts.js";
import { editPiece } from "./edit-piece.js";
import { editProject } from "./edit-project.js";
import type { Outcome } from "./piece-file.js";
import { setField } from "./yaml-edit.js";

/** Une glose est une réponse du calligraphe : jamais vide. */
const glossDraftSchema = z.object({ gloss: pieceFieldsSchema.shape.gloss.unwrap() });

/**
 * Écrit la glose d'une pièce : ajoutée sous le titre si elle manque, sinon
 * remplacée. Le reste du fichier ne bouge pas, commentaires compris.
 */
export async function setPieceGloss(
  root: string,
  slug: string,
  gloss: unknown,
): Promise<Outcome<object>> {
  const read = readDraft(glossDraftSchema, { gloss });
  if (!read.ok) return read;

  return editPiece(root, slug, (text, _data, piece) => ({
    edit: setField(text, piece, "gloss", read.draft.gloss, { after: ["title"] }),
    result: {},
  }));
}

/** Écrit la glose d'un projet, comme celle d'une pièce : sous le titre, le reste du fichier intact. */
export async function setProjectGloss(
  root: string,
  projectId: string,
  gloss: unknown,
): Promise<Outcome<object>> {
  const read = readDraft(glossDraftSchema, { gloss });
  if (!read.ok) return read;

  return editProject(root, projectId, (text, _data, project) => ({
    edit: setField(text, project, "gloss", read.draft.gloss, { after: ["title"] }),
    result: {},
  }));
}
