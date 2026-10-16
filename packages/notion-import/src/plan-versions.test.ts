import { describe, expect, it } from "vitest";
import { parsePlan } from "./plan-file.js";
import { convertPlanToVersions } from "./plan-versions.js";

/** Un plan à l'ancienne forme, une `version:` et ses `variations:` à plat, annoté à la main. */
const OLD_PLAN = `# Plan d'import Notion

projects: []
pieces:
  # à arbitrer — version.format : aucun format dans l'export
  # date du papier : 3.1.26 (Notion disait 2025-12-22)
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    projects: []
    published: false
    version:
      id: v1
      date: 2026-01-03 # date du papier
      format: 2x7
      columns:
        # 緩 en traditionnel sur le scan
        - 莫性急平流緩進
        - 墨行機兔起鶻落
    variations:
      # variation arbitrée sur le scan 01_02
      - id: v1a
        script: kaishu
        status: tried
        images:
          - source: imports/scans/2026-10-11_01_02.jpeg
            file: v1a.jpg
            kind: work
    notion:
      title: 莫性急
      status: Mouvementée
      url: ""
      relations: []
  - slug: xi-you-ji
    title: 西遊記
    status: made
    projects: []
    published: false
    version:
      id: v1
      date: 2025-12-09
      format: 9x7
    variations: []
`;

describe("conversion du plan à plusieurs versions", () => {
  it("range la version et ses variations sous versions:, que le plan relu accepte", () => {
    const { text } = convertPlanToVersions(OLD_PLAN);
    const result = parsePlan(text);

    expect(result.ok).toBe(true);
    expect(result.ok && result.plan.pieces[0]?.versions).toEqual([
      {
        id: "v1",
        date: "2026-01-03",
        format: "2x7",
        columns: ["莫性急平流緩進", "墨行機兔起鶻落"],
        variations: [
          {
            id: "v1a",
            script: "kaishu",
            status: "tried",
            images: [
              {
                source: "imports/scans/2026-10-11_01_02.jpeg",
                file: "v1a.jpg",
                kind: "work",
                featured: false,
              },
            ],
          },
        ],
      },
    ]);
    expect(result.ok && result.plan.pieces[1]?.versions).toHaveLength(1);
  });

  it("garde chaque commentaire", () => {
    const { text } = convertPlanToVersions(OLD_PLAN);

    for (const comment of OLD_PLAN.match(/#.*$/gm)!) {
      expect(text).toContain(comment);
    }
  });

  it("compte les pièces converties", () => {
    expect(convertPlanToVersions(OLD_PLAN).converted).toBe(2);
  });

  it("laisse intact un plan déjà converti", () => {
    const once = convertPlanToVersions(OLD_PLAN).text;
    const twice = convertPlanToVersions(once);

    expect(twice.text).toBe(once);
    expect(twice.converted).toBe(0);
  });
});
