import { describe, expect, it } from "vitest";
import { deriveFormatLabel } from "./index.js";

/** Le libellé d'une notation lisible. */
function labelOf(format: string): string {
  const label = deriveFormatLabel(format);
  if (!label.readable) expect.unreachable(`notation illisible : ${format}`);
  return label.text;
}

describe("le libellé français d'un format", () => {
  it("dit un groupe de N colonnes de M caractères", () => {
    expect(labelOf("[(4x5)]")).toBe("4 colonnes de 5 caractères");
  });

  it("met au singulier une colonne ou un caractère seuls", () => {
    expect(labelOf("[(1x1)]")).toBe("1 colonne de 1 caractère");
  });

  it("énumère les groupes d'une feuille dans l'ordre de la notation", () => {
    expect(labelOf("[(1x3, 9x7, 1x4)]")).toBe(
      "1 colonne de 3 caractères, 9 colonnes de 7 caractères et 1 colonne de 4 caractères",
    );
  });

  it("compte les feuilles quand il y en a plusieurs, et dit chacune", () => {
    expect(labelOf("[(1x3), (2x5)]")).toBe(
      "2 feuilles : 1 colonne de 3 caractères ; 2 colonnes de 5 caractères",
    );
  });

  it("dit en lignes horizontales un groupe suffixé h", () => {
    expect(labelOf("[(1x7, 1x4h, 1x7)]")).toBe(
      "1 colonne de 7 caractères, 1 ligne horizontale de 4 caractères et 1 colonne de 7 caractères",
    );
    expect(labelOf("[(2x4h)]")).toBe("2 lignes horizontales de 4 caractères");
  });

  it("dit les petits carreaux d'un groupe suffixé /k, et leur rapport", () => {
    expect(labelOf("[(1x2, 1x7/2)]")).toBe(
      "1 colonne de 2 caractères et 1 colonne de 7 caractères en petits carreaux (1/2)",
    );
    expect(labelOf("[(1x7, 1x4h/1.5)]")).toBe(
      "1 colonne de 7 caractères et 1 ligne horizontale de 4 caractères en petits carreaux (1/1,5)",
    );
  });

  it("dit, sans erreur, qu'une notation est illisible", () => {
    expect(deriveFormatLabel("2x7 + 蘇東坡")).toEqual({ readable: false });
    expect(deriveFormatLabel("à préciser")).toEqual({ readable: false });
  });
});
