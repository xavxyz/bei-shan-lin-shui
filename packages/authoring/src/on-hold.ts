import { formatContentErrors, loadContent } from "@bsls/content";
import { VARIATION_STATUS_LABELS, type LoadedPiece } from "@bsls/schema";
import type { Outcome } from "./piece-file.js";

const ON_HOLD = "on-hold";

/**
 * Les pièces en veille, présentées pour être revues une à une : où chacune en
 * était à sa dernière version. Lecture seule.
 */
export async function describeOnHold(
  root: string,
): Promise<Outcome<{ count: number; text: string }>> {
  const loaded = await loadContent(root, { includeUnpublished: true });
  if (!loaded.ok) return { ok: false, message: formatContentErrors(loaded.errors) };

  const pieces = loaded.content.pieces.filter((piece) => piece.status === ON_HOLD);
  if (pieces.length === 0) return { ok: true, count: 0, text: "aucune pièce en veille\n" };

  const text = pieces.map(describePiece).join("\n");
  return { ok: true, count: pieces.length, text };
}

function describePiece(piece: LoadedPiece, index: number, all: LoadedPiece[]): string {
  const version = piece.latestVersion;
  const lines = [
    `## ${index + 1}/${all.length} — ${piece.title.traditional} · ${piece.slug}`,
    `projets : ${piece.projects.join(", ") || "aucun"} · versions : ${piece.versions.length}`,
    `${version.id} · ${version.date} · ${version.format}`,
  ];
  if (version.columns.length > 0) {
    lines.push(`colonnes : ${version.columns.map((column) => column.traditional).join(" / ")}`);
  }
  if (version.intention) lines.push(`intention : ${version.intention.trim()}`);
  for (const variation of version.variations) {
    const note = variation.personal_note ? ` — ${variation.personal_note.trim()}` : "";
    lines.push(
      `- ${variation.id} ${variation.scriptLabel}, ${VARIATION_STATUS_LABELS[variation.status]}${note}`,
    );
  }
  if (version.variations.length === 0) lines.push("- aucune variation");
  return `${lines.join("\n")}\n`;
}
