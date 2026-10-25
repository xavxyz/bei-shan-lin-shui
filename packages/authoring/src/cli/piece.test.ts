import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadContent } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";
import { readPieceFile } from "../test-support/content-tree.js";

const cli = fileURLToPath(new URL("./piece.ts", import.meta.url));

/** Exécute la commande comme la skill le fait, brouillon YAML sur l'entrée standard. */
function piece(root: string, args: string[], input = "") {
  const run = spawnSync(process.execPath, ["--import", "tsx", cli, ...args, "--content", root], {
    input,
    encoding: "utf8",
  });
  return { code: run.status, output: run.stdout + run.stderr };
}

const BROUILLON = `title: 山居秋暝
source:
  author: 王維
  dynasty: 唐
version:
  date: 2026-10-16
  format: "[(2x5)]"
  columns: [空山新雨後, 天氣晚來秋]
  intention: |
    Retrouver l'humidité de la montagne.
published: false
`;

describe("la commande piece", () => {
  it("annonce le slug, crée la pièce depuis un brouillon YAML, puis lui ajoute version et variation", async () => {
    const root = await writeTree({});

    expect(piece(root, ["slug", "山居秋暝"]).output).toBe("shan-ju-qiu-ming\n");
    expect(piece(root, ["creer"], BROUILLON)).toEqual({
      code: 0,
      output: "pièce créée : pieces/shan-ju-qiu-ming/piece.md\n",
    });
    expect(
      piece(root, ["version", "shan-ju-qiu-ming"], "date: 2026-11-02\nformat: '[(2x5)]'\n").output,
    ).toBe("version ajoutée : v2\n");
    expect(
      piece(root, ["variation", "shan-ju-qiu-ming", "v2"], "script: xingshu\nstatus: kept\n")
        .output,
    ).toBe("variation ajoutée : v2a\n");

    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]).toMatchObject({
      status: "idea",
      versions: [{ id: "v1" }, { id: "v2", variations: [{ id: "v2a", script: "xingshu" }] }],
    });
  });

  it("crée publiée la pièce dont le brouillon le demande", async () => {
    const root = await writeTree({});

    const run = piece(root, ["creer"], BROUILLON.replace("published: false", "published: true"));

    expect(run.code).toBe(0);
    const loaded = await loadContent(root);
    expect(loaded.ok && loaded.content.pieces).toMatchObject([
      { slug: "shan-ju-qiu-ming", published: true },
    ]);
  });

  it("refuse sans rien écrire un brouillon qui ne dit pas si la pièce est publiée", async () => {
    const root = await writeTree({});

    const { code, output } = piece(root, ["creer"], BROUILLON.replace("published: false\n", ""));

    expect(code).toBe(1);
    expect(output).toContain("refusé, rien n'a été écrit");
    expect(output).toContain("published");
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });

  it("refuse sans rien écrire et le dit", async () => {
    const root = await writeTree({});
    piece(root, ["creer"], BROUILLON);
    const before = await readPieceFile(root, "shan-ju-qiu-ming");

    const { code, output } = piece(root, ["statut", "shan-ju-qiu-ming", "presque-fini"]);

    expect(code).toBe(1);
    expect(output).toContain("refusé, rien n'a été écrit");
    expect(output).toContain("status");
    expect(await readPieceFile(root, "shan-ju-qiu-ming")).toBe(before);
  });

  it("refuse une version à l'ancienne notation, en disant où la lecture du format bute", async () => {
    const root = await writeTree({});
    piece(root, ["creer"], BROUILLON);
    const before = await readPieceFile(root, "shan-ju-qiu-ming");

    const { code, output } = piece(
      root,
      ["version", "shan-ju-qiu-ming"],
      "date: 2026-11-02\nformat: 1x3 + 2x5\n",
    );

    expect(code).toBe(1);
    expect(output).toContain("refusé, rien n'a été écrit");
    expect(output).toContain(
      "format : format illisible : « 1x3 + 2x5 » — attendu « [ » à la position 1",
    );
    expect(await readPieceFile(root, "shan-ju-qiu-ming")).toBe(before);
  });
});
