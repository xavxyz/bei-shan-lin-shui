import {
  PIECE_STATUSES,
  VARIATION_STATUSES,
  z,
  type PieceStatus,
  type VariationStatus,
} from "@bsls/schema";
import { editPiece } from "./edit-piece.js";
import type { Outcome, Refusal } from "./piece-file.js";
import { replaceScalar, variationNode } from "./yaml-edit.js";

/**
 * Les statuts ne bougent que sur décision du calligraphe : ces opérations
 * changent une seule valeur, et ne déclenchent aucun autre changement.
 * Le statut demandé arrive tel que tapé ; il est lu dans le vocabulaire de
 * `@bsls/schema` avant d'ouvrir la pièce.
 */

export async function setPieceStatus(
  root: string,
  slug: string,
  status: string,
): Promise<Outcome<{ previous: PieceStatus }>> {
  const next = readStatus(z.enum(PIECE_STATUSES), status);
  if (!next.ok) return next;

  return editPiece(root, slug, (text, data, piece) => ({
    edit: replaceScalar(text, piece, "status", next.status),
    result: { previous: data.status },
  }));
}

export async function setVariationStatus(
  root: string,
  slug: string,
  variationId: string,
  status: string,
): Promise<Outcome<{ previous: VariationStatus }>> {
  const next = readStatus(z.enum(VARIATION_STATUSES), status);
  if (!next.ok) return next;

  return editPiece<{ previous: VariationStatus }>(root, slug, (text, data, piece) => {
    const variation = data.versions
      .flatMap((version) => version.variations)
      .find((candidate) => candidate.id === variationId);
    const node = variationNode(piece, variationId);
    if (!variation || !node) return { ok: false, message: `variation inconnue : ${variationId}` };

    return {
      edit: replaceScalar(text, node, "status", next.status),
      result: { previous: variation.status },
    };
  });
}

function readStatus<S extends string>(
  vocabulary: z.ZodEnum<[S, ...S[]]>,
  status: string,
): { ok: true; status: S } | Refusal {
  const result = vocabulary.safeParse(status);
  if (result.success) return { ok: true, status: result.data };
  return { ok: false, path: "status", message: `status : ${result.error.issues[0]!.message}` };
}
