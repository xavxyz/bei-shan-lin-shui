import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadContent } from "@bsls/content";
import { attachToProject } from "./attach-to-project.js";
import { createPiece } from "./create-piece.js";
import { writeTree } from "@bsls/content/test-support";
import { PROJECT_FILE, readPieceFile } from "./test-support/content-tree.js";
import { YONG, loadYong, yongTree } from "./test-support/yong.js";

const SECOND_PROJECT = PROJECT_FILE.replace("Explorations personnelles", "Le vent");

describe("attachToProject", () => {
  it("ajoute le projet à ceux de la pièce, sans toucher au reste du fichier", async () => {
    const root = await yongTree();
    await writeFile(join(root, "projects/feng.yaml"), SECOND_PROJECT, "utf8");

    const result = await attachToProject(root, "yong-cao-shu", "feng");

    expect(result).toMatchObject({ ok: true });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace("projects: [ge-zhi-yan-jiu]", "projects: [ge-zhi-yan-jiu, feng]"),
    );
    expect((await loadYong(root))?.projects).toEqual(["ge-zhi-yan-jiu", "feng"]);
  });

  it("rattache une pièce qui n'appartenait à aucun projet", async () => {
    const root = await writeTree({ "projects/ge-zhi-yan-jiu.yaml": PROJECT_FILE });
    await createPiece(root, {
      title: "山居秋暝",
      version: { date: "2026-10-16", format: "[(1x1)]" },
      published: false,
    });

    const result = await attachToProject(root, "shan-ju-qiu-ming", "ge-zhi-yan-jiu");

    expect(result).toMatchObject({ ok: true });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]?.projects).toEqual(["ge-zhi-yan-jiu"]);
  });

  it("rattache une pièce dont le fichier ne mentionne aucun projet", async () => {
    const root = await yongTree(YONG.replace("projects: [ge-zhi-yan-jiu]\n", ""));

    const result = await attachToProject(root, "yong-cao-shu", "ge-zhi-yan-jiu");

    expect(result).toMatchObject({ ok: true });
    expect((await loadYong(root))?.projects).toEqual(["ge-zhi-yan-jiu"]);
  });

  it("refuse sans rien écrire un projet inconnu ou déjà rattaché", async () => {
    const root = await yongTree();

    const unknown = await attachToProject(root, "yong-cao-shu", "inconnu");
    const already = await attachToProject(root, "yong-cao-shu", "ge-zhi-yan-jiu");

    expect(unknown).toMatchObject({ ok: false, message: "projet inconnu : inconnu" });
    expect(already).toMatchObject({ ok: false, message: "déjà rattachée à ge-zhi-yan-jiu" });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });
});
