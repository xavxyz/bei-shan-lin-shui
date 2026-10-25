import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import {
  commentsUnder,
  imageEntry,
  toYaml,
  variationEntry,
  versionEntry,
  type NodeComment,
  type NodePath,
} from "@bsls/authoring/editing";
import { PIECES_DIR, pieceFile, pieceImageFile, projectFile } from "@bsls/content";
import { RESERVED_PROJECT_ID, pieceFrontmatterSchema } from "@bsls/schema";
import { normalizeImage } from "@bsls/scans";
import type { ArbitratedPlan, PlannedPiece, PlannedProject } from "./plan-file.js";

/** Une erreur d'application désigne le champ du plan à corriger. */
export type ApplyError = { path: string; message: string };

export type ApplyResult = { ok: true; written: string[] } | { ok: false; errors: ApplyError[] };

export type ApplyOptions = {
  contentRoot: string;
  /** Les commentaires du texte du plan, quand il en a un : ils suivent leur pièce. */
  comments?: NodeComment[];
};

/**
 * Applique un plan arbitré : écrit les pièces, les projets et les images.
 *
 * Exécuteur trivial par construction — tout le jugement a eu lieu dans la
 * proposition et dans la relecture du calligraphe. Le plan est vérifié en
 * entier avant que quoi que ce soit ne touche le disque : un import à moitié
 * écrit serait pire qu'un import refusé.
 */
