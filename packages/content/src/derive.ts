import { Converter } from "opencc-js";
import { pinyin } from "pinyin-pro";
import { SolarDay } from "tyme4ts";
import type { ChineseText } from "@bsls/schema";

const toSimplified = Converter({ from: "tw", to: "cn" });

/**
 * Dérive simplifié et pinyin depuis le traditionnel, seule source de vérité.
 * Rien n'est écrit sur le disque : ces valeurs vivent le temps du build.
 *
 * Les 多音字 sont l'angle mort de la génération automatique : une entrée dans
 * `overrides`, indexée par le texte traditionnel exact, l'emporte sur elle.
 */
export function deriveChineseText(
  traditional: string,
  overrides: Record<string, string> = {},
): ChineseText {
  return {
    traditional,
    simplified: toSimplified(traditional),
    pinyin: overrides[traditional] ?? generatePinyin(traditional),
  };
}

/** Le pinyin est généré ligne à ligne : la mise en colonnes du texte est signifiante. */
function generatePinyin(traditional: string): string {
  return traditional
    .split("\n")
    .map((line) => (line.trim() === "" ? line : pinyin(toSimplified(line))))
    .join("\n");
}

/** Les vingt-quatre jieqi en traditionnel, dans l'ordre de tyme4ts : 冬至 en tête. */
const JIEQI = [
  "冬至",
  "小寒",
  "大寒",
  "立春",
  "雨水",
  "驚蟄",
  "春分",
  "清明",
  "穀雨",
  "立夏",
  "小滿",
  "芒種",
  "夏至",
  "小暑",
  "大暑",
  "立秋",
  "處暑",
  "白露",
  "秋分",
  "寒露",
  "霜降",
  "立冬",
  "小雪",
  "大雪",
] as const;

/**
 * Dérive la date chinoise d'une date stockée (`YYYY-MM-DD`) : l'année en tronc
 * et branche, puis le jieqi en cours ce jour-là (`丙午立夏`). Comme le
 * simplifié, elle n'est jamais stockée.
 *
 * L'année change au 立春, comme sur le papier du calligraphe ; les termes
 * tombent au jour du calendrier chinois, à l'heure de Pékin.
 */
export function deriveChineseDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  const solarDay = SolarDay.fromYmd(year, month, day);
  const stemBranch = solarDay.getSixtyCycleDay().getYear().getName();
  return `${stemBranch}${JIEQI[solarDay.getTerm().getIndex()]}`;
}
