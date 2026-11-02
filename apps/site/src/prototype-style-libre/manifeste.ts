/*
 * PROTOTYPE — jetable (branche prototype/style-libre-accueil, jamais sur main).
 * Le manifeste lu tel quel dans docs/sources, sans recopie : une ligne du
 * tableau `原文 | traduction` par paire.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = fileURLToPath(
  new URL("../../../../docs/sources/shan-shan-zi-you-shu-fa.md", import.meta.url),
);

export type Paire = { zh: string; fr: string };

export function manifeste(): Paire[] {
  return readFileSync(SOURCE, "utf8")
    .split("\n")
    .filter(
      (line) => line.startsWith("| ") && !line.startsWith("| 原文") && !line.startsWith("| ---"),
    )
    .map((line) => {
      const [zh, fr] = line.slice(2, -2).split(" | ");
      return { zh: zh!.trim(), fr: fr!.trim() };
    });
}

export const TITRE_ZH = "山山自由书法：中国书法的第六体";
export const TITRE_FR =
  "Calligraphie libre de Shanshan : le sixième style de la calligraphie chinoise";
export const SIGNATURE = "孙山山 · 于巴黎 · 2004 年 7 月";

/** Les six pas, pour la variante C : les cinq du glossaire, puis le sixième. */
export const PAS = [
  { zh: "楷書", fr: "régulier" },
  { zh: "行書", fr: "courant" },
  { zh: "行草", fr: "grand courant" },
  { zh: "草書", fr: "cursif" },
  { zh: "狂草", fr: "cursive folle" },
  { zh: "自由", fr: "libre" },
];
