import { isDeepStrictEqual } from "node:util";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseDocument, type YAMLMap } from "yaml";
import {
  appendToList,
  checkPiece,
  isVariationOf,
  readPiece,
  rootMap,
  variationDraftSchema,
  variationEntry,
  versionDraftSchema,
  versionEntry,
  versionNode,
  variationNode,
  writePiece,
  type PieceText,
} from "@bsls/authoring/editing";
import { IMAGES_DIR, PIECES_DIR, pieceFile, pieceImageFile } from "@bsls/content";
import {
  imageSchema,
  pieceFrontmatterSchema,
  slugSchema,
  variationIdSchema,
  versionIdSchema,
  z,
} from "@bsls/schema";
import { normalizeImage } from "./normalize-image.js";

/* -------------------------------------------------------------------------- */
/* Le rattachement                                                             */
/* -------------------------------------------------------------------------- */

/** Une version à ouvrir : ses champs, sans variations — le rattachement apporte la première. */
export const newVersionSchema = versionDraftSchema.extend({ id: versionIdSchema });

/** Une variation à ouvrir : ses champs, sans images — le rattachement apporte la première. */
export const newVariationSchema = variationDraftSchema.extend({ id: variationIdSchema });

/** Le scan à rattacher : son nom de fichier se dérive de la variation, il ne se choisit pas. */
export const attachedImageSchema = imageSchema
  .pick({ kind: true, featured: true, caption: true })
  .extend({ source: z.string().min(1) });

/**
 * Un rattachement : quel scan, à quelle pièce, dans quelle version et quelle
 * variation. Une version ou une variation existante se désigne par son id ;
 * une nouvelle s'écrit avec ses champs.
 */
export type Attachment = {
  piece: string;
  version: string | z.input<typeof newVersionSchema>;
  variation: string | z.input<typeof newVariationSchema>;
  image: z.input<typeof attachedImageSchema>;
};

type ParsedAttachment = {
  piece: string;
  version: string | z.output<typeof newVersionSchema>;
  variation: string | z.output<typeof newVariationSchema>;
  image: z.output<typeof attachedImageSchema>;
};

/** Une erreur désigne le champ du rattachement à corriger. */
export type AttachError = { path: string; message: string };

export type AttachResult = { ok: true; written: string[] } | { ok: false; errors: AttachError[] };

export type AttachOptions = { contentRoot: string };

/**
 * Rattache un scan arbitré à une pièce du contenu : ajoute une image, une
 * variation ou une version, sans jamais modifier ni retirer ce qui existe.
 *
 * Tout est vérifié avant d'écrire — la pièce, les ids, la lisibilité du scan,
 * la validité de la pièce résultante — et l'écriture passe par la couture
 * d'édition d'`@bsls/authoring` : elle ne fait qu'insérer du texte dans le
 * frontmatter ; commentaires, mise en forme et corps Markdown restent tels que
 * le calligraphe les a laissés.
 */
