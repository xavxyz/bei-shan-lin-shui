import { isMap, isSeq, type YAMLMap } from "yaml";
import { editPiece } from "./edit-piece.js";
import type { Outcome } from "./piece-file.js";
import { replaceScalar } from "./yaml-edit.js";

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

function variationNode(piece: YAMLMap, id: string): YAMLMap | undefined {
  const versions = piece.get("versions", true);
  if (!isSeq(versions)) return undefined;
  for (const version of versions.items) {
    const variations = isMap(version) ? version.get("variations", true) : undefined;
    if (!isSeq(variations)) continue;
    for (const variation of variations.items) {
      if (isMap(variation) && variation.get("id") === id) return variation;
    }
  }
  return undefined;
}
