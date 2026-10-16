import { toVariation, type VariationDraft } from "./add-version.js";
import { editPiece } from "./edit-piece.js";
import { nextVariationIds } from "./local-ids.js";
import type { Outcome } from "./piece-file.js";
import { appendToList, versionNode } from "./yaml-edit.js";

/**
 * Ajoute une variation à une version existante : la même réalisation, écrite
 * dans un autre style. Elle s'ajoute aux variations de la version, qui
 * coexistent ; aucun autre statut ne bouge.
 */
export async function addVariation(
  root: string,
  slug: string,
  versionId: string,
  variation: VariationDraft,
): Promise<Outcome<{ id: string }>> {
  return editPiece<{ id: string }>(root, slug, (text, data, piece) => {
    const node = versionNode(piece, versionId);
    if (!node) return { ok: false, message: `version inconnue : ${versionId}` };

    const existing = data.versions.flatMap((version) => version.variations.map((v) => v.id));
    const [id] = nextVariationIds(versionId, existing, 1);
    return {
      edit: appendToList(text, node, "variations", [toVariation(id!, variation)]),
      result: { id: id! },
    };
  });
}
