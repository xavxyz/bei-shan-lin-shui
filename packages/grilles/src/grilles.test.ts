import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { writeTree } from "@bsls/content/test-support";
import { generateGrids, summarize, type GridRequest } from "./index.js";

type Box = { x: number; y: number; width: number; height: number };

type PrintedSheet = {
  width: number;
  height: number;
  /**
   * Chaque rang (colonne ou ligne de cases), en millimètres, dans l'ordre des groupes :
   * de droite à gauche, et de haut en bas à bord droit égal.
   */
  ranks: Box[];
  /** Le texte de chaque rang : une colonne lue de haut en bas, une ligne de droite à gauche. */
  text: string[];
};

const inside = (glyph: { x: number; y: number }, box: Box) =>
  glyph.x > box.x && glyph.x < box.x + box.width && glyph.y > box.y && glyph.y < box.y + box.height;

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
        const ranks = [
          ...figure.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g),
        ]
          .map(([, x, y, w, h]) => ({ x: +x!, y: +y!, width: +w!, height: +h! }))
          .sort((a, b) => b.x + b.width - (a.x + a.width) || a.y - b.y);
        const glyphs = [
          ...figure
            .split('class="characters"')[1]!
            .matchAll(/<text x="([\d.]+)" y="([\d.]+)">(.)<\/text>/gu),
        ].map(([, x, y, character]) => ({ x: +x!, y: +y!, character: character! }));
        const text = ranks.map((box) =>
          glyphs
            .filter((glyph) => inside(glyph, box))
            .sort((a, b) => (box.height >= box.width ? a.y - b.y : b.x - a.x))
            .map((glyph) => glyph.character)
            .join(""),
        );
        return { width: width!, height: height!, ranks, text };
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
    expect(sheets.A!.map((sheet) => sheet.ranks.length)).toEqual([10, 4]);
    expect(sheets.B!.map((sheet) => sheet.ranks.length)).toEqual([1, 4, 4, 1]);
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

  it("lit l'orientation de chaque groupe, v par défaut, et refuse un suffixe inconnu en disant où", async () => {
    const { sheets } = await grids(piece("2x5", LONG_HU_GE), {
      slug: "shan-ju",
      formats: ["[(1x3, 2x7)]", "[(1x3v, 2x7V)]"],
    });
    expect(sheets.B).toEqual(sheets.A);

    const result = await generateGrids({
      root: await writeTree(piece("[(1x7, 1x4d, 1x7)]", LONG_HU_GE)),
      slug: "shan-ju",
    });
    expect(!result.ok && result.message).toContain(
      "« [(1x7, 1x4d, 1x7)] » — orientation « d » inconnue, attendu « v » ou « h » à la position 10",
    );
  });
});

