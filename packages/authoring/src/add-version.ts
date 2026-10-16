import type { VersionDraft } from "./create-piece.js";
import { compact, editPiece } from "./edit-piece.js";
import { nextVariationIds, nextVersionId } from "./local-ids.js";
import { DATE, type Outcome } from "./piece-file.js";
import { appendToList } from "./yaml-edit.js";

export type VariationDraft = {
  script: string;
  status: string;
  personal_note?: string;
};

export type NewVersion = VersionDraft & { variations?: VariationDraft[] };

/**
 * Ouvre la version suivante d'une pièce : une nouvelle réalisation, ajoutée à
 * la suite. Les versions précédentes restent intactes à l'octet près, et aucun
 * statut ne bouge.
 */
export async function addVersion(
  root: string,
  slug: string,
  version: NewVersion,
): Promise<Outcome<{ id: string }>> {
  if (!DATE.test(String(version.date ?? ""))) {
    return { ok: false, message: "date : attendu une date AAAA-MM-JJ" };
  }

  return editPiece(root, slug, (text, data, piece) => {
    const id = nextVersionId(data.versions.map((existing) => existing.id));
    const variations = version.variations ?? [];
    const variationIds = nextVariationIds(id, [], variations.length);
    const entry = compact({
      id,
      date: version.date,
      format: version.format,
      columns: version.columns,
      intention: version.intention,
      variations:
        variations.length > 0
          ? variations.map((variation, index) => toVariation(variationIds[index]!, variation))
          : undefined,
    });
    return { edit: appendToList(text, piece, "versions", [entry]), result: { id } };
  });
}

export function toVariation(id: string, variation: VariationDraft): Record<string, unknown> {
  return compact({
    id,
    script: variation.script,
    status: variation.status,
    personal_note: variation.personal_note,
  });
}
