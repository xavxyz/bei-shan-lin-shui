import { Converter } from "opencc-js";
import { pinyin } from "pinyin-pro";
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
