import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadContent } from "@bsls/content";
import { readPieceFile, writeContentTree } from "../test-support/content-tree.js";

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
  format: A4 vertical
  columns: [空山新雨後, 天氣晚來秋]
  intention: |
    Retrouver l'humidité de la montagne.
`;

describe("la commande piece", () => {
  it("annonce le slug, crée la pièce depuis un brouillon YAML, puis lui ajoute version et variation", async () => {
    const root = await writeContentTree({});

    expect(piece(root, ["slug", "山居秋暝"]).output).toBe("shan-ju-qiu-ming\n");
    expect(piece(root, ["creer"], BROUILLON)).toEqual({
      code: 0,
      output: "pièce créée : pieces/shan-ju-qiu-ming/piece.md\n",
    });
    expect(
      piece(root, ["version", "shan-ju-qiu-ming"], "date: 2026-11-02\nformat: A3\n").output,
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

  it("refuse sans rien écrire et le dit", async () => {
    const root = await writeContentTree({});
    piece(root, ["creer"], BROUILLON);
    const before = await readPieceFile(root, "shan-ju-qiu-ming");

    const { code, output } = piece(root, ["statut", "shan-ju-qiu-ming", "presque-fini"]);

    expect(code).toBe(1);
    expect(output).toContain("refusé, rien n'a été écrit");
    expect(output).toContain("status");
    expect(await readPieceFile(root, "shan-ju-qiu-ming")).toBe(before);
  });
});
