import type { LoadedPiece, LoadedProject } from "@bsls/schema";

/**
 * Les pièces d'un projet, telles que le content layer les a rattachées
 * (`pieceSlugs`) et dans son ordre : le site ne refait pas le rattachement.
 */
export function projectPieces(project: LoadedProject, pieces: LoadedPiece[]): LoadedPiece[] {
  const bySlug = new Map(pieces.map((piece) => [piece.slug, piece]));
  return project.pieceSlugs.map((slug) => {
    const piece = bySlug.get(slug);
    if (!piece) throw new Error(`projet ${project.id} : pièce introuvable, ${slug}`);
    return piece;
  });
}
