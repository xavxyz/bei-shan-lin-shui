/**
 * Les feuilles quadrillées d'un format : répartition du texte dans les cases,
 * mise en page sur A4. Tout est en millimètres. La notation des formats, elle,
 * se lit dans `@bsls/schema`.
 */

import type { Group, Orientation, Sheet } from "@bsls/schema";

/* -------------------------------------------------------------------------- */
/* Répartition du texte                                                        */
/* -------------------------------------------------------------------------- */

/** Le rang de la grille où une colonne du texte aurait dû tomber, et ne tombe pas. */
export type Mismatch = {
  /** Colonne du texte, à partir de 1. */
  column: number;
  text: string;
  /** Feuille et groupe du rang, à partir de 1. */
  sheet: number;
  group: number;
  spec: Group;
};

/** Pour chaque feuille, pour chaque groupe, le texte de chaque rang. */
export type PouredText = {
  sheets: string[][][];
  /**
   * `columns` quand les colonnes du texte tombent une à une dans les rangs de
   * la grille ; `flowed` quand le texte, mis bout à bout, coule dans les cases
   * dans l'ordre des groupes.
   */
  mode: "columns" | "flowed";
  /** Colonnes du texte et rangs de la grille, comptés. */
  counts: { text: number; grid: number };
  /**
   * Quand le texte a autant de colonnes que la grille de rangs mais coule
   * quand même : chaque colonne dont la longueur n'est pas celle de son rang.
   */
  mismatches: Mismatch[];
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
 * Répartit les colonnes du texte dans les rangs de la grille, pris dans
 * l'ordre des groupes, de droite à gauche. Si le texte a autant de colonnes
 * que la grille de rangs, et que chacune tient dans le sien, elles y tombent
 * une à une ; sinon le texte coule, et les colonnes qui n'ont pas la longueur
 * de leur rang sont relevées.
 */
export function pourText(sheets: Sheet[], columns: string[]): PouredText {
  const text = columns.map(cleanColumn).filter((column) => column.length > 0);
  const slots = sheets.flatMap((sheet, s) =>
    sheet.flatMap((spec, g) =>
      Array.from({ length: spec.ranks }, () => ({ sheet: s + 1, group: g + 1, spec })),
    ),
  );
  const cells = slots.reduce((sum, slot) => sum + slot.spec.length, 0);
  const sameCount = text.length === slots.length;

  const oneToOne =
    sameCount && text.every((column, i) => [...column].length <= slots[i]!.spec.length);
  let filled: string[];
  let overflow = "";
  if (oneToOne) {
    filled = text;
  } else {
    const characters = [...text.join("")];
    let at = 0;
    filled = slots.map(({ spec }) => {
      const rank = characters.slice(at, at + spec.length).join("");
      at += spec.length;
      return rank;
    });
    overflow = characters.slice(cells).join("");
  }

  const mismatches: Mismatch[] =
    sameCount && !oneToOne
      ? text.flatMap((column, i) =>
          [...column].length === slots[i]!.spec.length
            ? []
            : [{ column: i + 1, text: column, ...slots[i]! }],
        )
      : [];

  let index = 0;
  const poured = sheets.map((sheet) =>
    sheet.map((group) => Array.from({ length: group.ranks }, () => filled[index++] ?? "")),
  );
  const written = filled.reduce((sum, rank) => sum + [...rank].length, 0);
  return {
    sheets: poured,
    mode: oneToOne ? "columns" : "flowed",
    counts: { text: text.length, grid: slots.length },
    mismatches,
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

/** Un rang posé sur la feuille : son coin haut gauche, son nombre de cases, et son carreau. */
export type RankBox = {
  x: number;
  y: number;
  length: number;
  orientation: Orientation;
  cell: number;
};

/** Largeur et hauteur d'un rang posé, en millimètres. */
export const rankSize = (box: RankBox) =>
  box.orientation === "v"
    ? { width: box.cell, height: box.cell * box.length }
    : { width: box.cell * box.length, height: box.cell };

export type SheetLayout = {
  orientation: "portrait" | "landscape";
  width: number;
  height: number;
  /** Côté du carreau de la feuille ; un groupe `/k` a le sien, k fois plus petit. */
  cell: number;
  /**
   * Les rangs dans l'ordre des groupes, de droite à gauche ; dans un groupe
   * vertical ses colonnes de droite à gauche, dans un groupe horizontal ses
   * lignes de haut en bas.
   */
  ranks: RankBox[];
  /** Bande du 落款, le long du bord gauche. */
  inscription: { x: number; y: number; width: number; height: number };
};

/** Largeur et hauteur d'un groupe, en carreaux de la feuille. */
const extent = (group: Group) =>
  group.orientation === "v"
    ? { across: group.ranks / group.scale, down: group.length / group.scale }
    : { across: group.length / group.scale, down: group.ranks / group.scale };

/**
 * Place une feuille sur A4. Chaque groupe est un bloc : un groupe vertical a
 * N carreaux de large et M de haut, un groupe horizontal M de large et N de
 * haut. Les blocs se suivent de droite à gauche, un demi-carreau entre deux.
 * Les groupes horizontaux sont alignés en haut ; quand la feuille en a, tous
 * ses groupes verticaux commencent sous le plus haut d'entre eux, un
 * demi-carreau plus bas. Entre deux colonnes, le 橫批 d'un 牌樓 est ainsi sur
 * le linteau, les colonnes pendant sous lui de part et d'autre du passage
 * vide. Un groupe `/k` a des carreaux k fois plus petits, et s'aligne en haut
 * comme les autres ; les écarts restent d'un demi-carreau de la feuille.
 * L'orientation retenue est celle qui donne les plus grands carreaux, et
 * l'ensemble est centré entre les marges.
 */
export function layoutSheet(sheet: Sheet): SheetLayout {
  const extents = sheet.map(extent);
  const span =
    extents.reduce((sum, { across }) => sum + across, 0) + (sheet.length - 1) * GROUP_GAP;
  const downs = (orientation: Orientation) =>
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

  const ranks: RankBox[] = [];
  let offset = 0;
  sheet.forEach((group, index) => {
    if (index > 0) offset += GROUP_GAP * cell;
    const { across } = extents[index]!;
    const groupCell = cell / group.scale;
    for (let i = 0; i < group.ranks; i++) {
      const { length, orientation } = group;
      const [x, y] =
        orientation === "v"
          ? [right - offset - (i + 1) * groupCell, top + hang * cell]
          : [right - offset - across * cell, top + i * groupCell];
      ranks.push({ x, y, length, orientation, cell: groupCell });
    }
    offset += across * cell;
  });

  return {
    orientation,
    width,
    height,
    cell,
    ranks,
    inscription: { x: 0, y: MARGIN, width: INSCRIPTION, height: height - 2 * MARGIN },
  };
}
