import { describe, expect, it } from "vitest";
import { parseScanRegistry } from "./scan-registry.js";

const knownSlugs = new Set(["mo-xing-ji"]);

function registry(...entries: string[]): string {
  return `scans:\n${entries.join("\n")}`;
}

const moXingJi = `
  - file: 2026-10-11_01_01.jpeg # à arbitrer
    read: [莫性急平流緩進, 墨行機兔起鶻落]
    match: mo-xing-ji
    confidence: high
    script: kaishu
    variation: v1a # kept`;

describe("registre des scans", () => {
  it("se relit quand chaque entrée est bien formée", () => {
    const result = parseScanRegistry(registry(moXingJi), { knownSlugs });

    expect(result.ok && result.scans).toEqual([
      {
        file: "2026-10-11_01_01.jpeg",
        read: ["莫性急平流緩進", "墨行機兔起鶻落"],
        match: "mo-xing-ji",
        confidence: "high",
        script: "kaishu",
        variation: "v1a",
      },
    ]);
  });

  it("accepte un scan sans pièce, sans style ni variation", () => {
    const discarded = `
  - file: 2026-10-11_02_02.jpeg
    read: []
    match: discarded
    confidence: high`;

    expect(parseScanRegistry(registry(discarded), { knownSlugs }).ok).toBe(true);
  });

  it.each([
    ["un style hors vocabulaire", "script: kaishu", "script: lishu", "script"],
    [
      "un type d'image à la place d'une variation",
      "variation: v1a",
      "variation: study",
      "variation",
    ],
    ["une lecture qui n'est pas du chinois", "墨行機兔起鶻落", "煮haii", "read.1"],
  ])("refuse %s, en désignant le scan et le champ", (_case, from, to, field) => {
    const result = parseScanRegistry(registry(moXingJi.replace(from, to)), { knownSlugs });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.map((error) => error.path)).toContain(
      `2026-10-11_01_01.jpeg.${field}`,
    );
  });

  it("refuse une pièce qui n'existe ni au plan ni au contenu", () => {
    const result = parseScanRegistry(
      registry(moXingJi.replace("match: mo-xing-ji", "match: mo-xing")),
      {
        knownSlugs,
      },
    );

    expect(!result.ok && result.errors).toEqual([
      expect.objectContaining({ path: "2026-10-11_01_01.jpeg.match" }),
    ]);
  });

  it("refuse un fichier inscrit deux fois", () => {
    const result = parseScanRegistry(registry(moXingJi, moXingJi), { knownSlugs });

    expect(!result.ok && result.errors).toEqual([
      { path: "2026-10-11_01_01.jpeg", message: "fichier déjà au registre" },
    ]);
  });
});
