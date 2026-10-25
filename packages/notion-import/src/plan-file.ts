import { Document, isCollection, parseDocument } from "yaml";
import { collectComments, type NodeComment } from "@bsls/authoring/editing";
import {
  imageSchema,
  versionIdSchema,
  pieceFieldsSchema,
  projectFileSchema,
  slugSchema,
  variationIdSchema,
  variationSchema,
  versionSchema,
  z,
} from "@bsls/schema";
import type { ImportPlan, ImportWarning } from "./propose.js";

/**
 * Le plan d'import : ce que l'agent propose, sur le disque, avant que rien ne
 * soit écrit dans le contenu. Le calligraphe le relit, corrige un statut, un
 * classement, un texte, puis le fait appliquer. Les avertissements y sont des
 * commentaires ; ceux qui restent après l'arbitrage suivent leur pièce dans le
 * contenu.
 */

/*
 * Le plan dérive du schéma : la forme du contenu se définit dans
 * `packages/schema` et nulle part ailleurs. N'est redit ici que ce qui
 * appartient en propre au plan — le fichier source d'une image, une date
 * encore textuelle. Les versions et leurs variations y ont la forme exacte du
 * frontmatter : tant qu'il existe, le plan est la source de vérité.
 */

const plannedImageSchema = imageSchema.pick({ file: true, featured: true }).extend({
  /** Chemin du fichier dans l'export, le temps de l'import. */
  source: z.string().min(1),
  kind: imageSchema.shape.kind.default("work"),
  capture: imageSchema.shape.capture.default("scan"),
});

const plannedVariationSchema = variationSchema
  .pick({ script: true, status: true, personal_note: true })
  .extend({
    id: variationIdSchema,
    images: z.array(plannedImageSchema).default([]),
  });

const plannedVersionSchema = versionSchema
  .pick({ format: true, columns: true, intention: true, translation: true })
  .extend({
    id: versionIdSchema,
    /** Le schéma coerce la date ; le plan la garde lisible et corrigeable à la main. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "attendu : une date au format AAAA-MM-JJ"),
    variations: z.array(plannedVariationSchema).default([]),
  });

const plannedPieceSchema = pieceFieldsSchema
  .pick({
    slug: true,
    title: true,
    status: true,
    projects: true,
    source: true,
    published: true,
    translation: true,
  })
  .extend({
    versions: z
      .array(plannedVersionSchema, {
        required_error: "attendu : versions: [...], chaque version portant ses variations",
      })
      .min(1, "attendu : au moins une version"),
  });

const plannedProjectSchema = projectFileSchema.extend({
  id: slugSchema,
  /** Vide tant que le calligraphe ne l'a pas écrite ; `apply` la réclamera. */
  presentation: z.string(),
});

export const planFileSchema = z.object({
  projects: z.array(plannedProjectSchema).default([]),
  pieces: z.array(plannedPieceSchema).default([]),
});

export type ArbitratedPlan = z.infer<typeof planFileSchema>;
export type PlannedPiece = z.infer<typeof plannedPieceSchema>;
export type PlannedProject = z.infer<typeof plannedProjectSchema>;

export type PlanError = { path: string; message: string };
/** Les commentaires ne sont pas des champs : ils voyagent à côté du plan, par chemin. */
export type ParseResult =
  { ok: true; plan: ArbitratedPlan; comments: NodeComment[] } | { ok: false; errors: PlanError[] };

const HEADER = [
  " Plan d'import Notion — proposé par l'agent, arbitré par le calligraphe.",
  "",
  " Relisez pièce par pièce : corrigez le statut, le classement, le texte, le",
  " format. Rien n'est écrit dans le contenu avant `import:notion apply`.",
  " Supprimez une pièce de ce fichier pour ne pas l'importer.",
  "",
  " Les blocs `notion:` ne sont là que pour arbitrer : ils ne sont pas importés.",
].join("\n");

/** Sérialise le plan, chaque avertissement en commentaire au-dessus de ce qu'il vise. */
export function stringifyPlan(plan: ImportPlan): string {
  const document = new Document({
    projects: plan.projects.map(({ warnings: _warnings, ...project }) => project),
    pieces: plan.pieces.map(({ warnings: _warnings, ...piece }) => piece),
  });
  document.commentBefore = HEADER;

  annotate(document, "projects", plan.projects);
  annotate(document, "pieces", plan.pieces);

  return document.toString({ lineWidth: 0, blockQuote: "literal" });
}

function annotate(document: Document, key: string, items: { warnings: ImportWarning[] }[]): void {
  items.forEach((item, index) => {
    if (item.warnings.length === 0) return;
    const node = document.getIn([key, index], true);
    if (!isCollection(node)) return;
    node.commentBefore = item.warnings
      .map((warning) => ` à arbitrer — ${warning.field} : ${warning.message}`)
      .join("\n");
  });
}

/**
 * Relit un plan corrigé à la main. Un plan mal formé est rejeté avec le chemin
 * du champ fautif : on ne devine pas ce que le calligraphe voulait dire.
 */
export function parsePlan(text: string): ParseResult {
  const document = parseDocument(text);
  if (document.errors.length > 0) {
    return {
      ok: false,
      errors: document.errors.map((error) => ({ path: "", message: error.message })),
    };
  }

  const parsed = planFileSchema.safeParse(document.toJS());
  if (!parsed.success) {
    return {
      ok: false,
      errors: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    };
  }

  return { ok: true, plan: parsed.data, comments: collectComments(document) };
}
