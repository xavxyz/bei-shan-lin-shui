import { groupLabel, type Orientation, type Sheet } from "@bsls/schema";
import { rankSize, type SheetLayout } from "./sheets.js";

/** Une cote, au dixième de millimètre : ce qu'on reporte à la règle. */
export const cote = (value: number) => value.toFixed(1);

/** Un tronçon coté : ses bornes sur la feuille, et le carreau qu'il compte s'il couvre des cases. */
export type Span = { from: number; to: number; cell?: number };

/** Ce qu'il faut reporter à la règle pour tracer une feuille à la main. */
export type Measures = {
  /** Le bloc de la grille. */
  block: Bounds;
  /** En haut, de gauche à droite : la marge gauche, chaque groupe et chaque écart, la marge droite. */
  across: Span[];
  /**
   * À droite, de haut en bas : la marge haute, le 橫批 et le vide sous lui,
   * les colonnes du groupe qui descend le plus bas, la marge basse.
   */
  down: Span[];
  /** Chaque groupe moins haut que la cote de droite, coté le long de son bord gauche. */
  shorter: { edge: number; span: Span }[];
  /** L'écart entre deux groupes : un demi-carreau de la feuille, le même entre tous. */
  gap: number | null;
  /** Le vide entre le bas du 橫批 et le haut des colonnes qui pendent sous lui. */
  underLintel: number | null;
};

type Bounds = { top: number; right: number; bottom: number; left: number };

type GroupBounds = Bounds & { orientation: Orientation; cell: number };

const bounds = (all: Bounds[]): Bounds => ({
  top: Math.min(...all.map((b) => b.top)),
  right: Math.max(...all.map((b) => b.right)),
  bottom: Math.max(...all.map((b) => b.bottom)),
  left: Math.min(...all.map((b) => b.left)),
});

/** Le groupe qui descend le plus bas. */
const lowest = (groups: GroupBounds[]) =>
  groups.reduce((low, group) => (group.bottom > low.bottom ? group : low));

/** Ce qui sépare deux bords qu'on cote à part : un groupe qui finit plus haut. */
const SHORTER = 0.05;

export function measure(layout: SheetLayout & { groups: Sheet }): Measures {
  let at = 0;
  const groups: GroupBounds[] = layout.groups.map((group) => {
    const own = layout.ranks.slice(at, (at += group.ranks));
    return {
      ...bounds(
        own.map((box) => {
          const { width, height } = rankSize(box);
          return { top: box.y, right: box.x + width, bottom: box.y + height, left: box.x };
        }),
      ),
      orientation: group.orientation,
      cell: own[0]!.cell,
    };
  });
  const block = bounds(groups);
  const lines = groups.filter((group) => group.orientation === "h");
  const columns = groups.filter((group) => group.orientation === "v");
  const lintel = lines.length > 0 && columns.length > 0 ? lowest(lines) : null;
  const hang = Math.min(...columns.map((group) => group.top));

  const across: Span[] = [{ from: 0, to: block.left }];
  const fromLeft = [...groups].reverse();
  fromLeft.forEach((group, i) => {
    across.push({ from: group.left, to: group.right, cell: group.cell });
    const next = fromLeft[i + 1];
    if (next) across.push({ from: group.right, to: next.left });
  });
  across.push({ from: block.right, to: layout.width });

  const cell = lowest(groups).cell;
  const down: Span[] = [
    { from: 0, to: block.top },
    ...(lintel
      ? [
          { from: block.top, to: lintel.bottom, cell: lintel.cell },
          { from: lintel.bottom, to: hang },
          { from: hang, to: block.bottom, cell },
        ]
      : [{ from: block.top, to: block.bottom, cell }]),
    { from: block.bottom, to: layout.height },
  ];

  const shorter = groups
    .filter((group) => {
      const chain = lintel && group.orientation === "h" ? lintel.bottom : block.bottom;
      return group.bottom < chain - SHORTER;
    })
    .map((group) => ({
      edge: group.left,
      span: { from: group.top, to: group.bottom, cell: group.cell },
    }));

  return {
    block,
    across,
    down,
    shorter,
    gap: groups.length > 1 ? groups[0]!.left - groups[1]!.right : null,
    underLintel: lintel ? hang - lintel.bottom : null,
  };
}

/**
 * Le libellé d'un tronçon : sa longueur pour une marge ou un écart ; pour un
 * groupe, ses cases et son carreau, `1 × 38.1`, et dès qu'il en a plusieurs sa
 * longueur, `7 × 38.1 = 267.0`, pour ne pas reporter sept fois l'arrondi.
 */
export function spanLabel({ from, to, cell }: Span): string {
  const length = to - from;
  if (cell === undefined) return cote(length);
  const count = Math.round(length / cell);
  return count > 1 ? `${count} × ${cote(cell)} = ${cote(length)}` : `1 × ${cote(cell)}`;
}

/** La ligne des cotes, sous la feuille. */
export function measuresLine(
  layout: SheetLayout & { groups: Sheet },
  { block, gap, underLintel }: Measures,
): string {
  const smaller = layout.groups
    .filter((group) => group.scale !== 1)
    .map((group) => `, ${cote(layout.cell / group.scale)} mm pour ${groupLabel(group)}`);
  const parts = [
    `marges : haut ${cote(block.top)} · droite ${cote(layout.width - block.right)} · bas ${cote(layout.height - block.bottom)} · gauche ${cote(block.left)} mm`,
    `carreau ${cote(layout.cell)} mm${smaller.join("")}`,
  ];
  if (gap !== null) parts.push(`écart ${cote(gap)} mm`);
  if (underLintel !== null) parts.push(`colonnes à ${cote(underLintel)} mm sous le 橫批`);
  return parts.join(" · ");
}
