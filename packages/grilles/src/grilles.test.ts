import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { writeTree } from "@bsls/content/test-support";
import { generateGrids, summarize, type GridRequest } from "./index.js";

type PrintedSheet = {
  width: number;
  height: number;
  /** Chaque colonne, en millimètres, dans l'ordre de lecture : de droite à gauche. */
  columns: { x: number; y: number; width: number; height: number }[];
  /** Le texte de chaque colonne. */
  text: string[];
};

/** Les feuilles telles que la page les imprime, par format candidat. */
function printedSheets(html: string): Record<string, PrintedSheet[]> {
  const candidates: Record<string, PrintedSheet[]> = {};
  for (const section of html.split('<section class="candidate"').slice(1)) {
    const key = /data-candidate="(\w+)"/.exec(section)![1]!;
    candidates[key] = section
      .split("<figure")
      .slice(1)
      .map((figure) => {
        const [, width, height] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(figure)!.map(Number);
        const columns = [
          ...figure.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g),
        ]
          .map(([, x, y, w, h]) => ({ x: +x!, y: +y!, width: +w!, height: +h! }))
          .sort((a, b) => b.x - a.x);
        const glyphs = [
          ...figure
            .split('class="characters"')[1]!
            .matchAll(/<text x="([\d.]+)" y="([\d.]+)">(.)<\/text>/gu),
        ].map(([, x, y, character]) => ({ x: +x!, y: +y!, character: character! }));
        const text = columns.map((box) =>
          glyphs
            .filter((glyph) => glyph.x > box.x && glyph.x < box.x + box.width)
            .sort((a, b) => a.y - b.y)
            .map((glyph) => glyph.character)
            .join(""),
        );
        return { width: width!, height: height!, columns, text };
      });
  }
  return candidates;
}

const piece = (format: string, columns: string[]) => ({
  "content/pieces/shan-ju/piece.md": `---\n${stringify({
    title: "山居秋暝",
    slug: "shan-ju",
    status: "idea",
    versions: [{ id: "v1", date: "2026-03-04", format, columns }],
  })}---\n`,
});

async function grids(files: Record<string, string>, request: Omit<GridRequest, "root">) {
  const result = await generateGrids({ root: await writeTree(files), ...request });
  if (!result.ok) throw new Error(result.message);
  return {
    summary: summarize(result.candidates),
    html: result.html,
    sheets: printedSheets(result.html),
  };
}

const LONG_HU_GE = ["紫陽云", "收拾身心謂之", "降伏龍虎心不動"];

describe("la notation des formats", () => {
  it("fait une feuille de chaque parenthèse, ses groupes séparés par des virgules", async () => {
    const { sheets } = await grids(piece("2x5", LONG_HU_GE), {
      slug: "shan-ju",
      formats: ["[(1x3, 9x7), (1x4, 3x7)]", "[(1x3), (4x5), (4x5), (1x3)]"],
    });
    expect(sheets.A!.map((sheet) => sheet.columns.length)).toEqual([10, 4]);
    expect(sheets.B!.map((sheet) => sheet.columns.length)).toEqual([1, 4, 4, 1]);
  });

  it("refuse l'ancienne notation, et dit comment l'écrire", async () => {
    const result = await generateGrids({
      root: await writeTree(piece("1x3 + 2*(4x5) + 1x3", LONG_HU_GE)),
      slug: "shan-ju",
    });
    expect(!result.ok && result.message).toContain("1x3 + 2*(4x5) + 1x3");
    expect(!result.ok && result.message).toContain("[(1x3, 9x7), (1x4, 3x7)]");
  });

  it("refuse ce qui n'est pas une grille, en disant où", async () => {
    const result = await generateGrids({
      root: await writeTree(piece("A4 vertical", LONG_HU_GE)),
      slug: "shan-ju",
    });
    expect(!result.ok && result.message).toContain(
      "« A4 vertical » — attendu « [ » à la position 1",
    );
  });
});

describe("la mise en page sur A4", () => {
  it("prend pour chaque feuille l'orientation qui donne les plus grands carreaux", async () => {
    const { summary, sheets } = await grids(piece("2x5", LONG_HU_GE), {
      slug: "shan-ju",
      formats: ["[(1x3, 9x7), (1x4, 3x7)]"],
    });
    expect(summary).toContain("feuille 1 · paysage · carreau 24.5 mm · 10 colonnes");
    expect(summary).toContain("feuille 2 · portrait · carreau 37.8 mm · 4 colonnes");
    expect(sheets.A!.map((sheet) => [sheet.width, sheet.height])).toEqual([
      [297, 210],
      [210, 297],
    ]);
  });

  it("tient le bloc dans les marges : 15 mm, et 25 mm à gauche pour le 落款", async () => {
    const { sheets } = await grids(piece("2x5", LONG_HU_GE), {
      slug: "shan-ju",
      formats: ["[(13x7)]", "[(1x3, 9x7, 1x4, 3x7)]", "[(2x7)]", "[(1x4)]"],
    });
    for (const sheet of Object.values(sheets).flat()) {
      const { columns, width, height } = sheet;
      expect(Math.min(...columns.map((box) => box.x))).toBeGreaterThanOrEqual(25 - 0.01);
      expect(width - Math.max(...columns.map((box) => box.x + box.width))).toBeGreaterThanOrEqual(
        15 - 0.01,
      );
      expect(Math.min(...columns.map((box) => box.y))).toBeGreaterThanOrEqual(15 - 0.01);
      expect(height - Math.max(...columns.map((box) => box.y + box.height))).toBeGreaterThanOrEqual(
        15 - 0.01,
      );
    }
  });

  it("lit de droite à gauche, un demi-carreau entre deux groupes", async () => {
    const { sheets } = await grids(piece("[(1x3, 2x7)]", LONG_HU_GE), { slug: "shan-ju" });
    const [first, second, third] = sheets.A![0]!.columns;
    const cell = first!.width;
    expect(first!.x - second!.x).toBeCloseTo(1.5 * cell, 1);
    expect(second!.x - third!.x).toBeCloseTo(cell, 1);
    expect(first!.height).toBeCloseTo(3 * cell, 1);
  });
});

