/**
 * La couture d'édition du frontmatter, pour les autres écrivains du contenu
 * (`@bsls/scans`) : lire et réécrire un `piece.md` au caractère près, insérer
 * dans ses listes sans resérialiser le reste, nommer ce qui s'ajoute.
 */
export {
  variationDraftSchema,
  variationEntry,
  versionDraftSchema,
  versionEntry,
} from "./drafts.js";
export { isVariationOf } from "./local-ids.js";
export { checkPiece, readPiece, writePiece } from "./piece-file.js";
export type { Outcome, PieceText } from "./piece-file.js";
export { appendToList, rootMap, variationNode, versionNode } from "./yaml-edit.js";