describe("le groupe horizontal", () => {
  const PAI_LOU = ["假作真時真亦假", "太虛幻境", "無為有處有還無"];

  it("pose le 橫批 sur le linteau, les colonnes pendant sous lui, et laisse vide le passage", async () => {
    const { sheets } = await grids(piece("[(1x7, 1x4h, 1x7)]", PAI_LOU), { slug: "shan-ju" });
    const [right, lintel, left] = sheets.A![0]!.ranks;
    const cell = right!.width;

    expect(right!.height).toBeCloseTo(7 * cell, 1);
    expect(left!.height).toBeCloseTo(7 * cell, 1);
    expect(lintel!.width).toBeCloseTo(4 * cell, 1);
    expect(lintel!.height).toBeCloseTo(cell, 1);
    // les colonnes commencent un demi-carreau sous le 橫批
    expect(right!.y - (lintel!.y + lintel!.height)).toBeCloseTo(cell / 2, 1);
    expect(left!.y).toBeCloseTo(right!.y, 1);
    // centré entre les colonnes, un demi-carreau de chaque côté
    expect(right!.x - (lintel!.x + lintel!.width)).toBeCloseTo(cell / 2, 1);
    expect(lintel!.x - (left!.x + left!.width)).toBeCloseTo(cell / 2, 1);
    // aucune case sous le 橫批 : le passage de l'arche
    expect(sheets.A![0]!.ranks).toHaveLength(3);
  });

  it("y fait tomber le texte dans l'ordre de lecture, le 橫批 de droite à gauche", async () => {
    const { sheets } = await grids(piece("[(1x7, 1x4h, 1x7)]", PAI_LOU), { slug: "shan-ju" });
    expect(sheets.A![0]!.text).toEqual(PAI_LOU);
  });

  it("empile ses lignes de haut en bas", async () => {
    const { sheets } = await grids(piece("[(1x3, 2x2h, 1x3)]", ["紫陽云", "收拾身心", "降伏龍"]), {
      slug: "shan-ju",
    });
    const [, first, second] = sheets.A![0]!.ranks;
    expect(second!.y - first!.y).toBeCloseTo(first!.height, 1);
    expect(sheets.A![0]!.text).toEqual(["紫陽云", "收拾", "身心", "降伏龍"]);
  });

  it("fait pendre toutes les colonnes de la feuille sous le plus haut groupe horizontal, où qu'il soit", async () => {
    const { sheets } = await grids(piece("2x5", LONG_HU_GE), {
      slug: "shan-ju",
      formats: ["[(1x4h, 2x7)]", "[(2x3h, 1x7, 1x2h)]"],
    });

    const [lintel, ...columns] = sheets.A![0]!.ranks;
    const cell = lintel!.height;
    for (const column of columns) {
      expect(column.y - (lintel!.y + cell)).toBeCloseTo(cell / 2, 1);
    }

    const [first, second, column, last] = sheets.B![0]!.ranks;
    expect(second!.y - first!.y).toBeCloseTo(first!.height, 1);
    expect(last!.y).toBeCloseTo(first!.y, 1);
    // sous les deux lignes du plus haut, et non sous la ligne unique du dernier
    expect(column!.y - (second!.y + second!.height)).toBeCloseTo(first!.height / 2, 1);
  });

  it("dit l'orientation de chaque groupe dans le résumé", async () => {
    const { summary } = await grids(piece("2x5", PAI_LOU), {
      slug: "shan-ju",
      formats: ["[(1x7, 1x4h, 1x7)]", "[(2x7)]"],
    });
    expect(summary).toContain(
      "feuille 1 · portrait · carreau 24.3 mm · 1x7 vertical, 1x4 horizontal, 1x7 vertical · 18 caractères",
    );
    expect(summary).toContain(
      "feuille 1 · portrait · carreau 38.1 mm · 2 colonnes · 14 caractères",
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
      const { ranks, width, height } = sheet;
      expect(Math.min(...ranks.map((box) => box.x))).toBeGreaterThanOrEqual(25 - 0.01);
      expect(width - Math.max(...ranks.map((box) => box.x + box.width))).toBeGreaterThanOrEqual(
        15 - 0.01,
      );
      expect(Math.min(...ranks.map((box) => box.y))).toBeGreaterThanOrEqual(15 - 0.01);
      expect(height - Math.max(...ranks.map((box) => box.y + box.height))).toBeGreaterThanOrEqual(
        15 - 0.01,
      );
    }
  });

  it("lit de droite à gauche, un demi-carreau entre deux groupes", async () => {
    const { sheets } = await grids(piece("[(1x3, 2x7)]", LONG_HU_GE), { slug: "shan-ju" });
    const [first, second, third] = sheets.A![0]!.ranks;
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
    expect(summary).not.toContain("du texte,");
  });

  it("signale, quand le texte a autant de colonnes que la grille, celles qui ne tombent pas dans la leur", async () => {
    const { summary, sheets } = await grids(
      piece("[(1x7, 1x4h, 1x7)]", ["太虛幻境", "假作真時真亦假", "無為有處有還無"]),
      { slug: "shan-ju" },
    );
    expect(summary).toContain(
      "les 3 colonnes du texte ne tombent pas une à une dans les 3 de la grille : réordonner le texte ou le format",
    );
    expect(summary).toContain(
      "colonne 1 du texte, 4 caractères (太虛幻境), pour une colonne de 7 cases (feuille 1, groupe 1 · 1x7 vertical)",
    );
    expect(summary).toContain(
      "colonne 2 du texte, 7 caractères (假作真時真亦假), pour une ligne de 4 cases (feuille 1, groupe 2 · 1x4 horizontal)",
    );
    expect(summary).not.toContain("colonne 3 du texte");
    // le texte coule quand même
    expect(sheets.A![0]!.text).toEqual(["太虛幻境假作真", "時真亦假", "無為有處有還無"]);
  });

  it("le signale aussi sans groupe horizontal", async () => {
    const { summary } = await grids(
      piece("[(1x3, 2x7)]", ["紫陽云收拾", "身心", "降伏龍虎心不動"]),
      {
        slug: "shan-ju",
      },
    );
    expect(summary).toContain(
      "colonne 1 du texte, 5 caractères (紫陽云收拾), pour une colonne de 3 cases (feuille 1, groupe 1 · 1x3 vertical)",
    );
    expect(summary).toContain(
      "colonne 2 du texte, 2 caractères (身心), pour une colonne de 7 cases (feuille 1, groupe 2 · 2x7 vertical)",
    );
  });

  it("dit quand le texte n'a pas autant de colonnes que la grille", async () => {
    const { summary } = await grids(piece("[(1x3, 2x7)]", [...LONG_HU_GE, "紫陽"]), {
      slug: "shan-ju",
    });
    expect(summary).toContain(
      "le texte a 4 colonnes, la grille 3 : elles ne tombent pas une à une, reprendre le texte ou le format",
    );
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