export async function applyImport(
  plan: ArbitratedPlan,
  options: ApplyOptions,
): Promise<ApplyResult> {
  const errors = await checkPlan(plan, options.contentRoot);
  if (errors.length > 0) return { ok: false, errors };

  const staging = join(options.contentRoot, STAGING_DIR);

  try {
    /* Normaliser une image est la seule étape qui puisse encore échouer : on la
       fait entièrement à l'écart, et le contenu n'est touché qu'ensuite. */
    const staged = await stageImages(plan, staging);
    if (!staged.ok) return staged;

    const written: string[] = [];

    const commentsOf = (entry: NodePath) => entryComments(options.comments ?? [], entry);

    for (const [index, project] of plan.projects.entries()) {
      const file = projectFile(project.id);
      const text = toYaml(toProjectFile(project), { comments: commentsOf(["projects", index]) });
      await write(join(options.contentRoot, file), text);
      written.push(file);
    }

    for (const [index, piece] of plan.pieces.entries()) {
      const file = pieceFile(piece.slug);
      const frontmatter = toYaml(toFrontmatter(piece), { comments: commentsOf(["pieces", index]) });
      await write(join(options.contentRoot, file), `---\n${frontmatter}---\n`);
      written.push(file);
    }

    for (const image of staged.images) {
      await moveInto(image.staged, join(options.contentRoot, image.target));
      written.push(image.target);
    }

    return { ok: true, written };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/** Dossier de transit, effacé quoi qu'il arrive : jamais un reste dans le contenu. */
const STAGING_DIR = ".import-en-cours";

type StagedImage = { target: string; staged: string };

type StageResult = { ok: true; images: StagedImage[] } | { ok: false; errors: ApplyError[] };

async function stageImages(plan: ArbitratedPlan, staging: string): Promise<StageResult> {
  const images: StagedImage[] = [];
  const errors: ApplyError[] = [];

  for (const { piece, path, image } of plannedImages(plan)) {
    const staged = join(staging, piece.slug, image.file);
    try {
      await normalizeImage(image.source, staged);
      images.push({ target: pieceImageFile(piece.slug, image.file), staged });
    } catch (cause) {
      errors.push({
        path: `${path}.source`,
        message: `image impossible à normaliser : ${image.source} (${describe(cause)})`,
      });
    }
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, images };
}

type PlannedImage = PlannedPiece["versions"][number]["variations"][number]["images"][number];

/** Chaque image du plan, avec sa pièce et son chemin dans le plan. */
function* plannedImages(
  plan: ArbitratedPlan,
): Generator<{ piece: PlannedPiece; path: string; image: PlannedImage }> {
  for (const [index, piece] of plan.pieces.entries()) {
    for (const [versionIndex, version] of piece.versions.entries()) {
      for (const [variationIndex, variation] of version.variations.entries()) {
        for (const [imageIndex, image] of variation.images.entries()) {
          const path = `pieces.${index}.versions.${versionIndex}.variations.${variationIndex}.images.${imageIndex}`;
          yield { piece, path, image };
        }
      }
    }
  }
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/* -------------------------------------------------------------------------- */
/* Vérifications préalables                                                    */
/* -------------------------------------------------------------------------- */

async function checkPlan(plan: ArbitratedPlan, root: string): Promise<ApplyError[]> {
  const errors: ApplyError[] = [];
  const projectIds = new Set(plan.projects.map((project) => project.id));

  for (const [index, project] of plan.projects.entries()) {
    if (project.presentation.trim() === "") {
      errors.push({
        path: `projects.${index}.presentation`,
        message: "à écrire avant l'import : un projet se présente",
      });
    }
    if (project.id === RESERVED_PROJECT_ID) {
      errors.push({
        path: `projects.${index}.id`,
        message: `identifiant réservé aux pièces sans projet : ${RESERVED_PROJECT_ID}`,
      });
    }
    if (await exists(join(root, projectFile(project.id)))) {
      errors.push({
        path: `projects.${index}.id`,
        message: `un projet ${project.id} existe déjà : l'import n'écrase rien`,
      });
    }
  }

  const seen = new Set<string>();

  for (const [index, piece] of plan.pieces.entries()) {
    if (seen.has(piece.slug)) {
      errors.push({
        path: `pieces.${index}.slug`,
        message: `slug déjà pris par une autre pièce du plan : ${piece.slug}`,
      });
    }
    seen.add(piece.slug);

    if (await exists(join(root, `${PIECES_DIR}/${piece.slug}`))) {
      errors.push({
        path: `pieces.${index}.slug`,
        message: `une pièce ${piece.slug} existe déjà : l'import n'écrase rien`,
      });
    }

    for (const [projectIndex, id] of piece.projects.entries()) {
      if (projectIds.has(id)) continue;
      if (await exists(join(root, projectFile(id)))) continue;
      errors.push({
        path: `pieces.${index}.projects.${projectIndex}`,
        message: `aucun projet ${id} dans le plan ni dans le contenu`,
      });
    }

    /* Le contenu écrit doit passer la validation ; autant s'en assurer avant d'écrire. */
    const parsed = pieceFrontmatterSchema.safeParse(toFrontmatter(piece));
    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map((issue) => ({
          path: `pieces.${index}.${issue.path.join(".")}`,
          message: issue.message,
        })),
      );
    }
  }

  for (const { path: imagePath, image } of plannedImages(plan)) {
    const path = `${imagePath}.source`;
    if (!(await exists(image.source))) {
      errors.push({ path, message: `fichier absent de l'export : ${image.source}` });
      continue;
    }
    /* Une extension ne fait pas une image lisible : le HEIC, par exemple,
       n'est décodé que par un sharp compilé pour lui. Mieux vaut le savoir
       avant d'écrire que devant une pièce à moitié importée. */
    if (!(await isReadableImage(image.source))) {
      errors.push({
        path,
        message: `image illisible, format non pris en charge : ${image.source}`,
      });
    }
  }

  return errors;
}

/* -------------------------------------------------------------------------- */
/* Écriture                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Ne retient du plan que ce que le schéma connaît : le contexte Notion — URL,
 * état d'origine, pages liées — s'arrête ici et n'entre pas dans le contenu.
 */
function toFrontmatter(piece: PlannedPiece): Record<string, unknown> {
  return {
    title: piece.title,
    slug: piece.slug,
    ...(piece.projects.length > 0 ? { projects: piece.projects } : {}),
    status: piece.status,
    ...(piece.source ? { source: piece.source } : {}),
    /* Les versions telles que le plan les porte, dans son ordre : rien n'est réorganisé. */
    versions: piece.versions.map((version) =>
      versionEntry(
        version.id,
        version,
        version.variations.map((variation) =>
          variationEntry(
            variation.id,
            variation,
            variation.images.map((image) => imageEntry(image)),
          ),
        ),
      ),
    ),
    ...(piece.translation ? { translation: piece.translation } : {}),
    published: piece.published,
  };
}

function toProjectFile(project: PlannedProject): Record<string, unknown> {
  return {
    title: project.title,
    presentation: project.presentation,
  };
}

/**
 * Les commentaires que le plan posait sur une entrée, à reporter aux mêmes
 * endroits du fichier écrit. Le contexte Notion reste au plan, ses
 * commentaires avec lui.
 */
function entryComments(comments: NodeComment[], entry: NodePath): NodeComment[] {
  return commentsUnder(comments, entry).filter((comment) => comment.path[0] !== NOTION_KEY);
}

const NOTION_KEY = "notion";

async function write(path: string, contents: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents, "utf8");
}

/** Le transit se fait dans le contenu même : le déplacement ne franchit aucun volume. */
async function moveInto(staged: string, path: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await rename(staged, path);
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}

async function isReadableImage(path: string): Promise<boolean> {
  return sharp(path)
    .metadata()
    .then(
      () => true,
      () => false,
    );
}
