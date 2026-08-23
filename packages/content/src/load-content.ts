import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  RESERVED_PROJECT_ID,
  SCRIPT_LABELS,
  loadedPieceSchema,
  pieceFrontmatterSchema,
  projectFileSchema,
  type LoadedImage,
  type LoadedPiece,
  type LoadedProject,
  type LoadedVariation,
  type LoadedVersion,
  type PieceFrontmatter,
  type z,
} from "@bsls/schema";
import { deriveChineseText } from "./derive.js";

/** Une erreur de contenu désigne le fichier, le chemin du champ et ce qui était attendu. */
export type ContentError = {
  /** Chemin du fichier, relatif à la racine du contenu. */
  file: string;
  /** Chemin du champ fautif, par exemple `versions.0.variations.1.id`. */
  path: string;
  message: string;
};

export type Content = {
  projects: LoadedProject[];
  pieces: LoadedPiece[];
};

export type LoadResult = { ok: true; content: Content } | { ok: false; errors: ContentError[] };

export type LoadOptions = {
  /** Par défaut le contenu chargé est celui du site : les brouillons en sont absents. */
  includeUnpublished?: boolean;
};

const PIECES_DIR = "pieces";
const PROJECTS_DIR = "projects";
const PIECE_FILE = "piece.md";
const IMAGES_DIR = "images";

/**
 * Charge projets et pièces depuis la racine du contenu.
 *
 * Seul point d'entrée du site vers le contenu, et pure vis-à-vis du disque :
 * elle lit, elle n'écrit jamais. Tout ce qui est retourné est validé et typé ;
 * sinon, la liste complète des erreurs localisées est retournée, pour qu'une
 * seule passe suffise à corriger le contenu.
 */
export async function loadContent(root: string, options: LoadOptions = {}): Promise<LoadResult> {
  const errors: ContentError[] = [];

  const projectFiles = await readProjects(root, errors);
  const pieces = await readPieces(root, projectFiles, errors);

  if (errors.length > 0) return { ok: false, errors };

  const published = options.includeUnpublished ? pieces : pieces.filter((piece) => piece.published);

  return {
    ok: true,
    content: {
      projects: projectFiles.map((project) => ({
        ...project,
        pieceSlugs: published
          .filter((piece) => piece.projects.includes(project.id))
          .map((piece) => piece.slug),
      })),
      pieces: published,
    },
  };
}

type ProjectWithoutPieces = Omit<LoadedProject, "pieceSlugs">;

async function readProjects(root: string, errors: ContentError[]): Promise<ProjectWithoutPieces[]> {
  const projects: ProjectWithoutPieces[] = [];

  for (const entry of await listDir(join(root, PROJECTS_DIR))) {
    if (!entry.isFile() || !/\.ya?ml$/.test(entry.name)) continue;

    const file = `${PROJECTS_DIR}/${entry.name}`;
    const id = entry.name.replace(/\.ya?ml$/, "");
    const raw = await readYaml(join(root, file), file, errors);
    if (raw === undefined) continue;

    const parsed = projectFileSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...toContentErrors(file, parsed.error));
      continue;
    }
    if (id === RESERVED_PROJECT_ID) {
      errors.push({
        file,
        path: "",
        message: `identifiant réservé aux pièces sans projet : ${RESERVED_PROJECT_ID}`,
      });
      continue;
    }

    projects.push({ ...parsed.data, id, href: `/${id}` });
  }

  return projects.sort((a, b) => a.id.localeCompare(b.id));
}

async function readPieces(
  root: string,
  projects: ProjectWithoutPieces[],
  errors: ContentError[],
): Promise<LoadedPiece[]> {
  const pieces: LoadedPiece[] = [];

  for (const entry of await listDir(join(root, PIECES_DIR))) {
    if (!entry.isDirectory()) continue;

    const slug = entry.name;
    const file = `${PIECES_DIR}/${slug}/${PIECE_FILE}`;
    const raw = await readFrontmatter(join(root, file), file, errors);
    if (raw === undefined) continue;

    const parsed = pieceFrontmatterSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push(...toContentErrors(file, parsed.error));
      continue;
    }

    const before = errors.length;
    if (parsed.data.slug !== slug) {
      errors.push({
        file,
        path: "slug",
        message: `attendu : le nom du dossier, ${slug}`,
      });
    }
    checkProjectsExist(parsed.data, projects, file, errors);
    await checkImagesExist(root, parsed.data, slug, file, errors);
    if (errors.length > before) continue;

    pieces.push(toLoadedPiece(parsed.data));
  }

  return pieces.sort((a, b) => a.slug.localeCompare(b.slug));
}

function checkProjectsExist(
  piece: PieceFrontmatter,
  projects: ProjectWithoutPieces[],
  file: string,
  errors: ContentError[],
): void {
  piece.projects.forEach((id, index) => {
    if (projects.some((project) => project.id === id)) return;
    errors.push({
      file,
      path: `projects.${index}`,
      message: `attendu : un projet décrit dans ${PROJECTS_DIR}/, or ${id} n'existe pas`,
    });
  });
}

