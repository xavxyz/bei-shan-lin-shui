import { parseFormat } from "@bsls/schema";
import { findPiece } from "./find-piece.js";
import {
  candidateLabel,
  describeCandidate,
  renderPage,
  sheetLine,
  type Candidate,
} from "./render.js";
import { MODELS, prepareModels, type Model } from "./models.js";
import { pourText } from "./sheets.js";

export type { Candidate } from "./render.js";
export type { Model } from "./models.js";

export type GridRequest = {
  /** Racine du dépôt : `content/` et `imports/` s'y trouvent. */
  root: string;
  slug: string;
  /** Par défaut la dernière version. */
  version?: string;
  /** Formats candidats à comparer ; par défaut celui de la version. */
  formats?: string[];
  /** Colonnes du texte, en traditionnel ; par défaut celles de la version. */
  columns?: string[];
};

export type GridResult =
  | { ok: true; html: string; candidates: Candidate[]; models: Model[] }
  | { ok: false; message: string };

/** Les feuilles quadrillées d'une pièce, pour chaque format candidat. */
export async function generateGrids(request: GridRequest): Promise<GridResult> {
  const found = await findPiece(request.root, request.slug);
  if (!found.ok) return found;
  const { piece } = found;

  const version = request.version
    ? piece.versions.find((candidate) => candidate.id === request.version)
    : piece.versions.at(-1);
  if (!version) {
    const ids = piece.versions.map((candidate) => candidate.id).join(", ");
    return {
      ok: false,
      message: `${piece.slug} n'a pas de version ${request.version} (versions : ${ids})`,
    };
  }

  const columns = request.columns ?? version.columns;
  if (columns.join("").trim() === "") {
    return {
      ok: false,
      message: `${piece.slug} ${version.id} n'a pas de colonnes : donner le texte avec --texte`,
    };
  }

  const formats = request.formats?.length ? request.formats : [version.format];
  const candidates: Candidate[] = [];
  for (const [index, format] of formats.entries()) {
    const parsed = parseFormat(format);
    if (!parsed.ok) {
      return {
        ok: false,
        message: `${parsed.message}\n(format de la version : « ${version.format} »)`,
      };
    }
    candidates.push({
      key: String.fromCharCode(65 + index),
      format,
      sheets: parsed.sheets,
      text: pourText(parsed.sheets, columns),
    });
  }

  const models = await prepareModels(`${piece.title}${columns.join("")}落款`);
  return {
    ok: true,
    candidates,
    models,
    html: renderPage({
      title: piece.title,
      slug: piece.slug,
      version: version.id,
      origin: piece.origin,
      candidates,
      models,
    }),
  };
}

/**
 * Le résumé que la commande affiche : une ligne par feuille, puis les 體 du
 * modèle et ce qu'ils disent du texte, chaque remarque une seule fois.
 */
export function summarize(candidates: Candidate[], models: Model[]): string {
  const modelNotes = models.flatMap((model) =>
    model.notes.map((note) =>
      note.startsWith(model.label) || note.startsWith("aucun 體")
        ? note
        : `${model.label} · ${note}`,
    ),
  );
  return [
    ...candidates.map((candidate) => {
      const { sheets, notes } = describeCandidate(candidate);
      return [
        candidateLabel(candidate),
        ...sheets.map((sheet, i) => `  ${sheetLine(sheet, i)}`),
        ...notes.map((note) => `  — ${note}`),
      ].join("\n");
    }),
    [
      `Modèle · ${models.map((model) => model.label).join(", ")}, ${MODELS[0].label} par défaut`,
      ...[...new Set(modelNotes)].map((note) => `  — ${note}`),
    ].join("\n"),
  ].join("\n");
}
