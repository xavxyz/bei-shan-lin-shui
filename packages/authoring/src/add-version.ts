import {
  versionWithVariationsDraftSchema,
  readDraft,
  variationEntry,
  versionEntry,
} from "./drafts.js";
import { editPiece } from "./edit-piece.js";
import { nextVariationIds, nextVersionId } from "./local-ids.js";
import type { Outcome } from "./piece-file.js";
import { appendToList } from "./yaml-edit.js";

/**
 * Ouvre la version suivante d'une pièce : une nouvelle réalisation, ajoutée à
 * la suite. Les versions précédentes restent intactes à l'octet près, et aucun
 * statut ne bouge.
 *
 * La version a la forme de `NewVersion` ; elle est vérifiée avant tout.
 */
export async function addVersion(
  root: string,
  slug: string,
  input: unknown,
): Promise<Outcome<{ id: string }>> {
  const read = readDraft(versionWithVariationsDraftSchema, input);
  if (!read.ok) return read;
  const version = read.draft;

  return editPiece(root, slug, (text, data, piece) => {
    const id = nextVersionId(data.versions.map((existing) => existing.id));
    const variationIds = nextVariationIds(id, [], version.variations.length);
    const variations = version.variations.map((variation, index) =>
      variationEntry(variationIds[index]!, variation),
    );
    const entry = versionEntry(id, version, variations);
    return { edit: appendToList(text, piece, "versions", [entry]), result: { id } };
  });
}
