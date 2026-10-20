import { describe, expect, it } from "vitest";
import { stringify } from "yaml";
import { writeTree } from "@bsls/content/test-support";
import { generateGrids, layoutSheet, parseFormat, pourText, type Sheet } from "./index.js";

const sheetsOf = (format: string): Sheet[] => {
  const parsed = parseFormat(format);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.sheets;
};

describe("la notation des formats", () => {
  it("juxtapose les groupes d'une feuille avec +", () => {
    expect(sheetsOf("1x3 + 9x7")).toEqual([
      [
        { columns: 1, rows: 3 },
        { columns: 9, rows: 7 },
      ],
    ]);
  });

  it("fait une feuille de chaque parenthèse", () => {
    expect(sheetsOf("(1x3 + 9x7) + (1x4 + 3x7)")).toEqual([
      [
        { columns: 1, rows: 3 },
        { columns: 9, rows: 7 },
      ],
      [
        { columns: 1, rows: 4 },
        { columns: 3, rows: 7 },
      ],
    ]);
  });

  it("répète une feuille avec k*(…), et fait alors une feuille des groupes nus", () => {
    expect(sheetsOf("1x7 + 4*(2x7)")).toEqual([
      [{ columns: 1, rows: 7 }],
      ...Array.from({ length: 4 }, () => [{ columns: 2, rows: 7 }]),
    ]);
  });

  it("refuse ce qui n'est pas une grille, en disant où", () => {
    const parsed = parseFormat("A4 vertical");
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.message).toContain("A4 vertical");
    expect(parseFormat("4*(2x7) + titre 2x4").ok).toBe(false);
  });
});

describe("la mise en page sur A4", () => {
  it("prend l'orientation qui donne les plus grands carreaux", () => {
    const [wide, narrow] = sheetsOf("(1x3 + 9x7) + (1x4 + 3x7)").map(layoutSheet);
    expect(wide!.orientation).toBe("paysage");
    expect(narrow!.orientation).toBe("portrait");
    expect(narrow!.cell).toBeGreaterThan(wide!.cell);
  });

  it("tient le bloc dans les marges : 15 mm, et 25 mm à gauche pour le 落款", () => {
    for (const format of ["13x7", "1x3 + 9x7 + 1x4 + 3x7", "2x7", "1x4"]) {
      const page = layoutSheet(sheetsOf(format)[0]!);
      const left = Math.min(...page.columns.map((box) => box.x));
      const right = Math.max(...page.columns.map((box) => box.x + page.cell));
      const bottom = Math.max(...page.columns.map((box) => box.y + box.rows * page.cell));
      expect(left).toBeGreaterThanOrEqual(25 - 1e-9);
      expect(page.width - right).toBeGreaterThanOrEqual(15 - 1e-9);
      expect(Math.min(...page.columns.map((box) => box.y))).toBeGreaterThanOrEqual(15 - 1e-9);
      expect(page.height - bottom).toBeGreaterThanOrEqual(15 - 1e-9);
    }
  });

  it("lit de droite à gauche, un demi-carreau entre deux groupes", () => {
    const page = layoutSheet(sheetsOf("1x3 + 2x7")[0]!);
    const [first, second, third] = page.columns;
    expect(second!.x).toBeLessThan(first!.x);
    expect(first!.x - second!.x).toBeCloseTo(1.5 * page.cell);
    expect(second!.x - third!.x).toBeCloseTo(page.cell);
    expect(first!.rows).toBe(3);
  });
});

describe("le texte dans les cases", () => {
  it("pose les colonnes une à une quand elles correspondent à la grille", () => {
    const poured = pourText(sheetsOf("1x3 + 2x7"), ["紫陽云", "收拾身心謂之", "降伏龍虎心不動"]);
    expect(poured.mode).toBe("colonnes");
    expect(poured.sheets).toEqual([[["紫陽云"], ["收拾身心謂之", "降伏龍虎心不動"]]]);
    expect(poured.empty).toBe(1);
  });

  it("fait couler le texte, sans ponctuation, et dit ce qui déborde", () => {
    const poured = pourText(sheetsOf("2x3"), ["空山新雨後，", "天氣晚來秋。"]);
    expect(poured.mode).toBe("coulé");
    expect(poured.sheets).toEqual([[["空山新", "雨後天"]]]);
    expect(poured.overflow).toBe("氣晚來秋");
  });
});

describe("les grilles d'une pièce", () => {
  it("lisent une pièce du plan d'import, une variante par format", async () => {
    const root = await writeTree({
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
              { id: "v1", date: "2026-01-26", format: "13x7", columns: ["紫陽云收拾身心"] },
            ],
          },
        ],
      }),
    });

    const result = await generateGrids({
      root,
      slug: "long-hu-ge",
      formats: ["13x7", "(1x3 + 9x7) + (1x4 + 3x7)"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.variants.map((variant) => [variant.key, variant.sheets.length])).toEqual([
      ["A", 1],
      ["B", 2],
    ]);
    expect(result.html).toContain("imports/notion-2026-08-23.plan.yaml");
    expect(result.html.match(/<figure class="sheet /g)).toHaveLength(3);
  });

  it("lisent une pièce du contenu, au format et aux colonnes de sa dernière version", async () => {
    const root = await writeTree({
      "content/pieces/shan-ju/piece.md": `---\n${stringify({
        title: "山居秋暝",
        slug: "shan-ju",
        status: "idea",
        versions: [
          { id: "v1", date: "2026-03-04", format: "A4 vertical", columns: ["空山"] },
          { id: "v2", date: "2026-04-04", format: "2x5", columns: ["空山新雨後", "天氣晚來秋"] },
        ],
      })}---\n`,
    });

    const result = await generateGrids({ root, slug: "shan-ju" });

    expect(result.ok && result.variants[0]!.text).toMatchObject({
      mode: "colonnes",
      sheets: [[["空山新雨後", "天氣晚來秋"]]],
    });
  });

  it("refusent une version sans texte, et une pièce introuvable", async () => {
    const root = await writeTree({
      "content/pieces/shan-ju/piece.md": `---\n${stringify({
        title: "山居秋暝",
        slug: "shan-ju",
        status: "idea",
        versions: [{ id: "v1", date: "2026-03-04", format: "2x5" }],
      })}---\n`,
    });

    const empty = await generateGrids({ root, slug: "shan-ju" });
    expect(!empty.ok && empty.message).toContain("--texte");
    const missing = await generateGrids({ root, slug: "inconnue" });
    expect(missing.ok).toBe(false);
  });
});
