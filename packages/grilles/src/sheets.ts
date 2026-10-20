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
 * Lit la notation du dépôt : `NxM` est un groupe de N colonnes de M
 * caractères, `+` juxtapose des groupes sur une feuille, `(…)` fait une
 * feuille et `k*(…)` en fait k pareilles. Dès qu'une feuille est parenthésée,
 * chaque terme du premier niveau est une feuille : une suite de `NxM` nus en
 * fait une aussi.
 */
export function parseFormat(format: string): FormatResult {
  const source = format.replace(/\s+/g, "").replace(/[×X]/g, "x");
  let at = 0;

  const fail = (expected: string): FormatResult => ({
    ok: false,
    message: `format illisible : « ${format} » — ${expected} à la position ${at + 1}`,
  });
  const integer = (): number | null => {
    const match = /^\d+/.exec(source.slice(at));
    if (!match || Number(match[0]) < 1) return null;
    at += match[0].length;
    return Number(match[0]);
  };
  const group = (): Group | null => {
    const columns = integer();
    if (columns === null || source[at] !== "x") return null;
    at += 1;
    const rows = integer();
    return rows === null ? null : { columns, rows };
  };
  const groups = (): Sheet | null => {
    const sheet: Sheet = [];
    for (;;) {
      const next = group();
      if (!next) return null;
      sheet.push(next);
      if (source[at] !== "+" || source[at + 1] === "(" || /^\+\d+\*/.test(source.slice(at))) {
        return sheet;
      }
      at += 1;
    }
  };

  const terms: { sheets: Sheet[]; bracketed: boolean }[] = [];
  for (;;) {
    const start = at;
    const repeat = /^(\d+)\*/.exec(source.slice(at));
    if (repeat) at += repeat[0].length;
    if (source[at] === "(") {
      at += 1;
      const sheet = groups();
      if (!sheet) return fail("attendu NxM");
      if (source[at] !== ")") return fail("attendu « ) »");
      at += 1;
      const times = repeat ? Number(repeat[1]) : 1;
      if (times < 1) return fail("attendu une répétition d'au moins 1");
      terms.push({ sheets: Array.from({ length: times }, () => sheet), bracketed: true });
    } else {
      if (repeat) return fail("attendu « ( » après la répétition");
      at = start;
      const sheet = groups();
      if (!sheet) return fail("attendu NxM");
      terms.push({ sheets: [sheet], bracketed: false });
    }
    if (at === source.length) break;
    if (source[at] !== "+") return fail("attendu « + »");
    at += 1;
  }

  if (terms.some((term) => term.bracketed)) {
    return { ok: true, sheets: terms.flatMap((term) => term.sheets) };
  }
  return { ok: true, sheets: [terms.flatMap((term) => term.sheets.flat())] };
}

/* -------------------------------------------------------------------------- */
/* Répartition du texte                                                        */
/* -------------------------------------------------------------------------- */

/** Pour chaque feuille, pour chaque groupe, le texte de chaque colonne. */
export type PouredText = {
  sheets: string[][][];
  /**
   * `colonnes` quand les colonnes du texte tombent une à une dans celles de la
   * grille ; `coulé` quand le texte, mis bout à bout, remplit les cases dans
   * l'ordre de lecture.
   */
  mode: "colonnes" | "coulé";
  /** Ce qui ne tient pas dans la grille. */
  overflow: string;
  /** Cases restées vides. */
  empty: number;
};

/** Ponctuation et blancs : la calligraphie n'en porte pas. */
const NOT_WRITTEN = /[\s，。、；：！？「」『』《》〈〉（）()·,.;:!?'"“”‘’…—-]/gu;

export function cleanColumn(column: string): string {
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
    mode: oneToOne ? "colonnes" : "coulé",
    overflow,
    empty: cells - written,
  };
}

/* -------------------------------------------------------------------------- */
/* Mise en page                                                                */
/* -------------------------------------------------------------------------- */

export const A4 = { short: 210, long: 297 } as const;
/** Marges de la feuille. */
export const MARGIN = 15;
/** Marge de gauche, réservée au 落款. */
export const INSCRIPTION = 25;
/** Écart entre deux groupes de colonnes, en carreaux. */
export const GROUP_GAP = 0.5;

export type ColumnBox = { x: number; y: number; rows: number };

export type SheetLayout = {
  orientation: "portrait" | "paysage";
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
      ? (["paysage", A4.long, A4.short, landscape] as const)
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
