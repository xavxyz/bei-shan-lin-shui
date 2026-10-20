import { findPiece } from "./find-piece.js";
import {
  candidateLabel,
  describeCandidate,
  renderPage,
  sheetLine,
  type Candidate,
} from "./render.js";
import { parseFormat, pourText } from "./sheets.js";

export type { Candidate } from "./render.js";

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
  { ok: true; html: string; candidates: Candidate[] } | { ok: false; message: string };

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

  return {
    ok: true,
    candidates,
    html: renderPage({
      title: piece.title,
      slug: piece.slug,
      version: version.id,
      origin: piece.origin,
      candidates,
    }),
  };
}

/** Le résumé que la commande affiche, une ligne par feuille. */
export function summarize(candidates: Candidate[]): string {
  return candidates
    .map((candidate) => {
      const { sheets, notes } = describeCandidate(candidate);
      return [
        candidateLabel(candidate),
        ...sheets.map((sheet, i) => `  ${sheetLine(sheet, i)}`),
        ...notes.map((note) => `  — ${note}`),
      ].join("\n");
    })
    .join("\n");
}