async function checkImagesExist(
  root: string,
  piece: PieceFrontmatter,
  slug: string,
  file: string,
  errors: ContentError[],
): Promise<void> {
  for (const [versionIndex, version] of piece.versions.entries()) {
    for (const [variationIndex, variation] of version.variations.entries()) {
      for (const [imageIndex, image] of variation.images.entries()) {
        const relative = `${PIECES_DIR}/${slug}/${IMAGES_DIR}/${image.file}`;
        if (await isFile(join(root, relative))) continue;
        errors.push({
          file,
          path: `versions.${versionIndex}.variations.${variationIndex}.images.${imageIndex}.file`,
          message: `fichier absent du disque : attendu à ${IMAGES_DIR}/${image.file}`,
        });
      }
    }
  }
}

function toLoadedPiece(piece: PieceFrontmatter): LoadedPiece {
  const overrides = piece.pinyin_overrides;
  const versions = [...piece.versions]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((version): LoadedVersion => ({
      ...version,
      date: toIsoDate(version.date),
      columns: version.columns.map((column) => deriveChineseText(column, overrides)),
      variations: version.variations.map((variation): LoadedVariation => ({
        ...variation,
        scriptLabel: SCRIPT_LABELS[variation.script],
        images: variation.images.map((image) => ({
          ...image,
          src: `/content-images/${piece.slug}/${image.file}`,
        })),
        featuredImage: pickFeaturedImage(
          variation.images.map((image) => ({
            ...image,
            src: `/content-images/${piece.slug}/${image.file}`,
          })),
        ),
      })),
    }));

  const latestVersion = versions[versions.length - 1]!;
  const project = piece.projects[0];
  const featured = pickFeaturedVariation(versions);

  return loadedPieceSchema.parse({
    ...piece,
    title: deriveChineseText(piece.title, overrides),
    source: piece.source && {
      ...piece.source,
      full_text: piece.source.full_text
        ? deriveChineseText(piece.source.full_text, overrides)
        : undefined,
    },
    versions,
    latestVersion,
    featuredImage: featured?.featuredImage ?? null,
    gallery: featured ? withFeaturedFirst(featured) : [],
    featuredScriptLabel: featured?.scriptLabel ?? null,
    href: project ? `/${project}/${piece.slug}` : `/${RESERVED_PROJECT_ID}/${piece.slug}`,
  } satisfies LoadedPiece);
}

/**
 * Une variation montre en premier l'image explicitement mise en avant ; à
 * défaut la première œuvre entière, à défaut sa première image.
 */
function pickFeaturedImage(images: LoadedImage[]): LoadedImage | null {
  return (
    images.find((image) => image.featured) ??
    images.find((image) => image.kind === "work") ??
    images[0] ??
    null
  );
}

/**
 * Une pièce se montre par son travail le plus récent : dernière version
 * d'abord, et dans une version les variations retenues avant les autres.
 */
function pickFeaturedVariation(versions: LoadedVersion[]): LoadedVariation | null {
  for (const version of [...versions].reverse()) {
    const kept = version.variations.filter((variation) => variation.status === "kept");
    const rest = version.variations.filter((variation) => variation.status !== "kept");
    for (const variation of [...kept, ...rest]) {
      if (variation.featuredImage) return variation;
    }
  }
  return null;
}

/** La galerie s'ouvre sur l'image mise en avant ; les autres suivent dans l'ordre du fichier. */
function withFeaturedFirst(variation: LoadedVariation): LoadedImage[] {
  const featured = variation.featuredImage;
  if (!featured) return variation.images;
  return [featured, ...variation.images.filter((image) => image.file !== featured.file)];
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toContentErrors(file: string, error: z.ZodError): ContentError[] {
  return error.issues.map((issue) => ({
    file,
    path: issue.path.join("."),
    message: issue.message,
  }));
}

async function readYaml(
  path: string,
  file: string,
  errors: ContentError[],
): Promise<unknown | undefined> {
  const text = await readFile(path, "utf8");
  try {
    return parseYaml(text);
  } catch (cause) {
    errors.push({ file, path: "", message: `YAML illisible : ${(cause as Error).message}` });
    return undefined;
  }
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?(?:\n|$)/;

async function readFrontmatter(
  path: string,
  file: string,
  errors: ContentError[],
): Promise<unknown | undefined> {
  let text: string;
  try {
    text = await readFile(path, "utf8");
  } catch {
    errors.push({ file, path: "", message: `fichier de pièce absent : attendu ${PIECE_FILE}` });
    return undefined;
  }

  const match = FRONTMATTER.exec(text);
  if (!match) {
    errors.push({ file, path: "", message: "attendu : un frontmatter YAML délimité par ---" });
    return undefined;
  }

  try {
    return parseYaml(match[1]!);
  } catch (cause) {
    errors.push({ file, path: "", message: `YAML illisible : ${(cause as Error).message}` });
    return undefined;
  }
}

async function listDir(path: string) {
  try {
    return await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
