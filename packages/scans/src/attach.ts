import { isDeepStrictEqual } from "node:util";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { parseDocument, type YAMLMap } from "yaml";
import {
  appendToList,
  imageEntry,
  isVariationOf,
  prepareEdit,
  variationDraftSchema,
  variationEntry,
  versionDraftSchema,
  versionEntry,
  versionNode,
  variationNode,
  writePiece,
  type PieceText,
  type Refusal,
} from "@bsls/authoring/editing";
import { IMAGES_DIR, PIECES_DIR, pieceFile, pieceImageFile } from "@bsls/content";
import {
  imageSchema,
  slugSchema,
  variationIdSchema,
  versionIdSchema,
  z,
  type PieceFrontmatter,
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

/** Où insérer dans le frontmatter, et quoi : une image, une variation ou une version entière. */
type Insertion = {
  added: "image" | "variation" | "version";
  path: (string | number)[];
  parent: YAMLMap | undefined;
  item: unknown;
};

async function planInsertion(attachment: ParsedAttachment, root: string): Promise<Planned> {
  /* L'insertion sert à ramener une objection du schéma au champ du rattachement. */
  let inserted: Insertion | undefined;

  const prepared = await prepareEdit(root, attachment.piece, async (text, piece, map) => {
    const imageFile = await freeImageName(
      variationIdOf(attachment.variation),
      attachment.piece,
      piece,
      root,
    );
    const insertion = insertionFor(
      attachment,
      piece,
      map,
      imageEntry({ ...attachment.image, file: imageFile, capture: "scan" }),
    );
    if ("ok" in insertion) return insertion;
    inserted = insertion;
    const { path } = insertion;

    const edit = insertion.parent
      ? appendToList(text, insertion.parent, path.at(-1) as string, [insertion.item])
      : { ok: false as const, message: "nœud introuvable dans le frontmatter" };
    if (!edit.ok) return { ...edit, message: `${pieceFile(attachment.piece)} : ${edit.message}` };

    /* La pièce résultante ne doit différer que de l'ajout. */
    const expected = parseDocument(text).toJS() as Record<string, unknown>;
    appendIn(expected, path, insertion.item);
    if (!isDeepStrictEqual(parseDocument(edit.text).toJS(), expected)) {
      throw new Error(`rattachement : l'insertion dans ${pieceFile(attachment.piece)} a dérivé`);
    }
    return { edit, result: { imageFile } };
  });

  if (prepared.ok) return { ok: true, piece: prepared.piece, imageFile: prepared.result.imageFile };
  if (prepared.issues && inserted) {
    const insertion = inserted;
    return { ok: false, errors: prepared.issues.map((issue) => locate(issue, insertion)) };
  }
  return failure(prepared.path ?? "piece", prepared.message);
}

function insertionFor(
  attachment: ParsedAttachment,
  piece: PieceFrontmatter,
  map: YAMLMap,
  image: Record<string, unknown>,
): Insertion | Refusal {
  const { versions } = piece;

  if (typeof attachment.version === "string") {
    const versionId = attachment.version;
    const versionIndex = versions.findIndex((version) => version.id === versionId);
    if (versionIndex < 0) {
      return refusal("version", `aucune version ${versionId} dans ${attachment.piece}`);
    }
    const variations = versions[versionIndex]!.variations;

    if (typeof attachment.variation === "string") {
      const variationId = attachment.variation;
      const variationIndex = variations.findIndex((variation) => variation.id === variationId);
      if (variationIndex < 0) {
        return refusal("variation", `aucune variation ${variationId} dans la version ${versionId}`);
      }
      return {
        added: "image",
        path: ["versions", versionIndex, "variations", variationIndex, "images"],
        parent: variationNode(map, variationId),
        item: image,
      };
    }
    const error = checkNewVariation(attachment.variation.id, versionId, variations);
    if (error) return refusal("variation.id", error);
    return {
      added: "variation",
      path: ["versions", versionIndex, "variations"],
      parent: versionNode(map, versionId),
      item: variationEntry(attachment.variation.id, attachment.variation, [image]),
    };
  }

  const version = attachment.version;
  if (versions.some((existing) => existing.id === version.id)) {
    return refusal("version.id", `la version ${version.id} existe déjà : choisir un id libre`);
  }
  if (typeof attachment.variation === "string") {
    return refusal(
      "variation",
      "une nouvelle version n'a encore aucune variation : en décrire une",
    );
  }
  const error = checkNewVariation(attachment.variation.id, version.id, []);
  if (error) return refusal("variation.id", error);
  return {
    added: "version",
    path: ["versions"],
    parent: map,
    item: versionEntry(version.id, version, [
      variationEntry(attachment.variation.id, attachment.variation, [image]),
    ]),
  };
}

function checkNewVariation(
  id: string,
  versionId: string,
  variations: { id: string }[],
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
  piece: PieceFrontmatter,
  root: string,
): Promise<string> {
  const taken = new Set<string>(
    await readdir(join(root, PIECES_DIR, slug, IMAGES_DIR)).catch(() => [] as string[]),
  );
  for (const version of piece.versions) {
    for (const variation of version.variations) {
      for (const image of variation.images) taken.add(image.file);
    }
  }
  for (let rank = 1; ; rank++) {
    const name =
      rank === 1 ? `${variationId}.jpg` : `${variationId}-${String(rank).padStart(2, "0")}.jpg`;
    if (!taken.has(name)) return name;
  }
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

function refusal(path: string, message: string): Refusal {
  return { ok: false, path, message };
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
function locate(issue: z.ZodIssue, { added, path }: Insertion): AttachError {
  const within = issue.path
    .slice(0, path.length)
    .every((segment, index) => segment === path[index]);
  if (!within) return { path: `piece.${issue.path.join(".")}`, message: issue.message };
  /* Sous la liste visée : l'indice de l'élément ajouté, puis le champ fautif. */
  const field = [added, ...issue.path.slice(path.length + 1)];
  return { path: nested(field).join("."), message: issue.message };
}

/** `version.variations.0.images.0.kind` se dit `image.kind` : chaque nœud ajouté n'en porte qu'un. */
function nested(field: (string | number)[]): (string | number)[] {
  const [head, key, , ...rest] = field;
  if (head === "version" && key === "variations") return nested(["variation", ...rest]);
  if (head === "variation" && key === "images") return ["image", ...rest];
  return field;
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
