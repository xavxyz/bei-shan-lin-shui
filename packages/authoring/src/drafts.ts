import {
  formatSchema,
  imageSchema,
  pieceFieldsSchema,
  toIsoDate,
  variationSchema,
  versionSchema,
  type z,
} from "@bsls/schema";
import { compact, describeIssues, type Outcome } from "./piece-file.js";

/**
 * Ce que le calligraphe décrit pour faire naître une pièce, une version ou une
 * variation : les champs du schéma partagé, sans ce qui s'alloue à l'écriture
 * — identifiants, statut initial, slug. Un brouillon se vérifie à l'entrée, et
 * une erreur nomme le champ du brouillon, pas celui du fichier.
 */

/**
 * Une version à ouvrir : ses champs, sans variations ni identifiant. Son format
 * est dans la notation, ou `à préciser` : l'ancienne notation ne s'écrit plus.
 */
export const versionDraftSchema = versionSchema
  .pick({ date: true, columns: true, intention: true })
  .extend({ format: formatSchema });

/** Une variation à ouvrir : ses champs, sans images ni identifiant. */
export const variationDraftSchema = variationSchema.pick({
  script: true,
  status: true,
  personal_note: true,
});

/** Une version qui arrive avec ses premières variations. */
export const versionWithVariationsDraftSchema = versionDraftSchema.extend({
  variations: variationDraftSchema.array().default([]),
});

/**
 * Une pièce à faire naître, avec sa version initiale. Sa publication est une
 * réponse du calligraphe, jamais un défaut : le brouillon qui la tait est refusé.
 */
export const pieceDraftSchema = pieceFieldsSchema
  .pick({ title: true, source: true, projects: true, pinyin_overrides: true })
  .extend({
    version: versionDraftSchema,
    published: pieceFieldsSchema.shape.published.removeDefault(),
  });

export type VersionDraft = z.input<typeof versionDraftSchema>;
export type VariationDraft = z.input<typeof variationDraftSchema>;
export type NewVersion = z.input<typeof versionWithVariationsDraftSchema>;
export type PieceDraft = z.input<typeof pieceDraftSchema>;

/** Le brouillon tel que le schéma le lit, ou la raison de son refus. */
export function readDraft<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): Outcome<{ draft: z.output<S> }> {
  const result = schema.safeParse(input, { errorMap: unansweredQuestion });
  if (result.success) return { ok: true, draft: result.data };
  return { ok: false, message: describeIssues(result.error) };
}

/**
 * Un champ booléen absent est une question restée sans réponse : on la repose
 * en français. Les autres erreurs gardent le message du schéma.
 */
const unansweredQuestion: z.ZodErrorMap = (issue, context) =>
  issue.code === "invalid_type" && issue.expected === "boolean" && issue.received === "undefined"
    ? { message: "réponse attendue, oui ou non (true / false)" }
    : { message: context.defaultError };

/**
 * Une version telle qu'elle s'écrit dans le frontmatter. Sa date est déjà
 * écrite `AAAA-MM-JJ` quand elle vient d'un plan d'import.
 */
export function versionEntry(
  id: string,
  version: Omit<z.output<typeof versionDraftSchema>, "date"> & {
    date: Date | string;
    translation?: string[];
  },
  variations: Record<string, unknown>[] = [],
): Record<string, unknown> {
  return compact({
    id,
    date: typeof version.date === "string" ? version.date : toIsoDate(version.date),
    format: version.format,
    columns: version.columns.length > 0 ? version.columns : undefined,
    intention: version.intention,
    translation: version.translation,
    variations: variations.length > 0 ? variations : undefined,
  });
}

/** Une variation telle qu'elle s'écrit dans le frontmatter. */
export function variationEntry(
  id: string,
  variation: z.output<typeof variationDraftSchema>,
  images: Record<string, unknown>[] = [],
): Record<string, unknown> {
  return compact({
    id,
    script: variation.script,
    status: variation.status,
    personal_note: variation.personal_note,
    images: images.length > 0 ? images : undefined,
  });
}

/** Une image telle qu'elle s'écrit dans le frontmatter : mise en avant seulement sur demande. */
export function imageEntry(image: z.input<typeof imageSchema>): Record<string, unknown> {
  return compact({
    file: image.file,
    kind: image.kind,
    capture: image.capture,
    featured: image.featured ? true : undefined,
    caption: image.caption,
  });
}
