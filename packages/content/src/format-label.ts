import { parseFormat, plural, type FormatLabel, type Group } from "@bsls/schema";

/** `4 colonnes de 5 caractères`, `1 ligne horizontale de 4 caractères en petits carreaux (1/2)`. */
function groupLabel(group: Group): string {
  const rank = group.orientation === "h" ? "ligne horizontale" : "colonne";
  const label = `${plural(group.ranks, rank)} de ${plural(group.length, "caractère")}`;
  if (group.scale === 1) return label;
  return `${label} en petits carreaux (1/${String(group.scale).replace(".", ",")})`;
}

/**
 * Dit en français le format d'une version, depuis sa notation : jamais
 * stocké, il vit le temps du build, comme le simplifié. Une notation
 * illisible le dit, sans faire échouer le build.
 */
export function deriveFormatLabel(format: string): FormatLabel {
  const parsed = parseFormat(format);
  if (!parsed.ok) return { readable: false };
  const sheets = parsed.sheets.map((sheet) => enumerate(sheet.map(groupLabel)));
  const text =
    sheets.length === 1
      ? sheets[0]!
      : `${plural(sheets.length, "feuille")} : ${sheets.join(" ; ")}`;
  return { readable: true, text };
}

/** `a`, `a et b`, `a, b et c`. */
function enumerate(items: string[]): string {
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}
