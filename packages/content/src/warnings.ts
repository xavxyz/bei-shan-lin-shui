import { checkFormat } from "@bsls/schema";
import type { Content, ContentError } from "./load-content.js";
import { pieceFile } from "./locations.js";

/**
 * Ce que le contenu tolère encore, mais qui ne s'écrit plus : chaque format de
 * version hors de la notation, que l'écriture refuse désormais. Un
 * avertissement ne casse pas le build ; il attend la réécriture de la pièce
 * avec le calligraphe.
 */
export function contentWarnings(content: Content): ContentError[] {
  return content.pieces.flatMap((piece) =>
    piece.versions.flatMap((version) => {
      const checked = checkFormat(version.format);
      if (checked.ok) return [];
      const path = `${version.id} · format`;
      return [{ file: pieceFile(piece.slug), path, message: checked.message }];
    }),
  );
}
