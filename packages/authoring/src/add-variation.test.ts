import { describe, expect, it } from "vitest";
import { addVariation } from "./add-variation.js";
import { addVersion } from "./add-version.js";
import { createPiece } from "./create-piece.js";
import { readPieceFile, writeContentTree } from "./test-support/content-tree.js";
import { YONG, YONG_HEAD, YONG_TAIL, YONG_V1, loadYong, yongTree } from "./test-support/yong.js";
import { loadContent } from "@bsls/content";

const autreStyle = {
  script: "kaishu",
  status: "tried",
  personal_note: "Le 永 posé, pour comparer.",
};

describe("addVariation", () => {
  it("ajoute une variation à côté des variations existantes de la version", async () => {
    const root = await yongTree();

    const result = await addVariation(root, "yong-cao-shu", "v1", autreStyle);

    expect(result).toMatchObject({ ok: true, id: "v1b" });
    const piece = await loadYong(root);
    expect(piece?.versions[0]?.variations).toMatchObject([
      { id: "v1a", script: "caoshu", status: "kept" },
      { id: "v1b", script: "kaishu", status: "tried", personal_note: "Le 永 posé, pour comparer." },
    ]);
  });

  it("laisse les variations existantes intactes, à l'octet près", async () => {
    const root = await yongTree();

    await addVariation(root, "yong-cao-shu", "v1", autreStyle);

    const after = await readPieceFile(root, "yong-cao-shu");
    expect(after.startsWith(`---\n${YONG_HEAD}${YONG_V1}`)).toBe(true);
    expect(after.endsWith(`${YONG_TAIL}---\n`)).toBe(true);
  });

  it("fait coexister plusieurs variations ajoutées l'une après l'autre", async () => {
    const root = await yongTree();

    await addVariation(root, "yong-cao-shu", "v1", autreStyle);
    await addVariation(root, "yong-cao-shu", "v1", { script: "ziyou", status: "to-try" });

    const piece = await loadYong(root);
    expect(piece?.versions[0]?.variations.map((variation) => variation.id)).toEqual([
      "v1a",
      "v1b",
      "v1c",
    ]);
  });

  it("vise la version demandée, même quand elle n'est pas la dernière", async () => {
    const root = await yongTree();
    await addVersion(root, "yong-cao-shu", { date: "2026-10-16", format: "A3" });

    await addVariation(root, "yong-cao-shu", "v1", autreStyle);
    await addVariation(root, "yong-cao-shu", "v2", { script: "caoshu", status: "kept" });

    const piece = await loadYong(root);
    expect(piece?.versions.map((version) => version.variations.map((v) => v.id))).toEqual([
      ["v1a", "v1b"],
      ["v2a"],
    ]);
  });

  it("donne sa première variation à une version qui n'en avait pas", async () => {
    const root = await writeContentTree({});
    await createPiece(root, { title: "山居秋暝", version: { date: "2026-10-16", format: "A4" } });

    const result = await addVariation(root, "shan-ju-qiu-ming", "v1", autreStyle);

    expect(result).toMatchObject({ ok: true, id: "v1a" });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]?.versions[0]?.variations).toMatchObject([
      { id: "v1a", script: "kaishu" },
    ]);
  });

  it("donne sa première variation à une version écrite avec une liste vide", async () => {
    const root = await yongTree(
      YONG.replace(/    variations:\n[\s\S]*?(?=translation)/, "    variations: []\n"),
    );

    const result = await addVariation(root, "yong-cao-shu", "v1", autreStyle);

    expect(result).toMatchObject({ ok: true, id: "v1a" });
    const piece = await loadYong(root);
    expect(piece?.versions[0]?.variations.map((variation) => variation.id)).toEqual(["v1a"]);
  });

  it("ne change aucun autre statut, même en ajoutant une variation retenue", async () => {
    const root = await yongTree();

    await addVariation(root, "yong-cao-shu", "v1", { script: "kaishu", status: "kept" });

    const piece = await loadYong(root);
    expect(piece?.status).toBe("on-hold");
    expect(piece?.versions[0]?.variations.map((variation) => variation.status)).toEqual([
      "kept",
      "kept",
    ]);
  });

  it("refuse sans rien écrire une version inconnue ou un style hors vocabulaire", async () => {
    const root = await yongTree();

    const unknownVersion = await addVariation(root, "yong-cao-shu", "v9", autreStyle);
    const unknownScript = await addVariation(root, "yong-cao-shu", "v1", {
      ...autreStyle,
      script: "lishu",
    });

    expect(unknownVersion).toMatchObject({ ok: false, message: "version inconnue : v9" });
    expect(unknownScript).toMatchObject({ ok: false });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });
});
