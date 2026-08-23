/**
 * Lecteur CSV minimal, taillé pour les exports Notion : champs cités,
 * guillemets doublés, sauts de ligne à l'intérieur d'un champ — le texte d'une
 * calligraphie est multi-lignes par nature.
 */
export type CsvRow = Record<string, string>;

export function parseCsv(text: string): CsvRow[] {
  const records = parseRecords(text.replace(/^﻿/, "").replace(/\r\n/g, "\n"));
  const [header, ...rest] = records;
  if (!header) return [];

  return rest
    .filter((record) => record.some((field) => field !== ""))
    .map((record) => Object.fromEntries(header.map((name, index) => [name, record[index] ?? ""])));
}

function parseRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;

    if (quoted) {
      if (char !== '"') {
        field += char;
      } else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = false;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      record.push(field);
      field = "";
    } else if (char === "\n") {
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += char;
  }

  if (field !== "" || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  return records;
}
