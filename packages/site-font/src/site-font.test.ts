import * as fontkit from "fontkit";
import { describe, expect, it } from "vitest";
import { subsetSiteFonts } from "./index.js";

const open = (woff2: Uint8Array) => fontkit.create(Buffer.from(woff2)) as fontkit.Font;

const draws = (font: fontkit.Font, character: string) =>
  font.hasGlyphForCodePoint(character.codePointAt(0)!);

describe("subsetSiteFonts", () => {
  it("rend une TW-Kai en woff2 qui dessine chacun des caractères des textes, et rien d'autre", async () => {
    const fonts = await subsetSiteFonts([
      { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急" },
      { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急\n慢慢来，丙午立夏" },
      { owner: "l'en-tête du site", text: "背山臨水" },
    ]);
    const font = open(fonts.twKai);

    expect(font.familyName).toBe("TW-Kai");
    for (const character of "莫性急慢来，丙午立夏背山臨水") {
      expect(draws(font, character), character).toBe(true);
    }
    expect(draws(font, "永")).toBe(false);
    expect(fonts.fallback).toBeUndefined();
  });

  it("demande à la police de secours, réduite à eux, les caractères que TW-Kai n'a pas", async () => {
    const fonts = await subsetSiteFonts([
      { owner: "pieces/tai-quan-zhu-shan-an/piece.md", text: "太𫝑" },
      { owner: "pieces/lu/piece.md", text: "𬬻" },
    ]);

    expect(draws(open(fonts.twKai), "太")).toBe(true);
    expect(fonts.fallback?.characters).toBe("𫝑𬬻");
    const fallback = open(fonts.fallback!.font);
    expect(fallback.familyName).toBe("LXGW WenKai TC");
    expect(draws(fallback, "𫝑")).toBe(true);
    expect(draws(fallback, "𬬻")).toBe(true);
    expect(draws(fallback, "太")).toBe(false);
  });

  it("refuse un caractère que ni TW-Kai ni la secours ne dessine, en nommant le caractère et ce qui le porte", async () => {
    const subset = subsetSiteFonts([
      { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急" },
      { owner: "pieces/tai-quan-zhu-shan-an/piece.md", text: "太𫝑" },
      { owner: "pieces/kun/piece.md", text: "困𮌖" },
      { owner: "projects/zhong-he-ji.yaml", text: "中和集𨿽" },
    ]);

    await expect(subset).rejects.toThrow(/pieces\/kun\/piece\.md.*𮌖/);
    await expect(subset).rejects.toThrow(/projects\/zhong-he-ji\.yaml.*𨿽/);
    await expect(subset).rejects.not.toThrow(/mo-xing-ji/);
    await expect(subset).rejects.not.toThrow(/tai-quan-zhu-shan-an/);
  });

  it("ne demande pas de dessin pour les blancs : espaces, sauts de ligne", async () => {
    const { twKai } = await subsetSiteFonts([
      { owner: "pieces/mo-xing-ji/piece.md", text: "莫性急\n\t慢慢来　" },
    ]);

    expect(draws(open(twKai), "慢")).toBe(true);
  });

  it("laisse les emoji d'un titre à la police emoji du système", async () => {
    const fonts = await subsetSiteFonts([
      { owner: "pieces/bai-zi-bei/piece.md", text: "📜 百字碑" },
      { owner: "pieces/pang-xie-feng-ci/piece.md", text: "螃蟹諷刺 🦀 ✍️" },
    ]);
    const font = open(fonts.twKai);

    expect(draws(font, "碑")).toBe(true);
    expect(draws(font, "📜")).toBe(false);
    expect(fonts.fallback).toBeUndefined();
  });
});
