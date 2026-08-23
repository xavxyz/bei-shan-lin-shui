import { z } from "zod";
import {
  CAPTURE_MODES,
  IMAGE_KINDS,
  PIECE_STATUSES,
  SCRIPTS,
  THEMES,
  VARIATION_STATUSES,
} from "./vocabulary.js";

export * from "./vocabulary.js";
export { z };

/**
 * Segment d'URL réservé aux pièces sans projet : un projet ne peut pas le
 * prendre, sinon deux routes du site se marcheraient dessus.
 */
export const RESERVED_PROJECT_ID = "pieces";

const slug = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "attendu : un slug en minuscules, mots séparés par des tirets",
  );

const localId = z
  .string()
  .regex(/^v\d+[a-z]*$/, "attendu : un identifiant local de la forme v1 ou v1a");

const prose = z.string().min(1);

/* -------------------------------------------------------------------------- */
/* Schéma des fichiers déposés sur le disque                                   */
/* -------------------------------------------------------------------------- */

export const imageSchema = z.object({
  file: z.string().min(1),
  kind: z.enum(IMAGE_KINDS),
  capture: z.enum(CAPTURE_MODES),
  featured: z.boolean().default(false),
  caption: prose.optional(),
});

export const variationSchema = z.object({
  id: localId,
  script: z.enum(SCRIPTS),
  status: z.enum(VARIATION_STATUSES),
  personal_note: prose.optional(),
  images: z.array(imageSchema).default([]),
});

export const versionSchema = z.object({
  id: localId,
  date: z.coerce.date(),
  format: z.string().min(1),
  columns: z.array(z.string().min(1)).default([]),
  intention: prose.optional(),
  variations: z.array(variationSchema).default([]),
});

export const sourceSchema = z.object({
  author: z.string().min(1).optional(),
  work: z.string().min(1).optional(),
  dynasty: z.string().min(1).optional(),
  full_text: prose.optional(),
});

/**
 * Surcharges de pinyin : le texte traditionnel exact (titre, colonne, texte
 * intégral) comme clé, le pinyin corrigé comme valeur. C'est le recours pour
 * les 多音字, dont la génération automatique se trompe.
 */
export const pinyinOverridesSchema = z.record(z.string().min(1), z.string().min(1));

const pieceFields = z.object({
  title: z.string().min(1),
  slug,
  projects: z.array(slug).default([]),
  status: z.enum(PIECE_STATUSES),
  source: sourceSchema.optional(),
  versions: z.array(versionSchema).min(1, "attendu : au moins une version"),
  translation: prose.optional(),
  pinyin_overrides: pinyinOverridesSchema.default({}),
  published: z.boolean().default(false),
});

/**
 * Les identifiants locaux ancrent les URL et les noms de fichiers d'images :
 * un doublon rendrait une variation inatteignable.
 */
export const pieceFrontmatterSchema = pieceFields.superRefine((piece, ctx) => {
  reportDuplicates(
    piece.versions.map((version) => version.id),
    (index) => ["versions", index, "id"],
    ctx,
  );
  piece.versions.forEach((version, versionIndex) => {
    reportDuplicates(
      version.variations.map((variation) => variation.id),
      (index) => ["versions", versionIndex, "variations", index, "id"],
      ctx,
    );
  });
});

function reportDuplicates(
  ids: string[],
  pathOf: (index: number) => (string | number)[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  ids.forEach((id, index) => {
    if (seen.has(id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: pathOf(index),
        message: `identifiant déjà utilisé : ${id}`,
      });
    }
    seen.add(id);
  });
}

export const projectFileSchema = z.object({
  title: z.string().min(1),
  presentation: prose,
  theme: z.enum(THEMES),
});

export type PieceFrontmatter = z.infer<typeof pieceFrontmatterSchema>;
export type ProjectFile = z.infer<typeof projectFileSchema>;

/* -------------------------------------------------------------------------- */
/* Schéma du contenu chargé, dérivations comprises                             */
/* -------------------------------------------------------------------------- */

/** Un texte chinois et ses dérivations. Le traditionnel est la source de vérité. */
export const chineseTextSchema = z.object({
  traditional: z.string(),
  simplified: z.string(),
  pinyin: z.string(),
});

export const loadedImageSchema = imageSchema.extend({
  /** URL servie par le site, dérivée du slug de la pièce et du nom de fichier. */
  src: z.string(),
});

export const loadedVariationSchema = variationSchema.extend({
  images: z.array(loadedImageSchema),
  scriptLabel: z.string(),
  /** Image à montrer en premier pour cette variation, si elle en a une. */
  featuredImage: loadedImageSchema.nullable(),
});

export const loadedVersionSchema = versionSchema.extend({
  /** Date au format `YYYY-MM-DD`, sérialisable. */
  date: z.string(),
  columns: z.array(chineseTextSchema),
  variations: z.array(loadedVariationSchema),
});

export const loadedPieceSchema = pieceFields.extend({
  title: chineseTextSchema,
  source: sourceSchema.extend({ full_text: chineseTextSchema.optional() }).optional(),
  versions: z.array(loadedVersionSchema),
  /** Versions triées du plus ancien au plus récent : la dernière est l'intention courante. */
  latestVersion: loadedVersionSchema,
  featuredImage: loadedImageSchema.nullable(),
  /**
   * Images à montrer en tête de la page de pièce : celles de la variation qui
   * porte l'image mise en avant, cette dernière en premier.
   */
  gallery: z.array(loadedImageSchema),
  /** Style d'écriture de cette variation, nommé en français. */
  featuredScriptLabel: z.string().nullable(),
  /** URL canonique de la pièce sur le site. */
  href: z.string(),
});

export const loadedProjectSchema = projectFileSchema.extend({
  id: z.string(),
  href: z.string(),
  /** Slugs des pièces publiées rattachées à ce projet, dans l'ordre du disque. */
  pieceSlugs: z.array(z.string()),
});

export type ChineseText = z.infer<typeof chineseTextSchema>;
export type LoadedImage = z.infer<typeof loadedImageSchema>;
export type LoadedVariation = z.infer<typeof loadedVariationSchema>;
export type LoadedVersion = z.infer<typeof loadedVersionSchema>;
export type LoadedPiece = z.infer<typeof loadedPieceSchema>;
export type LoadedProject = z.infer<typeof loadedProjectSchema>;
