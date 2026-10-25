import { describe, expect, it } from "vitest";
import { setVersionTranslation } from "./translation.js";
import { readPieceFile } from "./test-support/content-tree.js";
import { YONG, loadYong, yongTree } from "./test-support/yong.js";

const INTENTION = "      Exploration sans modèle du caractère 永 en cursive.\n";

describe("setVersionTranslation", () => {
  it("ajoute à une version sa traduction, une ligne par colonne, sans toucher au reste du fichier", async () => {
    const root = await yongTree();

    const result = await setVersionTranslation(root, "yong-cao-shu", "v1", [
      "La ligne de l'unique colonne",
    ]);

    expect(result).toMatchObject({ ok: true });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace(
        INTENTION,
        `${INTENTION}    translation:\n      - La ligne de l'unique colonne\n`,
      ),
    );
    expect((await loadYong(root))?.versions[0]?.translation).toEqual([
      "La ligne de l'unique colonne",
    ]);
  });

  it("remplace la traduction existante, et elle seule", async () => {
    const root = await yongTree(
      YONG.replace(INTENTION, `${INTENTION}    translation:\n      - Une ligne\n`),
    );

    await setVersionTranslation(root, "yong-cao-shu", "v1", ["Une ligne, reprise"]);

    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace(INTENTION, `${INTENTION}    translation:\n      - Une ligne, reprise\n`),
    );
  });

  it.each([
    ["trop courte", []],
    ["trop longue", ["Une ligne", "En trop"]],
    ["à ligne vide", [""]],
    ["à ligne faite d'espaces", ["   "]],
  ])("refuse sans rien écrire une traduction %s", async (_, lines) => {
    const root = await yongTree();

    const result = await setVersionTranslation(root, "yong-cao-shu", "v1", lines);

    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("translation");
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });

  it("refuse une version inconnue", async () => {
    const root = await yongTree();

    const result = await setVersionTranslation(root, "yong-cao-shu", "v9", ["Une ligne"]);

    expect(result).toMatchObject({ ok: false, message: "version inconnue : v9" });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });
});
