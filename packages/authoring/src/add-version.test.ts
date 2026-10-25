import { describe, expect, it } from "vitest";
import { addVersion } from "./add-version.js";
import { readPieceFile } from "./test-support/content-tree.js";
import { YONG, YONG_HEAD, YONG_TAIL, YONG_V1, loadYong, yongTree } from "./test-support/yong.js";

const realisation = {
  date: "2026-10-16",
  format: "[(1x1)]",
  columns: ["永"],
  intention: "Refaire le 永 plus grand,\nsur papier de riz.",
};

describe("addVersion", () => {
  it("ouvre la version suivante à la suite des précédentes", async () => {
    const root = await yongTree();

    const result = await addVersion(root, "yong-cao-shu", realisation);

    expect(result).toMatchObject({ ok: true, id: "v2" });
    const piece = await loadYong(root);
    expect(piece?.versions.map((version) => version.id)).toEqual(["v1", "v2"]);
    expect(piece?.versions[1]).toMatchObject({
      date: "2026-10-16",
      format: "[(1x1)]",
      intention: "Refaire le 永 plus grand,\nsur papier de riz.",
      variations: [],
    });
  });

  it("laisse les versions précédentes intactes, à l'octet près", async () => {
    const root = await yongTree();

    await addVersion(root, "yong-cao-shu", realisation);

    const after = await readPieceFile(root, "yong-cao-shu");
    expect(after.startsWith(`---\n${YONG_HEAD}${YONG_V1}`)).toBe(true);
    expect(after.endsWith(`${YONG_TAIL}---\n`)).toBe(true);
  });

  it("prend l'identifiant qui suit le plus grand, sans en réutiliser aucun", async () => {
    const root = await yongTree(YONG.replace("  - id: v1\n", "  - id: v3\n"));

    const result = await addVersion(root, "yong-cao-shu", realisation);

    expect(result).toMatchObject({ ok: true, id: "v4" });
  });

  it("donne aux variations de la nouvelle version leurs identifiants", async () => {
    const root = await yongTree();

    await addVersion(root, "yong-cao-shu", {
      ...realisation,
      variations: [
        { script: "caoshu", status: "kept", personal_note: "Plus ample." },
        { script: "kaishu", status: "to-try" },
      ],
    });

    const piece = await loadYong(root);
    expect(piece?.versions[1]?.variations).toMatchObject([
      { id: "v2a", script: "caoshu", status: "kept", personal_note: "Plus ample." },
      { id: "v2b", script: "kaishu", status: "to-try" },
    ]);
  });

  it("ne change aucun statut de la pièce", async () => {
    const root = await yongTree();

    await addVersion(root, "yong-cao-shu", realisation);

    const piece = await loadYong(root);
    expect(piece?.status).toBe("on-hold");
    expect(piece?.versions[0]?.variations[0]?.status).toBe("kept");
  });

  it("refuse sans rien écrire une version qui ne respecte pas le schéma", async () => {
    const root = await yongTree();

    const result = await addVersion(root, "yong-cao-shu", { ...realisation, format: "" });

    expect(!result.ok && result.message).toMatch(/^format : /);
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });

  it("refuse sans rien écrire un format hors de la notation, en disant où la lecture bute", async () => {
    const root = await yongTree();

    const result = await addVersion(root, "yong-cao-shu", {
      ...realisation,
      format: "1x1 + 1x4 + 1x1",
    });

    expect(!result.ok && result.message).toContain(
      "format : format illisible : « 1x1 + 1x4 + 1x1 » — attendu « [ » à la position 1",
    );
    expect(!result.ok && result.message).toContain("[(1x3, 9x7), (1x4, 3x7)]");
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });

  it("accepte un format « à préciser », tant que la disposition n'est pas connue", async () => {
    const root = await yongTree();

    const result = await addVersion(root, "yong-cao-shu", { ...realisation, format: "à préciser" });

    expect(result).toMatchObject({ ok: true, id: "v2" });
  });

  it("refuse une variation hors vocabulaire, en nommant le champ de la version", async () => {
    const root = await yongTree();

    const result = await addVersion(root, "yong-cao-shu", {
      ...realisation,
      variations: [{ script: "kaishu", status: "presque" }],
    });

    expect(!result.ok && result.message).toMatch(/^variations\.0\.status : /);
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });

  it("refuse une pièce absente", async () => {
    const root = await yongTree();

    const result = await addVersion(root, "absente", realisation);

    expect(result).toMatchObject({ ok: false, message: "pièce introuvable : absente" });
  });
});
