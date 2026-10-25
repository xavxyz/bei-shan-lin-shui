import * as fontkit from "fontkit";
import { describe, expect, it } from "vitest";
import { loadContent, type Content } from "@bsls/content";
import { writeFixtureTree } from "@bsls/content/test-support";
import { publishedTexts, subsetSiteFont } from "./index.js";

const piece = {
  title: "說劍",
  slug: "shuo-jian",
  projects: ["hong-lou-meng"],
  status: "idea",
  source: { author: "蘇軾", work: "東坡集", dynasty: "宋", full_text: "書畫\n詩詞" },
  versions: [
    { id: "v1", date: "2025-02-04", format: "[(1x2)]", columns: ["龍飛"] },
    { id: "v2", date: "2026-06-21", format: "[(2x2)]", columns: ["鳳舞", "雲開"] },
  ],
  published: true,
};

const project = { title: "紅樓夢" };

async function load(pieceOverrides: object = {}): Promise<Content> {
  const root = await writeFixtureTree({
    projects: { "hong-lou-meng": project },
    pieces: { "shuo-jian": { ...piece, ...pieceOverrides } },
  });
  // La pièce n'a pas d'image : on charge tout, comme le mode admin.
  const result = await loadContent(root, { includeUnpublished: true });
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content;
}

const open = (woff2: Uint8Array) => fontkit.create(Buffer.from(woff2)) as fontkit.Font;

const undrawn = (font: fontkit.Font, text: string) =>
  [...text].filter((character) => !font.hasGlyphForCodePoint(character.codePointAt(0)!));

describe("la police des textes publiés", () => {
  it("dessine les titres, les colonnes, le texte intégral et l'attribution, en traditionnel et en simplifié", async () => {
    const font = open(await subsetSiteFont(publishedTexts(await load())));

    expect(undrawn(font, "說劍说剑")).toEqual([]); // titre de la pièce
    expect(undrawn(font, "紅樓夢红楼梦")).toEqual([]); // titre du projet
    expect(undrawn(font, "龍飛龙飞鳳舞凤舞雲開云开")).toEqual([]); // colonnes de chaque version
    expect(undrawn(font, "書畫书画詩詞诗词")).toEqual([]); // texte intégral
    expect(undrawn(font, "蘇軾苏轼東坡集东宋")).toEqual([]); // attribution
  });

  it("dessine la date chinoise de chaque version", async () => {
    const content = await load();
    const font = open(await subsetSiteFont(publishedTexts(content)));

    const dates = content.pieces[0]!.versions.map((version) => version.chineseDate).join("");
    expect(dates).not.toBe("");
    expect(undrawn(font, dates)).toEqual([]);
  });

  it("casse sur un caractère que TW-Kai n'a pas, en nommant la pièce et le caractère", async () => {
    const content = await load({
      versions: [{ id: "v1", date: "2026-06-21", format: "[(1x2)]", columns: ["困𮌖"] }],
    });

    await expect(subsetSiteFont(publishedTexts(content))).rejects.toThrow(
      /pieces\/shuo-jian\/piece\.md \(說劍\).*𮌖/,
    );
  });
});
