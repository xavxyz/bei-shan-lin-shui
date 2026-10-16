import { pieceFieldsSchema, variationSchema, versionSchema, type z } from "@bsls/schema";
import { compact, describeIssues, type Outcome } from "./piece-file.js";

/**
 * Ce que le calligraphe décrit pour faire naître une pièce, une version ou une
 * variation : les champs du schéma partagé, sans ce qui s'alloue à l'écriture
 * — identifiants, statut initial, slug. Un brouillon se vérifie à l'entrée, et
 * une erreur nomme le champ du brouillon, pas celui du fichier.
 */

/** Une version à ouvrir : ses champs, sans variations ni identifiant. */
export const versionDraftSchema = versionSchema.pick({
  date: true,
  format: true,
  columns: true,
  intention: true,
});

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
  .pick({ title: true, source: true, translation: true, projects: true, pinyin_overrides: true })
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
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, draft: result.data };
  return { ok: false, message: describeIssues(result.error) };
}

/** Une version telle qu'elle s'écrit dans le frontmatter. */
export function versionEntry(
  id: string,
  version: z.output<typeof versionDraftSchema>,
  variations: Record<string, unknown>[] = [],
): Record<string, unknown> {
  return compact({
    id,
    date: isoDate(version.date),
    format: version.format,
    columns: version.columns.length > 0 ? version.columns : undefined,
    intention: version.intention,
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

/** `AAAA-MM-JJ`, la forme sous laquelle le calligraphe date ses versions. */
function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
