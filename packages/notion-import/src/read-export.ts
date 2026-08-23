import { readdir, readFile, stat } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";
import { parseCsv, type CsvRow } from "./csv.js";

/**
 * Une page Notion telle qu'elle sort de l'export, avant tout jugement.
 * Les colonnes de relation sont lues pour éclairer le classement, mais elles ne
 * produiront aucune structure dans le contenu importé.
 */
export type NotionPage = {
  title: string;
  /** Date au format `YYYY-MM-DD`, absente si la colonne l'était. */
  createdAt?: string;
  editedAt?: string;
  format: string;
  /** Texte de la calligraphie, une colonne par ligne. */
  text: string;
  url: string;
  /** État Notion, tel quel : la traduction en statut du schéma est un jugement. */
  status: string;
  /** Titres des pages liées, toutes colonnes de relation confondues. */
  relations: string[];
  /** Corps de la sous-page, débarrassé de son titre, de ses propriétés et de ses images. */
  body: string;
  /** Chemins absolus des fichiers joints à la page. */
  attachments: string[];
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".heic", ".tif", ".tiff"]);

/**
 * Lit un export Notion *Markdown & CSV* : soit le dossier déposé dans le
 * répertoire de travail, soit le seul fichier CSV quand c'est tout ce qu'il
 * reste. Aucune préparation manuelle n'est attendue de l'export.
 */
export async function readNotionExport(path: string): Promise<NotionPage[]> {
  const { csvPath, root } = await locateCsv(path);
  const files = await walk(root);
  const rows = parseCsv(await readFile(csvPath, "utf8"));
  const columns = mapColumns(rows);

  return Promise.all(rows.map((row) => toPage(row, columns, files)));
}

type Columns = {
  title: string;
  created?: string;
  edited?: string;
  format?: string;
  text?: string;
  url?: string;
  status?: string;
  relations: string[];
};

async function locateCsv(path: string): Promise<{ csvPath: string; root: string }> {
  const stats = await stat(path).catch(() => undefined);
  if (!stats) throw new Error(`export introuvable : ${path}`);

  if (stats.isFile()) return { csvPath: path, root: dirname(path) };

  const candidates = (await walk(path)).filter((file) => extname(file).toLowerCase() === ".csv");
  if (candidates.length === 0) {
    throw new Error(`aucun fichier CSV dans l'export : ${path}`);
  }

  /* Notion dépose la vue courante et la base complète : c'est la seconde qu'on veut. */
  const complete = candidates.find((file) => /_all\.csv$/i.test(file));
  return { csvPath: complete ?? candidates.sort()[0]!, root: path };
}

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    }),
  );
  return files.flat();
}

/**
 * Les en-têtes d'un export Notion suivent la langue de l'espace de travail :
 * on les reconnaît par leur sens, et le titre est toujours la première colonne.
 */
function mapColumns(rows: CsvRow[]): Columns {
  const headers = Object.keys(rows[0] ?? {});
  const find = (pattern: RegExp) => headers.find((header) => pattern.test(header));

  const known = new Set<string>();
  const claim = (header: string | undefined) => {
    if (header) known.add(header);
    return header;
  };

  const title = claim(headers[0]) ?? "";
  const created = claim(find(/date de création|created/i));
  const edited = claim(find(/dernière modification|last edited/i));
  const format = claim(find(/format/i));
  const text = claim(find(/texte|text/i));
  const url = claim(find(/^url$/i));
  const status = claim(find(/état|etat|statut|status/i));

  const relations = headers.filter(
    (header) =>
      !known.has(header) &&
      (/[↩➡]/u.test(header) || rows.some((row) => LINK.test(row[header] ?? ""))),
  );

  return { title, created, edited, format, text, url, status, relations };
}

