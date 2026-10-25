import { z } from "zod";
import { checkFormat } from "./format.js";
import { plural } from "./plural.js";
import {
  CAPTURE_MODES,
  IMAGE_KINDS,
  PIECE_STATUSES,
  SCRIPTS,
  VARIATION_STATUSES,
} from "./vocabulary.js";

export * from "./vocabulary.js";
export * from "./format.js";
export * from "./plural.js";
export { z };

/**
 * Segment d'URL réservé aux pièces sans projet : un projet ne peut pas le
 * prendre, sinon deux routes du site se marcheraient dessus.
 */
export const RESERVED_PROJECT_ID = "pieces";

export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "attendu : un slug en minuscules, mots séparés par des tirets",
  );

export const localIdSchema = z
  .string()
  .regex(/^v\d+[a-z]*$/, "attendu : un identifiant local de la forme v1 ou v1a");

export const versionIdSchema = localIdSchema.regex(
  /^v\d+$/,
  "attendu : un identifiant de version, par exemple v1",
);

/** Une variation se nomme d'après sa version : `v2a`, `v2b`… dans `v2`. */
export const variationIdSchema = localIdSchema.regex(
  /^v\d+[a-z]+$/,
  "attendu : un identifiant de variation, par exemple v1a",
);

/**
 * Un texte écrit à la main — glose, traduction, intention, présentation… : un
 * texte blanc n'y dirait rien, il est refusé. La valeur est gardée telle quelle.
 */
const prose = z.string().regex(/\S/, "attendu : un texte, ni vide ni fait seulement d'espaces");

/** `AAAA-MM-JJ`, la forme sous laquelle le calligraphe date ses versions. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
  id: localIdSchema,
  script: z.enum(SCRIPTS),
  status: z.enum(VARIATION_STATUSES),
  personal_note: prose.optional(),
  images: z.array(imageSchema).default([]),
});

/**
 * Le format d'une version qu'on écrit : une grille dans la notation, ou
 * `à préciser`. Le contenu en lecture tolère encore l'ancienne notation
 * (`versionSchema`), que `validate:content` signale sans casser le build.
 */
export const formatSchema = z
  .string()
  .min(1)
  .superRefine((format, ctx) => {
    const checked = checkFormat(format);
    if (!checked.ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message: checked.message });
  });

