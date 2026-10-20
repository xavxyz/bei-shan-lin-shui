/**
 * Les feuilles quadrillées d'un format : lecture de la notation, répartition
 * du texte dans les cases, mise en page sur A4. Tout est en millimètres.
 */

/**
 * `NxM` : N lignes de M caractères. Une ligne est une colonne lue de haut en
 * bas (`v`, par défaut), ou une ligne lue de droite à gauche (`h`).
 */
export type Group = { lines: number; length: number; orientation: "v" | "h" };
/** Une feuille juxtapose ses groupes, de droite à gauche. */
export type Sheet = Group[];

export type FormatResult = { ok: true; sheets: Sheet[] } | { ok: false; message: string };

/**
 * Lit la notation des formats : `[(…), (…)]` est la suite des feuilles, et
 * chaque parenthèse les groupes `NxM` d'une feuille, séparés par des virgules.
 * `[(1x3, 9x7), (1x4, 3x7)]` fait deux feuilles de deux groupes chacune.
 * Un groupe est vertical, N colonnes de M caractères, sauf suffixé `h` :
 * N lignes horizontales de M caractères, comme le 橫批 de `[(1x7, 1x4h, 1x7)]`.
 * `v` explicite est accepté.
 */
export function parseFormat(format: string): FormatResult {
  const source = format.replace(/\s+/g, "").toLowerCase().replace(/×/g, "x");
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
    const lines = integer();
    if (lines === null || !expect("x")) return null;
    const length = integer();
    if (length === null) return null;
    if (expect("h")) return { lines, length, orientation: "h" };
    expect("v");
    return { lines, length, orientation: "v" };
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
      const suffix = /^[a-z]/.exec(source.slice(at));
      if (suffix) return fail(`orientation « ${suffix[0]} » inconnue, attendu « v » ou « h »`);
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
    sheet.flatMap((group) => Array.from({ length: group.lines }, () => group.length)),
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
    sheet.map((group) => Array.from({ length: group.lines }, () => filled[index++] ?? "")),
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
/** Écart entre deux groupes, en carreaux. */
const GROUP_GAP = 0.5;

/** Une colonne ou une ligne de cases : son coin haut gauche, et son nombre de cases. */
export type LineBox = { x: number; y: number; length: number; orientation: "v" | "h" };

export type SheetLayout = {
  orientation: "portrait" | "landscape";
  width: number;
  height: number;
  /** Côté d'un carreau. */
  cell: number;
  /**
   * Colonnes et lignes dans l'ordre de lecture : les groupes de droite à
   * gauche, et dans un groupe horizontal ses lignes de haut en bas.
   */
  lines: LineBox[];
  /** Bande du 落款, le long du bord gauche. */
  inscription: { x: number; y: number; width: number; height: number };
};

/** Largeur et hauteur d'un groupe, en carreaux. */
const extent = (group: Group) =>
  group.orientation === "v"
    ? { across: group.lines, down: group.length }
    : { across: group.length, down: group.lines };

/**
 * Place une feuille sur A4. Chaque groupe est un bloc : un groupe vertical a
 * N carreaux de large et M de haut, un groupe horizontal M de large et N de
 * haut. Les blocs se suivent de droite à gauche, un demi-carreau entre deux.
 * Les groupes horizontaux sont alignés en haut ; quand la feuille en a, tous
 * ses groupes verticaux commencent sous le plus haut d'entre eux, un
 * demi-carreau plus bas. Entre deux colonnes, le 橫批 d'un 牌樓 est ainsi sur
 * le linteau, centré, les colonnes pendant sous lui de part et d'autre du
 * passage vide. L'orientation retenue est celle qui donne les plus grands
 * carreaux, et l'ensemble est centré entre les marges.
 */
export function layoutSheet(sheet: Sheet): SheetLayout {
  const extents = sheet.map(extent);
  const span =
    extents.reduce((sum, { across }) => sum + across, 0) + (sheet.length - 1) * GROUP_GAP;
  const downs = (orientation: Group["orientation"]) =>
    sheet.flatMap((group, i) => (group.orientation === orientation ? [extents[i]!.down] : []));
  const lintel = Math.max(0, ...downs("h"));
  /** Où commencent les colonnes, en carreaux sous le haut du bloc. */
  const hang = lintel > 0 ? lintel + GROUP_GAP : 0;
  const rows = Math.max(lintel, ...downs("v").map((down) => hang + down));

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

  const lines: LineBox[] = [];
  let offset = 0;
  sheet.forEach((group, index) => {
    if (index > 0) offset += GROUP_GAP * cell;
    const { across } = extents[index]!;
    for (let i = 0; i < group.lines; i++) {
      const { length, orientation } = group;
      lines.push(
        orientation === "v"
          ? { x: right - offset - (i + 1) * cell, y: top + hang * cell, length, orientation }
          : { x: right - offset - across * cell, y: top + i * cell, length, orientation },
      );
    }
    offset += across * cell;
  });

  return {
    orientation,
    width,
    height,
    cell,
    lines,
    inscription: { x: 0, y: MARGIN, width: INSCRIPTION, height: height - 2 * MARGIN },
  };
}