/** `Titre de la page (https://…)`, la forme que prend une relation dans un CSV Notion. */
const LINK = /([^(,][^(]*?)\s*\(https?:\/\/[^)]*\)/g;

async function toPage(row: CsvRow, columns: Columns, files: string[]): Promise<NotionPage> {
  const title = (row[columns.title] ?? "").trim();
  const page = await readPageFiles(title, files);

  return {
    title,
    createdAt: parseFrenchDate(value(row, columns.created)),
    editedAt: parseFrenchDate(value(row, columns.edited)),
    format: value(row, columns.format).trim(),
    text: value(row, columns.text).trim(),
    url: value(row, columns.url).trim(),
    status: value(row, columns.status).trim(),
    relations: columns.relations.flatMap((header) => parseRelations(row[header] ?? "")),
    ...page,
  };
}

function value(row: CsvRow, column: string | undefined): string {
  return column === undefined ? "" : (row[column] ?? "");
}

function parseRelations(cell: string): string[] {
  return [...cell.matchAll(LINK)]
    .map((match) => match[1]!.replace(/^,\s*/, "").trim())
    .filter((title) => title !== "");
}

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** Notion date en toutes lettres ; le schéma veut une date. */
function parseFrenchDate(raw: string): string | undefined {
  const match = /^(\d{1,2})(?:er)?\s+(\p{L}+)\s+(\d{4})/u.exec(raw.trim());
  if (!match) {
    const iso = /^(\d{4}-\d{2}-\d{2})/.exec(raw.trim());
    return iso?.[1];
  }

  const month = MONTHS.indexOf(match[2]!.toLowerCase());
  if (month < 0) return undefined;

  return `${match[3]}-${pad(month + 1)}-${pad(Number(match[1]))}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/* -------------------------------------------------------------------------- */
/* Sous-pages et fichiers joints                                               */
/* -------------------------------------------------------------------------- */

async function readPageFiles(
  title: string,
  files: string[],
): Promise<{ body: string; attachments: string[] }> {
  const key = titleKey(title);
  if (key === "") return { body: "", attachments: [] };

  const markdown = files.find(
    (file) => extname(file).toLowerCase() === ".md" && matches(titleKey(nameOf(file)), key),
  );
  // Notion range les fichiers d'une page dans un dossier à son nom, sauf quand
  // il n'y en a qu'un : il est alors posé à côté du .md, nommé comme la page.
  // Le voisinage du .md est exigé — un fichier homonyme ailleurs dans
  // l'arborescence n'est pas un fichier joint à la page.
  const pageDirectory = markdown === undefined ? undefined : dirname(markdown);
  const attachments = files
    .filter((file) => {
      if (!IMAGE_EXTENSIONS.has(extname(file).toLowerCase())) return false;
      if (matches(titleKey(basename(dirname(file))), key)) return true;
      return dirname(file) === pageDirectory && matches(titleKey(nameOf(file)), key);
    })
    .sort();

  return {
    body: markdown ? stripPageChrome(await readFile(markdown, "utf8")) : "",
    attachments,
  };
}

function nameOf(file: string): string {
  return basename(file, extname(file));
}

/**
 * Notion suffixe les noms de fichiers d'un hash et rabote la ponctuation :
 * on compare des titres réduits à leurs lettres et à leurs caractères han.
 */
function titleKey(name: string): string {
  return name
    .replace(/\s+[0-9a-f]{8,32}$/i, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Les titres longs sont tronqués dans les noms de fichiers : le préfixe suffit. */
function matches(fileKey: string, titleKey: string): boolean {
  if (fileKey === "" || titleKey === "") return false;
  return fileKey.length >= titleKey.length
    ? fileKey.startsWith(titleKey)
    : titleKey.startsWith(fileKey);
}

const PROPERTY_LINE = /^[^\n:]{1,60}:\s/;

/**
 * Ne garde du Markdown exporté que la prose : le titre et le tableau de
 * propriétés répètent le CSV, et les images sont rapatriées comme fichiers.
 */
function stripPageChrome(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  if (lines[0]?.startsWith("# ")) lines.shift();
  while (lines.length > 0 && (lines[0]!.trim() === "" || PROPERTY_LINE.test(lines[0]!))) {
    lines.shift();
  }

  return lines
    .join("\n")
    .replace(/^!?\[[^\]]*\]\([^)]*\)\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
