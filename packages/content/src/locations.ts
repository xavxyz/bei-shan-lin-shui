import { readdir } from "node:fs/promises";
import { join, normalize } from "node:path";
import { RESERVED_PROJECT_ID } from "@bsls/schema";

/**
 * Où vivent les fichiers sur le disque, et sous quelles URL le site les publie.
 * Un seul module le sait : déplacer le contenu ne casse qu'ici.
 */

export const PIECES_DIR = "pieces";
export const PROJECTS_DIR = "projects";
export const PIECE_FILE = "piece.md";
export const IMAGES_DIR = "images";

/** Préfixe d'URL sous lequel les images du contenu sont servies. */
export const CONTENT_IMAGES_BASE = "/content-images";

export function pieceFile(slug: string): string {
  return `${PIECES_DIR}/${slug}/${PIECE_FILE}`;
}

export function projectFile(id: string): string {
  return `${PROJECTS_DIR}/${id}.yaml`;
}

export function pieceImageFile(slug: string, file: string): string {
  return `${PIECES_DIR}/${slug}/${IMAGES_DIR}/${file}`;
}

export function contentImageUrl(slug: string, file: string): string {
  return `${CONTENT_IMAGES_BASE}/${slug}/${file}`;
}

/**
 * URL d'une pièce : sous son projet, ou sous la route de repli quand elle n'en
 * a aucun, pour qu'aucune pièce publiée ne devienne inatteignable.
 */
export function pieceHref(slug: string, projectId?: string): string {
  return `/${projectId ?? RESERVED_PROJECT_ID}/${slug}`;
}

export function projectHref(id: string): string {
  return `/${id}`;
}

/** Chemin disque d'une URL `/content-images/…`, ou rien si l'URL ne désigne pas une image. */
export function resolveContentImagePath(root: string, url: string): string | undefined {
  const pathname = url.split("?")[0] ?? "";
  if (!pathname.startsWith(`${CONTENT_IMAGES_BASE}/`)) return undefined;

  const relative = normalize(decodeURIComponent(pathname.slice(CONTENT_IMAGES_BASE.length + 1)));
  if (relative.startsWith("..")) return undefined;

  const [slug, ...rest] = relative.split("/");
  if (!slug || rest.length !== 1) return undefined;

  return join(root, pieceImageFile(slug, rest[0]!));
}

/** Dossiers d'images à publier, un par pièce présente sur le disque. */
export async function contentImageDirectories(
  root: string,
): Promise<{ slug: string; directory: string }[]> {
  const entries = await readdir(join(root, PIECES_DIR), { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      slug: entry.name,
      directory: join(root, PIECES_DIR, entry.name, IMAGES_DIR),
    }));
}
