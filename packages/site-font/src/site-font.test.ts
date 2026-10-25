import * as fontkit from "fontkit";
import { describe, expect, it } from "vitest";
import { subsetSiteFont } from "./index.js";

const open = (woff2: Uint8Array) => fontkit.create(Buffer.from(woff2)) as fontkit.Font;

const draws = (font: fontkit.Font, character: string) =>
  font.hasGlyphForCodePoint(character.codePointAt(0)!);

describe("subsetSiteFont", () => {
  it("rend une TW-Kai en woff2 qui dessine chacun des caractères des textes, et rien d'autre", async () => {
    const font = open(
      await subsetSiteFont([
        { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急" },
        { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急\n慢慢来，丙午立夏" },
        { owner: "l'en-tête du site", text: "背山臨水" },
      ]),
    );

    expect(font.familyName).toBe("TW-Kai");
    for (const character of "莫性急慢来，丙午立夏背山臨水") {
      expect(draws(font, character), character).toBe(true);
    }
    expect(draws(font, "永")).toBe(false);
  });

  it("refuse un caractère que TW-Kai n'a pas, en nommant le caractère et ce qui le porte", async () => {
    const subset = subsetSiteFont([
      { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急" },
      { owner: "pieces/kun/piece.md", text: "困𮌖" },
      { owner: "projects/zhong-he-ji.yaml", text: "中和集𨿽" },
    ]);

    await expect(subset).rejects.toThrow(/pieces\/kun\/piece\.md.*𮌖/);
    await expect(subset).rejects.toThrow(/projects\/zhong-he-ji\.yaml.*𨿽/);
    await expect(subset).rejects.not.toThrow(/mo-xing-ji/);
  });

  it("ne demande pas de dessin pour les blancs : espaces, sauts de ligne", async () => {
    const font = open(
      await subsetSiteFont([{ owner: "pieces/mo-xing-ji/piece.md", text: "莫性急\n\t慢慢来　" }]),
    );

    expect(draws(font, "慢")).toBe(true);
  });

  it("laisse les emoji d'un titre à la police emoji du système", async () => {
    const font = open(
      await subsetSiteFont([
        { owner: "pieces/bai-zi-bei/piece.md", text: "📜 百字碑" },
        { owner: "pieces/pang-xie-feng-ci/piece.md", text: "螃蟹諷刺 🦀 ✍️" },
      ]),
    );

    expect(draws(font, "碑")).toBe(true);
    expect(draws(font, "📜")).toBe(false);
  });
});