export async function attachScan(input: unknown, options: AttachOptions): Promise<AttachResult> {
  const parsed = parseAttachment(input);
  if (!parsed.ok) return parsed;
  const attachment = parsed.attachment;
  const root = options.contentRoot;

  const planned = await planInsertion(attachment, root);
  if (!planned.ok) return planned;

  const staging = join(root, STAGING_DIR);
  try {
    const staged = join(staging, planned.imageFile);
    try {
      await normalizeImage(attachment.image.source, staged);
    } catch (cause) {
      return failure(
        "image.source",
        `scan illisible comme image : ${attachment.image.source} (${describe(cause)})`,
      );
    }

    const image = pieceImageFile(attachment.piece, planned.imageFile);
    const target = join(root, image);
    /* Le nom est libre à la vérification ; il doit l'être encore au moment d'écrire. */
    if (await exists(target)) {
      return failure("image", `une image ${planned.imageFile} existe déjà : rien n'est remplacé`);
    }
    await mkdir(dirname(target), { recursive: true });
    await rename(staged, target);

    await writePiece(planned.piece);

    return { ok: true, written: [image, pieceFile(attachment.piece)] };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

/** Dossier de transit, dans le contenu pour que le déplacement ne franchisse aucun volume. */
const STAGING_DIR = ".rattachement-en-cours";

function parseAttachment(
  input: unknown,
): { ok: true; attachment: ParsedAttachment } | { ok: false; errors: AttachError[] } {
  const shape = z
    .object({
      piece: slugSchema,
      version: z.unknown(),
      variation: z.unknown(),
      image: attachedImageSchema,
    })
    .safeParse(input);
  const errors: AttachError[] = shape.success ? [] : issues(shape.error);

  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  /* Un id désigne l'existant, un objet décrit le nouveau : le message suit l'intention. */
  const version = (typeof raw.version === "string" ? versionIdSchema : newVersionSchema).safeParse(
    raw.version,
  );
  if (!version.success) errors.push(...issues(version.error, "version"));
  const variation = (
    typeof raw.variation === "string" ? variationIdSchema : newVariationSchema
  ).safeParse(raw.variation);
  if (!variation.success) errors.push(...issues(variation.error, "variation"));

  if (errors.length > 0 || !shape.success || !version.success || !variation.success) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    attachment: { ...shape.data, version: version.data, variation: variation.data },
  };
}

/* -------------------------------------------------------------------------- */
/* Vérifier et préparer, sans rien écrire                                      */
/* -------------------------------------------------------------------------- */

type Planned =
  { ok: true; piece: PieceText; imageFile: string } | { ok: false; errors: AttachError[] };

type RawVariation = { id?: unknown; images?: { file?: unknown }[] };
type RawVersion = { id?: unknown; variations?: RawVariation[] };
type RawPiece = { versions?: RawVersion[] };

async function planInsertion(attachment: ParsedAttachment, root: string): Promise<Planned> {
  const read = await readPiece(root, attachment.piece);
  if (!read.ok) return failure("piece", read.message);
  const { frontmatter } = read.piece;

  const document = parseDocument(frontmatter);
  const map = rootMap(document);
  if (!map || !checkPiece(frontmatter).ok) {
    return failure(
      "piece",
      `la pièce ${attachment.piece} est invalide : la corriger d'abord (pnpm validate:content)`,
    );
  }
  const current = document.toJS() as RawPiece;
  const versions = current.versions!;

  const imageFile = await freeImageName(
    variationIdOf(attachment.variation),
    attachment.piece,
    current,
    root,
  );
  const image = toImage(attachment.image, imageFile);

  /* Où insérer, et quoi : une image, une variation ou une version entière. */
  let path: (string | number)[];
  let parent: YAMLMap | undefined;
  let item: Record<string, unknown>;

  if (typeof attachment.version === "string") {
    const versionId = attachment.version;
    const versionIndex = versions.findIndex((version) => version.id === versionId);
    if (versionIndex < 0)
      return failure("version", `aucune version ${versionId} dans ${attachment.piece}`);
    const variations = versions[versionIndex]!.variations ?? [];

    if (typeof attachment.variation === "string") {
      const variationId = attachment.variation;
      const variationIndex = variations.findIndex((variation) => variation.id === variationId);
      if (variationIndex < 0) {
        return failure("variation", `aucune variation ${variationId} dans la version ${versionId}`);
      }
      path = ["versions", versionIndex, "variations", variationIndex, "images"];
      parent = variationNode(map, variationId);
      item = image;
    } else {
      const error = checkNewVariation(attachment.variation.id, versionId, variations);
      if (error) return failure("variation.id", error);
      path = ["versions", versionIndex, "variations"];
      parent = versionNode(map, versionId);
      item = variationEntry(attachment.variation.id, attachment.variation, [image]);
    }
  } else {
    const version = attachment.version;
    if (versions.some((existing) => existing.id === version.id)) {
      return failure("version.id", `la version ${version.id} existe déjà : choisir un id libre`);
    }
    if (typeof attachment.variation === "string") {
      return failure(
        "variation",
        "une nouvelle version n'a encore aucune variation : en décrire une",
      );
    }
    const error = checkNewVariation(attachment.variation.id, version.id, []);
    if (error) return failure("variation.id", error);
    path = ["versions"];
    parent = map;
    item = versionEntry(version.id, version, [
      variationEntry(attachment.variation.id, attachment.variation, [image]),
    ]);
  }

  const edit = parent
    ? appendToList(frontmatter, parent, path.at(-1) as string, [item])
    : { ok: false as const, message: "nœud introuvable dans le frontmatter" };
  if (!edit.ok) return failure("piece", `${pieceFile(attachment.piece)} : ${edit.message}`);

  /* La pièce résultante doit passer la validation, et ne différer que de l'ajout. */
  const reparsed = parseDocument(edit.text).toJS() as unknown;
  const result = pieceFrontmatterSchema.safeParse(reparsed);
  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => locate(issue, path)) };
  }
  const expected = structuredClone(current) as Record<string, unknown>;
  appendIn(expected, path, item);
  if (!isDeepStrictEqual(reparsed, expected)) {
    throw new Error(`rattachement : l'insertion dans ${pieceFile(attachment.piece)} a dérivé`);
  }

  return { ok: true, piece: { ...read.piece, frontmatter: edit.text }, imageFile };
}

