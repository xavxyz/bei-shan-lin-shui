import { describe, expect, it } from "vitest";
import { parseScanRegistry } from "./scan-registry.js";

const knownPieces = new Map([["mo-xing-ji", new Set(["v1a", "v2a"])]]);

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
    const result = parseScanRegistry(registry(moXingJi), { knownPieces });

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

    expect(parseScanRegistry(registry(discarded), { knownPieces }).ok).toBe(true);
  });

  it("accepte une photo HEIC du téléphone, refuse un autre format", () => {
    const photo = moXingJi.replace("2026-10-11_01_01.jpeg", "2026-10-17_01_01.heic");
    const png = moXingJi.replace("2026-10-11_01_01.jpeg", "2026-10-17_01_01.png");

    expect(parseScanRegistry(registry(photo), { knownPieces }).ok).toBe(true);
    expect(parseScanRegistry(registry(png), { knownPieces }).ok).toBe(false);
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
    const result = parseScanRegistry(registry(moXingJi.replace(from, to)), { knownPieces });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.map((error) => error.path)).toContain(
      `2026-10-11_01_01.jpeg.${field}`,
    );
  });

  it("refuse une pièce qui n'existe ni au plan ni au contenu", () => {
    const result = parseScanRegistry(
      registry(moXingJi.replace("match: mo-xing-ji", "match: mo-xing")),
      { knownPieces },
    );

    expect(!result.ok && result.errors).toEqual([
      expect.objectContaining({ path: "2026-10-11_01_01.jpeg.match" }),
    ]);
  });

  it("refuse une variation que la pièce ne porte pas", () => {
    const result = parseScanRegistry(
      registry(moXingJi.replace("variation: v1a", "variation: v3a")),
      { knownPieces },
    );

    expect(!result.ok && result.errors).toEqual([
      expect.objectContaining({ path: "2026-10-11_01_01.jpeg.variation" }),
    ]);
  });

  it("refuse un fichier inscrit deux fois", () => {
    const result = parseScanRegistry(registry(moXingJi, moXingJi), { knownPieces });

    expect(!result.ok && result.errors).toEqual([
      { path: "2026-10-11_01_01.jpeg", message: "fichier déjà au registre" },
    ]);
  });
});
