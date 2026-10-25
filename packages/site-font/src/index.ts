import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import * as fontkit from "fontkit";
import subsetFont from "subset-font";
import { pieceFile, projectFile, type Content } from "@bsls/content";
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

/** Un texte que le site montre, et ce qui le porte : le fichier d'une pièce, d'un projet, ou le site. */
export type PublishedText = { owner: string; text: string };

/**
 * Les textes chinois que le site montre, chacun en traditionnel et en
 * simplifié, rattachés au fichier qui les porte : titres de pièce et de
 * projet, colonnes et date chinoise de chaque version, texte intégral et
 * attribution de la source. Ils sont pris tels que le content layer les
 * dérive, jamais redérivés ici.
 */
export function publishedTexts(content: Pick<Content, "pieces" | "projects">): PublishedText[] {
  const both = ({ traditional, simplified }: ChineseText) => `${traditional}\n${simplified}`;

  const pieces = content.pieces.map((piece) => {
    const source = piece.source;
    const texts = [
      both(piece.title),
      ...piece.versions.flatMap((version) => [
        ...version.columns.map(both),
        `${version.chineseDate}\n${version.chineseDateSimplified}`,
      ]),
      ...(source?.full_text ? [both(source.full_text)] : []),
      ...(source?.attribution ? [both(source.attribution)] : []),
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
 * Les caractères que TW-Kai doit dessiner : tout, sauf les blancs et les
 * emoji (sélecteurs de variante et liants compris), qui restent à la police
 * emoji du système.
 */
const charactersOf = (text: string) =>
  [...text].filter((character) => !/[\s\p{Extended_Pictographic}‍︎️]/u.test(character));

/**
 * TW-Kai réduite aux caractères des textes donnés, en woff2. Un caractère que
 * TW-Kai ne dessine pas la fait échouer, en nommant le caractère et ce qui le
 * porte : il n'y a pas de police de repli (ADR 0005).
 */
export async function subsetSiteFont(texts: PublishedText[]): Promise<Buffer> {
  const data = await readFile(TW_KAI);
  const font = fontkit.create(data) as fontkit.Font;
  const draws = (character: string) => font.hasGlyphForCodePoint(character.codePointAt(0)!);

  const missing = new Map<string, Set<string>>();
  for (const { owner, text } of texts) {
    for (const character of charactersOf(text)) {
      if (draws(character)) continue;
      missing.set(owner, (missing.get(owner) ?? new Set()).add(character));
    }
  }
  if (missing.size > 0) {
    const lines = [...missing].map(
      ([owner, characters]) => `  ${owner} : ${[...characters].join(" ")}`,
    );
    throw new Error(
      `TW-Kai ne dessine pas ces caractères, et le site n'a pas de police de repli :\n${lines.join("\n")}`,
    );
  }

  const characters = new Set(texts.flatMap(({ text }) => charactersOf(text)));
  return subsetFont(data, [...characters].join(""), { targetFormat: "woff2" });
}
