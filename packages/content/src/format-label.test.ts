import { describe, expect, it } from "vitest";
import { deriveFormatLabel } from "./index.js";

describe("le libellé français d'un format", () => {
  it("dit un groupe de N colonnes de M caractères", () => {
    expect(deriveFormatLabel("[(4x5)]")).toBe("4 colonnes de 5 caractères");
  });

  it("met au singulier une colonne ou un caractère seuls", () => {
    expect(deriveFormatLabel("[(1x1)]")).toBe("1 colonne de 1 caractère");
  });

  it("énumère les groupes d'une feuille dans l'ordre de la notation", () => {
    expect(deriveFormatLabel("[(1x3, 9x7, 1x4)]")).toBe(
      "1 colonne de 3 caractères, 9 colonnes de 7 caractères et 1 colonne de 4 caractères",
    );
  });

  it("compte les feuilles quand il y en a plusieurs, et dit chacune", () => {
    expect(deriveFormatLabel("[(1x3), (2x5)]")).toBe(
      "2 feuilles : 1 colonne de 3 caractères ; 2 colonnes de 5 caractères",
    );
  });

  it("dit en lignes horizontales un groupe suffixé h", () => {
    expect(deriveFormatLabel("[(1x7, 1x4h, 1x7)]")).toBe(
      "1 colonne de 7 caractères, 1 ligne horizontale de 4 caractères et 1 colonne de 7 caractères",
    );
    expect(deriveFormatLabel("[(2x4h)]")).toBe("2 lignes horizontales de 4 caractères");
  });

  it("dit les petits carreaux d'un groupe suffixé /k, et leur rapport", () => {
    expect(deriveFormatLabel("[(1x2, 1x7/2)]")).toBe(
      "1 colonne de 2 caractères et 1 colonne de 7 caractères en petits carreaux (1/2)",
    );
    expect(deriveFormatLabel("[(1x7, 1x4h/1.5)]")).toBe(
      "1 colonne de 7 caractères et 1 ligne horizontale de 4 caractères en petits carreaux (1/1,5)",
    );
  });

  it("rend telle quelle, sans erreur, une notation qu'il ne sait pas lire", () => {
    expect(deriveFormatLabel("2x7 + 蘇東坡")).toBe("2x7 + 蘇東坡");
    expect(deriveFormatLabel("à préciser")).toBe("à préciser");
  });
});
