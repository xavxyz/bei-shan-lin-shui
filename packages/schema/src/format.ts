/**
 * La notation des formats : la disposition des colonnes d'une version sur ses
 * feuilles (GLOSSARY, « Format »). C'est la grammaire que les grilles
 * impriment et que l'écriture d'une version exige.
 *
 * Un **rang** est une suite de cases dans le sens de l'écriture : une colonne,
 * lue de haut en bas, dans un groupe vertical ; une ligne, lue de droite à
 * gauche, dans un groupe horizontal.
 */

/** `v` : des colonnes, le défaut ; `h` : des lignes. */
export type Orientation = "v" | "h";

/**
 * `NxM` : N rangs de M caractères. `NxM/k` : des carreaux k fois plus petits
 * que ceux de la feuille ; `scale` vaut 1 sans rapport.
 */
export type Group = { ranks: number; length: number; orientation: Orientation; scale: number };
/** Une feuille juxtapose ses groupes, de droite à gauche. */
export type Sheet = Group[];

export type FormatResult = { ok: true; sheets: Sheet[] } | { ok: false; message: string };

/** `1x7 vertical`, `1x7/2 vertical` : un groupe, dans les messages. */
export const groupLabel = (group: Group) =>
  `${group.ranks}x${group.length}${group.scale === 1 ? "" : `/${group.scale}`} ${group.orientation === "v" ? "vertical" : "horizontal"}`;

/**
 * Lit la notation des formats : `[(…), (…)]` est la suite des feuilles, et
 * chaque parenthèse les groupes `NxM` d'une feuille, séparés par des virgules.
 * `[(1x3, 9x7), (1x4, 3x7)]` fait deux feuilles de deux groupes chacune.
 * Un groupe est vertical, N colonnes de M caractères, sauf suffixé `h` :
 * N lignes horizontales de M caractères, comme le 橫批 de `[(1x7, 1x4h, 1x7)]`.
 * `v` explicite est accepté. Suffixé `/k`, après l'orientation, un groupe a
 * des carreaux k fois plus petits que ceux de la feuille : `[(1x2, 1x7/2)]`.
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
  /** Un groupe, ou ce qui était attendu là où la lecture bute. */
  const group = (): Group | string => {
    const ranks = integer();
    if (ranks === null || !expect("x")) return "attendu NxM";
    const length = integer();
    if (length === null) return "attendu NxM";
    let orientation: Orientation = "v";
    if (expect("h")) orientation = "h";
    else expect("v");
    if (!expect("/")) return { ranks, length, orientation, scale: 1 };
    const match = /^\d+(\.\d+)?/.exec(source.slice(at));
    if (!match) return "attendu un rapport k après « / »";
    const scale = Number(match[0]);
    if (scale < 1) {
      return `rapport « /${match[0]} » plus petit que 1, attendu un carreau plus petit que celui de la feuille`;
    }
    at += match[0].length;
    const late = /^[hv]/.exec(source.slice(at));
    if (late) {
      return `l'orientation « ${late[0]} » précède le rapport, attendu « ${ranks}x${length}${late[0]}/${match[0]} »`;
    }
    return { ranks, length, orientation, scale };
  };

  if (!expect("[")) return fail("attendu « [ »");
  const sheets: Sheet[] = [];
  do {
    const start = at;
    if (!expect("(")) return fail("attendu « ( »");
    const sheet: Sheet = [];
    do {
      const next = group();
      if (typeof next === "string") return fail(next);
      sheet.push(next);
      const suffix = /^[a-z]/.exec(source.slice(at));
      if (suffix) return fail(`orientation « ${suffix[0]} » inconnue, attendu « v » ou « h »`);
    } while (expect(","));
    if (!expect(")")) return fail("attendu « , » ou « ) »");
    if (sheet.every((spec) => spec.scale !== 1)) {
      at = start;
      return fail("aucun groupe au carreau de la feuille");
    }
    sheets.push(sheet);
  } while (expect(","));
  if (!expect("]")) return fail("attendu « , » ou « ] »");
  if (at !== source.length) return fail("attendu la fin du format");
  return { ok: true, sheets };
}

/**
 * Le format d'une version dont la disposition n'est pas encore connue : l'import
 * Notion le propose quand la page n'en dit rien. C'est la seule valeur hors
 * notation qu'une version accepte.
 */
export const UNSPECIFIED_FORMAT = "à préciser";

/** Le format d'une version : une grille dans la notation, ou `à préciser`. */
export function checkFormat(format: string): { ok: true } | { ok: false; message: string } {
  if (format.trim() === UNSPECIFIED_FORMAT) return { ok: true };
  const parsed = parseFormat(format);
  return parsed.ok ? { ok: true } : parsed;
}
