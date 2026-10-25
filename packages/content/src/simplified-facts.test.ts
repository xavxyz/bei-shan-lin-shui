import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content.js";
import { writeFixtureTree } from "./test-support/fixture-tree.js";

/*
 * Les faits d'une pièce se lisent en simplifié, comme ses lignes : la date
 * chinoise et l'attribution de la source sont dérivées au build, jamais stockées.
 */

const piece = {
  title: "處暑",
  slug: "chu-shu",
  status: "idea",
  versions: [{ id: "v1", date: "2026-08-30", format: "1x2", columns: ["處暑"] }],
  published: true,
};

async function loadPiece(overrides: object = {}) {
  const root = await writeFixtureTree({ pieces: { "chu-shu": { ...piece, ...overrides } } });
  // La pièce n'a pas d'image : on charge tout, comme le mode admin.
  const result = await loadContent(root, { includeUnpublished: true });
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content.pieces[0]!;
}

describe("faits en simplifié", () => {
  it("donne la date chinoise en simplifié, à côté du traditionnel", async () => {
    const version = (await loadPiece()).versions[0]!;

    expect(version.chineseDate).toBe("丙午處暑");
    expect(version.chineseDateSimplified).toBe("丙午处暑");
  });

  it("donne l'attribution de la source, auteur, œuvre puis dynastie, en simplifié", async () => {
    const loaded = await loadPiece({
      source: { author: "李道純", work: "中和集", dynasty: "元" },
    });

    expect(loaded.source?.attribution?.traditional).toBe("李道純 · 中和集 · 元");
    expect(loaded.source?.attribution?.simplified).toBe("李道纯 · 中和集 · 元");
  });

  it("n'attribue que ce que la source nomme", async () => {
    const loaded = await loadPiece({ source: { work: "中和集" } });

    expect(loaded.source?.attribution?.simplified).toBe("中和集");
  });

  it("ne fabrique aucune attribution à une source qui ne nomme personne", async () => {
    const loaded = await loadPiece({ source: { full_text: "處暑。" } });

    expect(loaded.source?.attribution).toBeUndefined();
  });
});
