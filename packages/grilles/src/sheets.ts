/**
 * Les feuilles quadrillées d'un format : lecture de la notation, répartition
 * du texte dans les cases, mise en page sur A4. Tout est en millimètres.
 */

/** `NxM` : N colonnes de M caractères. */
export type Group = { columns: number; rows: number };
/** Une feuille juxtapose ses groupes de colonnes, de droite à gauche. */
export type Sheet = Group[];

export type FormatResult = { ok: true; sheets: Sheet[] } | { ok: false; message: string };

/**
 * Lit la notation des formats : `[(…), (…)]` est la suite des feuilles, et
 * chaque parenthèse les groupes `NxM` d'une feuille, N colonnes de M
 * caractères, séparés par des virgules. `[(1x3, 9x7), (1x4, 3x7)]` fait deux
 * feuilles de deux groupes chacune.
 */
export function parseFormat(format: string): FormatResult {
  const source = format.replace(/\s+/g, "").replace(/[×X]/g, "x");
  let at = 0;

  const fail = (expected: string): FormatResult => {
    const old = /[+*]/.test(source)
      ? "\n(ancienne notation : une feuille par parenthèse, les feuilles entre crochets, ex. [(1x3, 9x7), (1x4, 3x7)])"
      : "";
    return {
      ok: false,
      message: `format illisible : « ${format} » — ${expected} à la position ${at + 1}${old}`,
    };
  };
  const expect = (token: string): boolean => {
    if (source[at] !== token) return false;
    at += 1;
    return true;
  };
  const integer = (): number | null => {
    const match = /^\d+/.exec(source.slice(at));
    if (!match || Number(match[0]) < 1) return null;
    at += match[0].length;
    return Number(match[0]);
  };
  const group = (): Group | null => {
    const columns = integer();
    if (columns === null || !expect("x")) return null;
    const rows = integer();
    return rows === null ? null : { columns, rows };
  };

  if (!expect("[")) return fail("attendu « [ »");
  const sheets: Sheet[] = [];
  do {
    if (!expect("(")) return fail("attendu « ( »");
    const sheet: Sheet = [];
    do {
      const next = group();
      if (!next) return fail("attendu NxM");
      sheet.push(next);
    } while (expect(","));
    if (!expect(")")) return fail("attendu « , » ou « ) »");
    sheets.push(sheet);
  } while (expect(","));
  if (!expect("]")) return fail("attendu « , » ou « ] »");
  if (at !== source.length) return fail("attendu la fin du format");
  return { ok: true, sheets };
}

/* -------------------------------------------------------------------------- */
/* Répartition du texte                                                        */
/* -------------------------------------------------------------------------- */

/** Pour chaque feuille, pour chaque groupe, le texte de chaque colonne. */
export type PouredText = {
  sheets: string[][][];
  /**
   * `columns` quand les colonnes du texte tombent une à une dans celles de la
   * grille ; `flowed` quand le texte, mis bout à bout, coule dans les cases
   * dans l'ordre de lecture.
   */
  mode: "columns" | "flowed";
  /** Ce qui ne tient pas dans la grille. */
  overflow: string;
  /** Cases restées vides. */
  empty: number;
};

/** Ponctuation et blancs : la calligraphie n'en porte pas. */
const NOT_WRITTEN = /[\s，。、；：！？「」『』《》〈〉（）()·,.;:!?'"“”‘’…—-]/gu;

function cleanColumn(column: string): string {
  return column.replace(NOT_WRITTEN, "");
}

/**
 * Répartit les colonnes du texte dans les cases de la grille. Si le texte a
 * autant de colonnes que la grille, et que chacune tient dans la sienne,
 * elles y tombent une à une ; sinon le texte coule dans l'ordre de lecture.
 */
export function pourText(sheets: Sheet[], columns: string[]): PouredText {
  const text = columns.map(cleanColumn).filter((column) => column.length > 0);
  const slots = sheets.flatMap((sheet) =>
    sheet.flatMap((group) => Array.from({ length: group.columns }, () => group.rows)),
  );
  const cells = slots.reduce((sum, rows) => sum + rows, 0);

  const oneToOne =
    text.length === slots.length && text.every((column, i) => [...column].length <= slots[i]!);
  let filled: string[];
  let overflow = "";
  if (oneToOne) {
    filled = text;
  } else {
    const characters = [...text.join("")];
    let at = 0;
    filled = slots.map((rows) => {
      const column = characters.slice(at, at + rows).join("");
      at += rows;
      return column;
    });
    overflow = characters.slice(cells).join("");
  }

  let index = 0;
  const poured = sheets.map((sheet) =>
    sheet.map((group) => Array.from({ length: group.columns }, () => filled[index++] ?? "")),
  );
  const written = filled.reduce((sum, column) => sum + [...column].length, 0);
  return {
    sheets: poured,
    mode: oneToOne ? "columns" : "flowed",
    overflow,
    empty: cells - written,
  };
}

/* -------------------------------------------------------------------------- */
/* Mise en page                                                                */
/* -------------------------------------------------------------------------- */

const A4 = { short: 210, long: 297 } as const;
/** Marges de la feuille. */
const MARGIN = 15;
/** Marge de gauche, réservée au 落款. */
const INSCRIPTION = 25;
/** Écart entre deux groupes de colonnes, en carreaux. */
const GROUP_GAP = 0.5;

type ColumnBox = { x: number; y: number; rows: number };

export type SheetLayout = {
  orientation: "portrait" | "landscape";
  width: number;
  height: number;
  /** Côté d'un carreau. */
  cell: number;
  /** Colonnes dans l'ordre de lecture : la première est la plus à droite. */
  columns: ColumnBox[];
  /** Bande du 落款, le long du bord gauche. */
  inscription: { x: number; y: number; width: number; height: number };
};

/**
 * Place une feuille sur A4 : l'orientation retenue est celle qui donne les
 * plus grands carreaux ; le bloc est centré entre les marges, colonnes
 * alignées en haut, un demi-carreau entre deux groupes.
 */
export function layoutSheet(sheet: Sheet): SheetLayout {
  const columns = sheet.reduce((sum, group) => sum + group.columns, 0);
  const rows = Math.max(...sheet.map((group) => group.rows));
  const span = columns + (sheet.length - 1) * GROUP_GAP;

  const fit = (width: number, height: number) =>
    Math.min((width - MARGIN - INSCRIPTION) / span, (height - 2 * MARGIN) / rows);
  const portrait = fit(A4.short, A4.long);
  const landscape = fit(A4.long, A4.short);
  const [orientation, width, height, cell] =
    landscape > portrait
      ? (["landscape", A4.long, A4.short, landscape] as const)
      : (["portrait", A4.short, A4.long, portrait] as const);

  const area = width - MARGIN - INSCRIPTION;
  const right = width - MARGIN - (area - span * cell) / 2;
  const top = (height - rows * cell) / 2;

  const boxes: ColumnBox[] = [];
  let offset = 0;
  sheet.forEach((group, index) => {
    if (index > 0) offset += GROUP_GAP * cell;
    for (let i = 0; i < group.columns; i++) {
      boxes.push({ x: right - offset - cell, y: top, rows: group.rows });
      offset += cell;
    }
  });

  return {
    orientation,
    width,
    height,
    cell,
    columns: boxes,
    inscription: { x: 0, y: MARGIN, width: INSCRIPTION, height: height - 2 * MARGIN },
  };
}
