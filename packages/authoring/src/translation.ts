import { versionSchema } from "@bsls/schema";
import { readDraft } from "./drafts.js";
import { editPiece } from "./edit-piece.js";
import type { Outcome } from "./piece-file.js";
import { setField, versionNode } from "./yaml-edit.js";

/** Les lignes d'une traduction : aucune vide. Leur nombre, la pièce obtenue le vérifie. */
const translationDraftSchema = versionSchema.pick({ translation: true }).required();

/**
 * Écrit la traduction d'une version existante, une ligne par colonne, 款
 * compris : ajoutée si elle manque, sinon remplacée. Une traduction qui n'a pas
 * une ligne par colonne est refusée, et rien n'est écrit.
 */
export async function setVersionTranslation(
  root: string,
  slug: string,
  versionId: string,
  translation: unknown,
): Promise<Outcome<object>> {
  const read = readDraft(translationDraftSchema, { translation });
  if (!read.ok) return read;

  return editPiece<object>(root, slug, (text, _data, piece) => {
    const node = versionNode(piece, versionId);
    if (!node) return { ok: false, message: `version inconnue : ${versionId}` };
    return {
      edit: setField(text, node, "translation", read.draft.translation, {
        after: ["intention", "columns", "format"],
      }),
      result: {},
    };
  });
}