export const versionSchema = z.object({
  id: localIdSchema,
  date: z.coerce.date(),
  format: z.string().min(1),
  columns: z.array(z.string().min(1)).default([]),
  intention: prose.optional(),
  /**
   * Le français de la version, une ligne par colonne, 款 compris (voir GLOSSARY.md).
   * Sa longueur est celle de `columns` : `pieceFrontmatterSchema` le vérifie.
   */
  translation: z.array(prose).optional(),
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

/**
 * Les champs d'une pièce, sans la vérification des doublons : c'est la brique
 * dont dérivent le frontmatter, la pièce chargée et le plan d'import.
 */
export const pieceFieldsSchema = z.object({
  title: z.string().min(1),
  /** Courte phrase française qui dit de quoi parle la pièce (voir GLOSSARY.md). */
  gloss: prose.optional(),
  slug: slugSchema,
  projects: z.array(slugSchema).default([]),
  status: z.enum(PIECE_STATUSES),
  source: sourceSchema.optional(),
  versions: z.array(versionSchema).min(1, "attendu : au moins une version"),
  /** La traduction se fait par version : une `translation` de pièce est refusée. */
  translation: z
    .undefined({
      errorMap: () => ({
        message:
          "la traduction se fait par version : attendu versions[].translation, une ligne par colonne",
      }),
    })
    .optional(),
  pinyin_overrides: pinyinOverridesSchema.default({}),
  published: z.boolean().default(false),
});

/**
 * Les identifiants locaux ancrent les URL et les noms de fichiers d'images :
 * un doublon rendrait une variation inatteignable.
 */
export const pieceFrontmatterSchema = pieceFieldsSchema.superRefine((piece, ctx) => {
  reportDuplicates(
    piece.versions.map((version) => version.id),
    (index) => ["versions", index, "id"],
    ctx,
  );
  piece.versions.forEach((version, versionIndex) => {
    reportTranslationLength(version, versionIndex, ctx);
    reportDuplicates(
      version.variations.map((variation) => variation.id),
      (index) => ["versions", versionIndex, "variations", index, "id"],
      ctx,
    );
  });
});

/** Une traduction présente a exactement une ligne par colonne : jamais de tableau décalé. */
function reportTranslationLength(
  version: z.output<typeof versionSchema>,
  versionIndex: number,
  ctx: z.RefinementCtx,
): void {
  if (!version.translation) return;
  const expected = version.columns.length;
  if (version.translation.length === expected) return;
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["versions", versionIndex, "translation"],
    message: `attendu : une ligne de traduction par colonne, soit ${plural(expected, "colonne")} ; reçu ${plural(version.translation.length, "ligne")}`,
  });
}

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
  /** Courte phrase française qui dit de quoi parle le projet (voir GLOSSARY.md). */
  gloss: prose.optional(),
  /** Optionnelle : un projet peut attendre que le calligraphe l'écrive. */
  presentation: prose.optional(),
  /**
   * Les thèmes de couleur sont abandonnés (#70) : un projet qui en porte encore
   * un est refusé, plutôt que de voir le champ ignoré en silence.
   */
  theme: z.never({ message: "le thème de projet n'existe plus : retirez `theme`" }).optional(),
  /** Comme pour une pièce : indexées par le texte traditionnel exact, ici le titre. */
  pinyin_overrides: pinyinOverridesSchema.default({}),
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
  /** Année en tronc et branche et jieqi (`丙午立夏`), dérivés de la date, jamais stockés. */
  chineseDate: z.string(),
  /** La même date chinoise en simplifié (`丙午处暑`), telle que le site l'affiche. */
  chineseDateSimplified: z.string(),
  /**
   * Le format dit en français (`4 colonnes de 5 caractères`), dérivé de la
   * notation, jamais stocké. Une notation illisible n'a pas de libellé : elle
   * le dit, et le site montre la notation telle quelle.
   */
  formatLabel: z.discriminatedUnion("readable", [
    z.object({ readable: z.literal(true), text: z.string() }),
    z.object({ readable: z.literal(false) }),
  ]),
  columns: z.array(chineseTextSchema),
  variations: z.array(loadedVariationSchema),
  /** Une version a une image dès qu'une de ses variations en a une. */
  hasImage: z.boolean(),
});

export const loadedPieceSchema = pieceFieldsSchema.extend({
  title: chineseTextSchema,
  source: sourceSchema
    .extend({
      full_text: chineseTextSchema.optional(),
      /**
       * Auteur, œuvre puis dynastie, joints par « · », et leurs dérivations ;
       * absente si la source n'en nomme aucun.
       */
      attribution: chineseTextSchema.optional(),
    })
    .optional(),
  versions: z.array(loadedVersionSchema),
  /** Versions triées du plus ancien au plus récent : la dernière est l'intention courante. */
  latestVersion: loadedVersionSchema,
  featuredImage: loadedImageSchema.nullable(),
  /** Une pièce a une image dès qu'une de ses versions en a une. */
  hasImage: z.boolean(),
  /** Style d'écriture de cette variation, nommé en français. */
  featuredScriptLabel: z.string().nullable(),
  /** URL canonique de la pièce sur le site. */
  href: z.string(),
});

export const loadedProjectSchema = projectFileSchema.extend({
  title: chineseTextSchema,
  id: z.string(),
  href: z.string(),
  /** Slugs des pièces publiées rattachées à ce projet, dans l'ordre du disque. */
  pieceSlugs: z.array(z.string()),
});

export type ChineseText = z.infer<typeof chineseTextSchema>;
export type LoadedImage = z.infer<typeof loadedImageSchema>;
export type LoadedVariation = z.infer<typeof loadedVariationSchema>;
export type LoadedVersion = z.infer<typeof loadedVersionSchema>;
export type FormatLabel = LoadedVersion["formatLabel"];
export type LoadedPiece = z.infer<typeof loadedPieceSchema>;
export type LoadedProject = z.infer<typeof loadedProjectSchema>;
