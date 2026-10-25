import { describe, expect, it } from "vitest";
import { checkFormat, parseFormat, UNSPECIFIED_FORMAT } from "./index.js";

const refusal = (format: string) => {
  const result = parseFormat(format);
  return !result.ok && result.message;
};

describe("la notation des formats", () => {
  it("fait une feuille de chaque parenthèse, ses groupes séparés par des virgules", () => {
    const result = parseFormat("[(1x3, 9x7), (1x4, 3x7)]");
    expect(result).toEqual({
      ok: true,
      sheets: [
        [
          { ranks: 1, length: 3, orientation: "v", scale: 1 },
          { ranks: 9, length: 7, orientation: "v", scale: 1 },
        ],
        [
          { ranks: 1, length: 4, orientation: "v", scale: 1 },
          { ranks: 3, length: 7, orientation: "v", scale: 1 },
        ],
      ],
    });
  });

  it("lit l'orientation de chaque groupe, v par défaut, et le rapport d'un groupe plus petit", () => {
    expect(parseFormat("[(1x3v, 2x7V)]")).toEqual(parseFormat("[(1x3, 2x7)]"));
    expect(parseFormat("[(1x7, 1x4h/2, 1x7/1.5)]")).toEqual({
      ok: true,
      sheets: [
        [
          { ranks: 1, length: 7, orientation: "v", scale: 1 },
          { ranks: 1, length: 4, orientation: "h", scale: 2 },
          { ranks: 1, length: 7, orientation: "v", scale: 1.5 },
        ],
      ],
    });
  });

  it("refuse l'ancienne notation, et dit comment l'écrire", () => {
    const message = refusal("1x3 + 2*(4x5) + 1x3");
    expect(message).toContain("1x3 + 2*(4x5) + 1x3");
    expect(message).toContain("[(1x3, 9x7), (1x4, 3x7)]");
  });

  it("refuse ce qui n'est pas une grille, en disant où", () => {
    expect(refusal("A4 vertical")).toContain("« A4 vertical » — attendu « [ » à la position 1");
    expect(refusal("[(1x7, 1x4d, 1x7)]")).toContain(
      "« [(1x7, 1x4d, 1x7)] » — orientation « d » inconnue, attendu « v » ou « h » à la position 10",
    );
  });

  it("refuse un rapport plus petit que 1, et une feuille dont aucun groupe n'a le carreau de la feuille", () => {
    expect(refusal("[(1x2, 1x7/0.5)]")).toContain(
      "« [(1x2, 1x7/0.5)] » — rapport « /0.5 » plus petit que 1, attendu un carreau plus petit que celui de la feuille à la position 11",
    );
    expect(refusal("[(1x2), (1x2/2, 1x7/2)]")).toContain(
      "« [(1x2), (1x2/2, 1x7/2)] » — aucun groupe au carreau de la feuille à la position 8",
    );
    expect(refusal("[(1x2, 1x7/)]")).toContain(
      "« [(1x2, 1x7/)] » — attendu un rapport k après « / » à la position 11",
    );
    expect(refusal("[(1x2, 1x7/2h)]")).toContain(
      "« [(1x2, 1x7/2h)] » — l'orientation « h » précède le rapport, attendu « 1x7h/2 » à la position 12",
    );
  });
});

describe("le format d'une version", () => {
  it("est une grille dans la notation, ou « à préciser » tant qu'il n'est pas connu", () => {
    expect(checkFormat("[(1x2, 1x7/2)]")).toEqual({ ok: true });
    expect(checkFormat(UNSPECIFIED_FORMAT)).toEqual({ ok: true });
    expect(UNSPECIFIED_FORMAT).toBe("à préciser");
  });

  it("refuse le reste avec le message de la notation", () => {
    expect(checkFormat("2x7")).toEqual({
      ok: false,
      message: expect.stringContaining("« 2x7 » — attendu « [ » à la position 1"),
    });
    expect(checkFormat("mixte")).toMatchObject({ ok: false });
  });
});
