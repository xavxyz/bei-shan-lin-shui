import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import subsetFont from "subset-font";
import { deriveChineseText, pieceFile, projectFile, type Content } from "@bsls/content";
import type { ChineseText } from "@bsls/schema";

/**
 * TW-Kai, la police par défaut des grilles, que le site emprunte sans la
 * recopier (ADR 0003, ADR 0005).
 */
const TW_KAI = new URL("../../grilles/fonts/TW-Kai-98_1.ttf", import.meta.url);

/** La licence de TW-Kai (OFL 1.1), qui accompagne toute copie servie de la police. */
export const TW_KAI_LICENSE = fileURLToPath(
  new URL("../../grilles/fonts/TW-Kai.OFL.txt", import.meta.url),
);

/**
 * La police de secours : 霞鶩文楷 TC, le 文楷 des grilles, pour les caractères
 * des extensions de l'Unicode que TW-Kai ne dessine pas (ADR 0006).
 */
const FALLBACK = new URL("../../grilles/fonts/LXGWWenKaiTC-Regular.ttf", import.meta.url);

/** La licence de la police de secours (OFL 1.1), qui accompagne toute copie servie. */
export const FALLBACK_LICENSE = fileURLToPath(
  new URL("../../grilles/fonts/LXGWWenKaiTC.OFL.txt", import.meta.url),
);

/** Un texte que le site montre, et ce qui le porte : le fichier d'une pièce, d'un projet, ou le site. */
export type PublishedText = { owner: string; text: string };

/**
 * Les textes chinois que le site montre, chacun en traditionnel et en
 * simplifié, rattachés au fichier qui les porte : titres de pièce et de
 * projet, colonnes et date chinoise de chaque version, texte intégral et
 * attribution de la source.
 */
export function publishedTexts(content: Pick<Content, "pieces" | "projects">): PublishedText[] {
  const both = ({ traditional, simplified }: ChineseText) => `${traditional}\n${simplified}`;
  const derived = (traditional: string) => both(deriveChineseText(traditional));

  const pieces = content.pieces.map((piece) => {
    const source = piece.source;
    const texts = [
      both(piece.title),
      ...piece.versions.flatMap((version) => [
        ...version.columns.map(both),
        derived(version.chineseDate),
      ]),
      ...(source?.full_text ? [both(source.full_text)] : []),
      ...[source?.author, source?.work, source?.dynasty]
        .filter((text) => text !== undefined)
        .map(derived),
    ];
    return {
      owner: `${pieceFile(piece.slug)} (${piece.title.traditional})`,
      text: texts.join("\n"),
    };
  });
  const projects = content.projects.map((project) => ({
    owner: `${projectFile(project.id)} (${project.title.traditional})`,
    text: both(project.title),
  }));
  return [...pieces, ...projects];
}

/**
 * Les caractères qu'une police du site doit dessiner : tout, sauf les blancs
 * et les emoji (sélecteurs de variante et liants compris), qui restent à la
 * police emoji du système.
 */
const charactersOf = (text: string) =>
  [...text].filter((character) => !/[\s\p{Extended_Pictographic}‍︎️]/u.test(character));

/** Une police lue sur le disque, et ce qu'elle dessine. */
async function openFont(file: URL) {
  const data = await readFile(file);
  const font = fontkit.create(data) as fontkit.Font;
  return {
    data,
    draws: (character: string) => font.hasGlyphForCodePoint(character.codePointAt(0)!),
  };
}

/** Les polices que le site sert, réduites aux caractères publiés, en woff2. */
export type SiteFonts = {
  twKai: Buffer;
  /**
   * La police de secours, réduite aux caractères que TW-Kai ne dessine pas,
   * dans l'ordre de leur première apparition ; absente si TW-Kai dessine tout.
   */
  fallback?: { font: Buffer; characters: string };
};

/**
 * TW-Kai réduite aux caractères des textes donnés, et la police de secours
 * réduite à ceux que TW-Kai ne dessine pas. Un caractère qu'aucune des deux
 * ne dessine les fait échouer, en nommant le caractère et ce qui le porte :
 * le site n'écrit jamais une case vide, ni dans une police du système
 * (ADR 0005, ADR 0006).
 */
export async function subsetSiteFonts(texts: PublishedText[]): Promise<SiteFonts> {
  const twKai = await openFont(TW_KAI);
  const beyondTwKai = new Map<string, Set<string>>();
  for (const { owner, text } of texts) {
    for (const character of charactersOf(text)) {
      if (twKai.draws(character)) continue;
      beyondTwKai.set(owner, (beyondTwKai.get(owner) ?? new Set()).add(character));
    }
  }

  const characters = new Set(texts.flatMap(({ text }) => charactersOf(text)));
  const twKaiCharacters = [...characters].filter(twKai.draws).join("");
  const twKaiSubset = await subsetFont(twKai.data, twKaiCharacters, { targetFormat: "woff2" });
  if (beyondTwKai.size === 0) return { twKai: twKaiSubset };

  const fallback = await openFont(FALLBACK);
  const undrawn = [...beyondTwKai]
    .map(
      ([owner, characters]) => [owner, [...characters].filter((c) => !fallback.draws(c))] as const,
    )
    .filter(([, characters]) => characters.length > 0);
  if (undrawn.length > 0) {
    const lines = undrawn.map(([owner, characters]) => `  ${owner} : ${characters.join(" ")}`);
    throw new Error(
      `Ni TW-Kai ni sa police de secours (霞鶩文楷 TC) ne dessinent ces caractères :\n${lines.join("\n")}`,
    );
  }

  const fallbackCharacters = [
    ...new Set([...beyondTwKai.values()].flatMap((set) => [...set])),
  ].join("");
  return {
    twKai: twKaiSubset,
    fallback: {
      font: await subsetFont(fallback.data, fallbackCharacters, { targetFormat: "woff2" }),
      characters: fallbackCharacters,
    },
  };
}
