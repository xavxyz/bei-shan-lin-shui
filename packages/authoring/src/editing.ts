/**
 * La couture d'édition du frontmatter, pour les autres écrivains du contenu
 * (`@bsls/scans`, `@bsls/notion-import`) : préparer l'édition d'un `piece.md`
 * au caractère près, insérer dans ses listes sans resérialiser le reste, écrire
 * chaque nœud — version, variation, image — sous sa forme de frontmatter.
 */
export {
  imageEntry,
  variationDraftSchema,
  variationEntry,
  versionDraftSchema,
  versionEntry,
} from "./drafts.js";
export { prepareEdit } from "./edit-piece.js";
export { isVariationOf } from "./local-ids.js";
export { writePiece } from "./piece-file.js";
export type { Outcome, PieceText, Refusal } from "./piece-file.js";
export { appendToList, variationNode, versionNode } from "./yaml-edit.js";
