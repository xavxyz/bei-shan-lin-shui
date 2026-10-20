import { readFile } from "node:fs/promises";
import * as fontkit from "fontkit";
import subsetFont from "subset-font";

/**
 * Les 體 dans lesquels s'écrit le modèle d'une grille, chacun d'une police
 * libre rangée dans `packages/grilles/fonts/` (ADR 0003). Le premier est le
 * modèle par défaut, et le repli des autres.
 */
export const MODELS = [
  { key: "kai", label: "楷 standard", file: "TW-Kai-98_1.ttf" },
  { key: "yan", label: "顏體", file: "wt064.ttf" },
  { key: "wenkai", label: "文楷", file: "LXGWWenKaiTC-Regular.ttf" },
] as const;

export type ModelKey = (typeof MODELS)[number]["key"];

/** Un 體 prêt pour la page : sa police réduite aux caractères de la pièce, et ce qu'il faut en savoir. */
export type Model = {
  key: ModelKey;
  label: string;
  /** woff2, en base64. */
  font: string;
  notes: string[];
};

type LoadedFont = { data: Buffer; font: fontkit.Font; glyphs: Map<number, number[]> };

const loaded = new Map<string, Promise<LoadedFont>>();

/** Les idéogrammes de compatibilité doublent un caractère sans en être une autre forme. */
const compatibility = (codePoint: number) =>
  (codePoint >= 0xf900 && codePoint <= 0xfaff) || (codePoint >= 0x2f800 && codePoint <= 0x2fa1f);

/** Une police, lue une fois par processus, avec les caractères que porte chacun de ses dessins. */
function load(file: string): Promise<LoadedFont> {
  let pending = loaded.get(file);
  if (!pending) {
    pending = readFile(new URL(`../fonts/${file}`, import.meta.url)).then((data) => {
      const font = fontkit.create(data) as fontkit.Font;
      const glyphs = new Map<number, number[]>();
      for (const codePoint of font.characterSet) {
        if (compatibility(codePoint)) continue;
        const id = font.glyphForCodePoint(codePoint).id;
        glyphs.set(id, [...(glyphs.get(id) ?? []), codePoint]);
      }
      return { data, font, glyphs };
    });
    loaded.set(file, pending);
  }
  return pending;
}

const has = ({ font }: LoadedFont, character: string) =>
  font.hasGlyphForCodePoint(character.codePointAt(0)!);

/** Un caractère, ou plusieurs : `il` ou `ils` selon le compte. */
const pronoun = (characters: string[]) =>
  characters.length > 1 ? "ils s'affichent" : "il s'affiche";

/**
 * Les 體 du modèle pour un texte : chaque police réduite à ses caractères, et
 * pour chacune les caractères qu'elle n'a pas, ou qu'elle dessine comme une
 * autre forme.
 */
export async function prepareModels(text: string): Promise<Model[]> {
  const characters = [...new Set(text)].filter((character) => character.trim() !== "");
  const fonts = await Promise.all(MODELS.map((model) => load(model.file)));
  const nowhere = characters.filter((character) => fonts.every((font) => !has(font, character)));

  return Promise.all(
    MODELS.map(async (model, index) => {
      const font = fonts[index]!;
      const missing = characters.filter((c) => !has(font, c) && !nowhere.includes(c));
      const replaced = index > 0 ? missing.filter((c) => has(fonts[0]!, c)) : [];
      const lost = missing.filter((c) => !replaced.includes(c));
      const notes: string[] = [];
      if (replaced.length > 0) {
        notes.push(
          `${model.label} n'a pas ${replaced.join(" ")} : ${pronoun(replaced)} en ${MODELS[0].label}`,
        );
      }
      if (lost.length > 0) {
        notes.push(
          `${model.label} n'a pas ${lost.join(" ")} : ${pronoun(lost)} dans une police du système`,
        );
      }
      if (nowhere.length > 0) {
        notes.push(
          `aucun 體 n'a ${nowhere.join(" ")} : ${pronoun(nowhere)} dans une police du système`,
        );
      }
      for (const character of characters) {
        if (!has(font, character)) continue;
        const others = (
          font.glyphs.get(font.font.glyphForCodePoint(character.codePointAt(0)!).id) ?? []
        )
          .map((codePoint) => String.fromCodePoint(codePoint))
          .filter((other) => other !== character);
        if (others.length > 0) {
          notes.push(
            `${character} partage son dessin avec ${others.join(" ")} : la forme imprimée peut différer du texte`,
          );
        }
      }
      const subset = await subsetFont(font.data, characters.join(""), { targetFormat: "woff2" });
      return { key: model.key, label: model.label, font: subset.toString("base64"), notes };
    }),
  );
}
