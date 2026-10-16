import { describe, expect, it } from "vitest";
import { setPieceStatus, setVariationStatus } from "./statuses.js";
import { readPieceFile } from "./test-support/content-tree.js";
import { YONG, loadYong, yongTree } from "./test-support/yong.js";

describe("setPieceStatus", () => {
  it("change le statut de la pièce, et rien d'autre dans le fichier", async () => {
    const root = await yongTree();

    const result = await setPieceStatus(root, "yong-cao-shu", "abandoned");

    expect(result).toMatchObject({ ok: true, previous: "on-hold" });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace("status: on-hold", "status: abandoned"),
    );
  });

  it("refuse sans rien écrire un statut hors vocabulaire", async () => {
    const root = await yongTree();

    const result = await setPieceStatus(root, "yong-cao-shu", "presque-fini");

    expect(result).toMatchObject({ ok: false });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });
});

describe("setVariationStatus", () => {
  it("marque une variation retenue sans toucher au statut de la pièce ni des autres variations", async () => {
    const root = await yongTree(
      YONG.replace(
        "            featured: true\n",
        "            featured: true\n      - id: v1b\n        script: kaishu\n        status: tried\n",
      ),
    );

    const result = await setVariationStatus(root, "yong-cao-shu", "v1b", "kept");

    expect(result).toMatchObject({ ok: true, previous: "tried" });
    const piece = await loadYong(root);
    expect(piece?.status).toBe("on-hold");
    expect(piece?.versions[0]?.variations.map((variation) => variation.status)).toEqual([
      "kept",
      "kept",
    ]);
  });

  it("change le statut de la variation, et rien d'autre dans le fichier", async () => {
    const root = await yongTree();

    await setVariationStatus(root, "yong-cao-shu", "v1a", "set-aside");

    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace("status: kept", "status: set-aside"),
    );
  });

  it("refuse une variation inconnue", async () => {
    const root = await yongTree();

    const result = await setVariationStatus(root, "yong-cao-shu", "v1z", "kept");

    expect(result).toMatchObject({ ok: false, message: "variation inconnue : v1z" });
  });
});
