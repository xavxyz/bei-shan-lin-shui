import { isMap, isSeq, type YAMLMap } from "yaml";
import { toVariation, type VariationDraft } from "./add-version.js";
import { editPiece } from "./edit-piece.js";
import { nextVariationIds } from "./local-ids.js";
import type { Outcome } from "./piece-file.js";
import { appendToList } from "./yaml-edit.js";

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
    const index = data.versions.findIndex((version) => version.id === versionId);
    const node = versionNode(piece, index);
    if (index === -1 || !node) return { ok: false, message: `version inconnue : ${versionId}` };

    const existing = data.versions.flatMap((version) => version.variations.map((v) => v.id));
    const [id] = nextVariationIds(versionId, existing, 1);
    return {
      edit: appendToList(text, node, "variations", [toVariation(id!, variation)]),
      result: { id: id! },
    };
  });
}

function versionNode(piece: YAMLMap, index: number): YAMLMap | undefined {
  const versions = piece.get("versions", true);
  if (!isSeq(versions)) return undefined;
  const node = versions.items[index];
  return isMap(node) ? node : undefined;
}