function checkNewVariation(
  id: string,
  versionId: string,
  variations: RawVariation[],
): string | undefined {
  if (!isVariationOf(id, versionId)) {
    return `une variation de ${versionId} se nomme ${versionId}a, ${versionId}b… : ${id} n'en est pas une`;
  }
  if (variations.some((variation) => variation.id === id)) {
    return `la variation ${id} existe déjà : choisir un id libre`;
  }
  return undefined;
}

function variationIdOf(variation: ParsedAttachment["variation"]): string {
  return typeof variation === "string" ? variation : variation.id;
}

/**
 * Le nom d'une image dérive de sa variation : `v2a.jpg`, puis `v2a-02.jpg`…
 * Il évite tout fichier déjà sur le disque comme tout nom déjà cité par la pièce.
 */
async function freeImageName(
  variationId: string,
  slug: string,
  piece: RawPiece,
  root: string,
): Promise<string> {
  const taken = new Set<string>(
    await readdir(join(root, PIECES_DIR, slug, IMAGES_DIR)).catch(() => [] as string[]),
  );
  for (const version of piece.versions ?? []) {
    for (const variation of version.variations ?? []) {
      for (const image of variation.images ?? []) {
        if (typeof image.file === "string") taken.add(image.file);
      }
    }
  }
  for (let rank = 1; ; rank++) {
    const name =
      rank === 1 ? `${variationId}.jpg` : `${variationId}-${String(rank).padStart(2, "0")}.jpg`;
    if (!taken.has(name)) return name;
  }
}

/** Un scan entre toujours comme un scan ; il n'est mis en avant que sur demande. */
function toImage(image: ParsedAttachment["image"], file: string): Record<string, unknown> {
  return {
    file,
    kind: image.kind,
    capture: "scan",
    ...(image.featured ? { featured: true } : {}),
    ...(image.caption ? { caption: image.caption } : {}),
  };
}

function appendIn(target: Record<string, unknown>, path: (string | number)[], item: unknown): void {
  let node: unknown = target;
  for (const segment of path.slice(0, -1))
    node = (node as Record<string | number, unknown>)[segment];
  const parent = node as Record<string, unknown>;
  const key = path.at(-1) as string;
  parent[key] = [...((parent[key] as unknown[] | undefined) ?? []), item];
}

/* -------------------------------------------------------------------------- */
/* Erreurs                                                                     */
/* -------------------------------------------------------------------------- */

function failure(path: string, message: string): { ok: false; errors: AttachError[] } {
  return { ok: false, errors: [{ path, message }] };
}

function issues(error: z.ZodError, prefix?: string): AttachError[] {
  return error.issues.map((issue) => ({
    path: [prefix, ...issue.path].filter((segment) => segment !== undefined).join("."),
    message: issue.message,
  }));
}

/**
 * Ramène une erreur de la pièce résultante au champ du rattachement qui l'a
 * provoquée : l'image, la variation ou la version ajoutée.
 */
function locate(issue: z.ZodIssue, path: (string | number)[]): AttachError {
  const depth = path.length + 1;
  const within = issue.path
    .slice(0, path.length)
    .every((segment, index) => segment === path[index]);
  if (!within) return { path: `piece.${issue.path.join(".")}`, message: issue.message };
  const rest = issue.path.slice(depth);
  const field =
    path.length === 1
      ? locateInVersion(rest)
      : path.length === 3
        ? locateInVariation(rest)
        : ["image", ...rest];
  return { path: field.join("."), message: issue.message };
}

function locateInVersion(rest: (string | number)[]): (string | number)[] {
  if (rest[0] === "variations") return locateInVariation(rest.slice(2));
  return ["version", ...rest];
}

function locateInVariation(rest: (string | number)[]): (string | number)[] {
  if (rest[0] === "images") return ["image", ...rest.slice(2)];
  return ["variation", ...rest];
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

async function exists(path: string): Promise<boolean> {
  return stat(path).then(
    () => true,
    () => false,
  );
}
