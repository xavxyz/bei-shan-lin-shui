import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { stringify } from "yaml";
import { PIECES_DIR, PROJECTS_DIR, pieceFile, pieceImageFile } from "@bsls/content";
import { RESERVED_PROJECT_ID, pieceFrontmatterSchema } from "@bsls/schema";
import { normalizeImage } from "./normalize-image.js";
import type { ArbitratedPlan, PlannedPiece, PlannedProject } from "./plan-file.js";

/** Une erreur d'application désigne le champ du plan à corriger. */
export type ApplyError = { path: string; message: string };

export type ApplyResult = { ok: true; written: string[] } | { ok: false; errors: ApplyError[] };

export type ApplyOptions = { contentRoot: string };

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

  const written: string[] = [];

  for (const project of plan.projects) {
    const file = `${PROJECTS_DIR}/${project.id}.yaml`;
    await write(join(options.contentRoot, file), stringify(toProjectFile(project)));
    written.push(file);
  }

  for (const piece of plan.pieces) {
    const file = pieceFile(piece.slug);
    await write(join(options.contentRoot, file), toMarkdown(piece));
    written.push(file);

    for (const variation of piece.variations) {
      for (const image of variation.images) {
        const target = pieceImageFile(piece.slug, image.file);
        await normalizeImage(image.source, join(options.contentRoot, target));
        written.push(target);
      }
    }
  }

  return { ok: true, written };
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
    if (await exists(join(root, `${PROJECTS_DIR}/${project.id}.yaml`))) {
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
      if (await exists(join(root, `${PROJECTS_DIR}/${id}.yaml`))) continue;
      errors.push({
        path: `pieces.${index}.projects.${projectIndex}`,
        message: `aucun projet ${id} dans le plan ni dans le contenu`,
      });
    }

    for (const [variationIndex, variation] of piece.variations.entries()) {
      for (const [imageIndex, image] of variation.images.entries()) {
        if (await exists(image.source)) continue;
        errors.push({
          path: `pieces.${index}.variations.${variationIndex}.images.${imageIndex}.source`,
          message: `fichier absent de l'export : ${image.source}`,
        });
      }
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
    versions: [
      {
        id: piece.version.id,
        date: piece.version.date,
        format: piece.version.format,
        ...(piece.version.columns.length > 0 ? { columns: piece.version.columns } : {}),
        ...(piece.version.intention ? { intention: piece.version.intention } : {}),
        ...(piece.variations.length > 0
          ? {
              variations: piece.variations.map((variation) => ({
                id: variation.id,
                script: variation.script,
                status: variation.status,
                ...(variation.personal_note ? { personal_note: variation.personal_note } : {}),
                ...(variation.images.length > 0
                  ? {
                      images: variation.images.map((image) => ({
                        file: image.file,
                        kind: image.kind,
                        capture: "scan",
                        featured: image.featured,
                      })),
                    }
                  : {}),
              })),
            }
          : {}),
      },
    ],
    ...(piece.translation ? { translation: piece.translation } : {}),
    published: piece.published,
  };
}

function toProjectFile(project: PlannedProject): Record<string, unknown> {
  return {
    title: project.title,
    presentation: project.presentation,
    theme: project.theme,
  };
}

function toMarkdown(piece: PlannedPiece): string {
  const frontmatter = stringify(toFrontmatter(piece), { lineWidth: 0, blockQuote: "literal" });
  return `---\n${frontmatter}---\n`;
}

async function write(path: string, contents: string): Promise<void> {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, contents, "utf8");
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}
