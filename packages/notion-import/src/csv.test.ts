import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv.js";

describe("parseCsv", () => {
  it("retourne des lignes indexées par en-tête", () => {
    const rows = parseCsv("Titre,État\n登山歌訣,En cours\n莫性急,Brute\n");

    expect(rows).toEqual([
      { Titre: "登山歌訣", État: "En cours" },
      { Titre: "莫性急", État: "Brute" },
    ]);
  });

  it("garde les sauts de ligne d'un champ entre guillemets", () => {
    const rows = parseCsv('Titre,Texte\n莫性急,"莫性急平流缓進\n墨行機兔起鶻落"\n');

    expect(rows[0]?.Texte).toBe("莫性急平流缓進\n墨行機兔起鶻落");
  });

  it("lit les guillemets échappés et les virgules d'un champ cité", () => {
    const rows = parseCsv('Titre,Note\n"無心, 無為","il a dit ""oui"""\n');

    expect(rows[0]).toEqual({ Titre: "無心, 無為", Note: 'il a dit "oui"' });
  });

  it("ignore les lignes vides et le BOM en tête de fichier", () => {
    const rows = parseCsv("﻿Titre\n莫性急\n\n");

    expect(rows).toEqual([{ Titre: "莫性急" }]);
  });

  it("complète les colonnes absentes en fin de ligne", () => {
    const rows = parseCsv("Titre,Format,État\n莫性急,2x7\n");

    expect(rows[0]).toEqual({ Titre: "莫性急", Format: "2x7", État: "" });
  });
});