describe("le texte dans les cases", () => {
  it("pose les colonnes une à une quand elles correspondent à la grille", async () => {
    const { summary, sheets } = await grids(piece("[(1x3, 2x7)]", LONG_HU_GE), { slug: "shan-ju" });
    expect(sheets.A![0]!.text).toEqual(LONG_HU_GE);
    expect(summary).toContain("les colonnes du texte tombent une à une");
    expect(summary).toContain("1 cases restent vides");
  });

  it("fait couler le texte sans ponctuation, prévient du contresens, et dit ce qui déborde", async () => {
    const { summary, sheets } = await grids(piece("[(2x3)]", ["空山新雨後，", "天氣晚來秋。"]), {
      slug: "shan-ju",
    });
    expect(sheets.A![0]!.text).toEqual(["空山新", "雨後天"]);
    expect(summary).toContain("contresens");
    expect(summary).toContain("ne tient pas : 4 caractères (氣晚來秋)");
  });
});

describe("les grilles d'une pièce", () => {
  it("lisent une pièce du plan d'import, et disent d'où elle vient", async () => {
    const { summary, html } = await grids(
      {
        "content/pieces/.keep": "",
        "imports/notion-2026-08-23.plan.yaml": stringify({
          projects: [],
          pieces: [
            {
              slug: "long-hu-ge",
              title: "《龍虎歌》",
              status: "in-progress",
              projects: [],
              published: false,
              versions: [
                { id: "v1", date: "2026-01-26", format: "[(13x7)]", columns: ["紫陽云收拾身心"] },
              ],
            },
          ],
        }),
      },
      { slug: "long-hu-ge", formats: ["[(13x7)]", "[(1x3, 9x7), (1x4, 3x7)]"] },
    );

    expect(summary).toContain("A · [(13x7)]");
    expect(summary).toContain("B · [(1x3, 9x7), (1x4, 3x7)]");
    expect(html).toContain("imports/notion-2026-08-23.plan.yaml");
  });

  it("lisent une pièce du contenu, au format et aux colonnes de sa dernière version", async () => {
    const { summary, sheets } = await grids(
      {
        "content/pieces/shan-ju/piece.md": `---\n${stringify({
          title: "山居秋暝",
          slug: "shan-ju",
          status: "idea",
          versions: [
            { id: "v1", date: "2026-03-04", format: "A4 vertical", columns: ["空山"] },
            {
              id: "v2",
              date: "2026-04-04",
              format: "[(2x5)]",
              columns: ["空山新雨後", "天氣晚來秋"],
            },
          ],
        })}---\n`,
      },
      { slug: "shan-ju" },
    );

    expect(summary).toContain("A · [(2x5)]");
    expect(sheets.A![0]!.text).toEqual(["空山新雨後", "天氣晚來秋"]);
  });

  it("refusent un plan invalide plutôt que de le passer sous silence", async () => {
    const result = await generateGrids({
      root: await writeTree({
        "content/pieces/.keep": "",
        "imports/notion-2026-08-23.plan.yaml": stringify({
          projects: [],
          pieces: [{ slug: "long-hu-ge" }],
        }),
      }),
      slug: "long-hu-ge",
    });
    expect(!result.ok && result.message).toContain(
      "plan invalide : imports/notion-2026-08-23.plan.yaml",
    );
  });

  it("refusent une version sans texte, et une pièce introuvable", async () => {
    const root = await writeTree({
      "content/pieces/shan-ju/piece.md": `---\n${stringify({
        title: "山居秋暝",
        slug: "shan-ju",
        status: "idea",
        versions: [{ id: "v1", date: "2026-03-04", format: "[(2x5)]" }],
      })}---\n`,
    });

    const empty = await generateGrids({ root, slug: "shan-ju" });
    expect(!empty.ok && empty.message).toContain("--texte");
    const missing = await generateGrids({ root, slug: "inconnue" });
    expect(!missing.ok && missing.message).toContain("aucune pièce « inconnue »");
  });
});
