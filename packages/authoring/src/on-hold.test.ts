import { describe, expect, it } from "vitest";
import { createPiece } from "./create-piece.js";
import { describeOnHold } from "./on-hold.js";
import { readPieceFile } from "./test-support/content-tree.js";
import { YONG, yongTree } from "./test-support/yong.js";

describe("describeOnHold", () => {
  it("présente les pièces en veille, et elles seules, avec leur dernière version", async () => {
    const root = await yongTree();
    await createPiece(root, { title: "山居秋暝", version: { date: "2026-10-16", format: "A4" } });

    const result = await describeOnHold(root);

    expect(result.ok).toBe(true);
    const text = result.ok ? result.text : "";
    expect(text).toContain("永草書 · yong-cao-shu");
    expect(text).toContain("v1 · 2026-06-21 · A4");
    expect(text).toContain("Exploration sans modèle du caractère 永 en cursive.");
    expect(text).toContain("v1a cursif, retenue");
    expect(text).not.toContain("山居秋暝");
  });

  it("ne modifie aucune pièce", async () => {
    const root = await yongTree();

    await describeOnHold(root);

    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });

  it("dit qu'aucune pièce n'est en veille", async () => {
    const root = await yongTree(YONG.replace("status: on-hold", "status: idea"));

    const result = await describeOnHold(root);

    expect(result).toEqual({ ok: true, count: 0, text: "aucune pièce en veille\n" });
  });
});
