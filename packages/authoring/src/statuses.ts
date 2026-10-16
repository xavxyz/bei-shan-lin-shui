import { editPiece } from "./edit-piece.js";
import type { Outcome } from "./piece-file.js";
import { replaceScalar, variationNode } from "./yaml-edit.js";

/**
 * Les statuts ne bougent que sur décision du calligraphe : ces opérations
 * changent une seule valeur, et ne déclenchent aucun autre changement.
 * Le vocabulaire admis est celui de `@bsls/schema`, vérifié à l'écriture.
 */

export async function setPieceStatus(
  root: string,
  slug: string,
  status: string,
): Promise<Outcome<{ previous: string }>> {
  return editPiece(root, slug, (text, data, piece) => ({
    edit: replaceScalar(text, piece, "status", status),
    result: { previous: data.status },
  }));
}

export async function setVariationStatus(
  root: string,
  slug: string,
  variationId: string,
  status: string,
): Promise<Outcome<{ previous: string }>> {
  return editPiece<{ previous: string }>(root, slug, (text, data, piece) => {
    const variation = data.versions
      .flatMap((version) => version.variations)
      .find((candidate) => candidate.id === variationId);
    const node = variationNode(piece, variationId);
    if (!variation || !node) return { ok: false, message: `variation inconnue : ${variationId}` };

    return {
      edit: replaceScalar(text, node, "status", status),
      result: { previous: variation.status },
    };
  });
}
