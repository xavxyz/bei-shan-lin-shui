import { parseFormat, plural, type Group } from "@bsls/schema";

/** `4 colonnes de 5 caractères`, `1 ligne horizontale de 4 caractères en petits carreaux (1/2)`. */
function groupLabel(group: Group): string {
  const rank = group.orientation === "h" ? "ligne horizontale" : "colonne";
  const label = `${plural(group.ranks, rank)} de ${plural(group.length, "caractère")}`;
  if (group.scale === 1) return label;
  return `${label} en petits carreaux (1/${String(group.scale).replace(".", ",")})`;
}

/**
 * Dit en français le format d'une version, depuis sa notation : jamais
 * stocké, il vit le temps du build, comme le simplifié.
 */
export function deriveFormatLabel(format: string): string {
  const parsed = parseFormat(format);
  if (!parsed.ok) return format;
  const sheets = parsed.sheets.map((sheet) => enumerate(sheet.map(groupLabel)));
  if (sheets.length === 1) return sheets[0]!;
  return `${plural(sheets.length, "feuille")} : ${sheets.join(" ; ")}`;
}

/** `a`, `a et b`, `a, b et c`. */
function enumerate(items: string[]): string {
  if (items.length === 1) return items[0]!;
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}
