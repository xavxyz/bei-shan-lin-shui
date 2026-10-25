import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { writeFixtureTree } from "../test-support/fixture-tree.js";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("./validate.ts", import.meta.url));

/** Exécute la validation comme le fait le hook de pre-commit. */
async function validate(root: string) {
  try {
    const { stdout, stderr } = await run("npx", ["tsx", cli, root]);
    return { code: 0, output: stderr + stdout };
  } catch (error) {
    const failure = error as { code?: number; stdout: string; stderr: string };
    return { code: failure.code ?? 1, output: failure.stderr + failure.stdout };
  }
}

const piece = {
  title: "山居秋暝",
  slug: "shan-ju-qiu-ming",
  projects: [],
  status: "idea",
  versions: [{ id: "v1", date: "2026-03-04", format: "[(1x5)]", columns: ["空山新雨後"] }],
  published: true,
};

describe("la validation de contenu en pre-commit", () => {
  it("accepte un contenu bien formé", async () => {
    const root = await writeFixtureTree({ pieces: { "shan-ju-qiu-ming": piece } });

    const { code, output } = await validate(root);

    expect(code).toBe(0);
    expect(output).toContain("contenu valide");
  });

  it("signale sans échouer un format hors de la notation, avec son fichier et où sa lecture bute", async () => {
    const root = await writeFixtureTree({
      pieces: {
        "shan-ju-qiu-ming": piece,
        "zhu-li-guan": {
          ...piece,
          title: "竹里館",
          slug: "zhu-li-guan",
          versions: [
            { id: "v1", date: "2026-03-04", format: "à préciser" },
            { id: "v2", date: "2026-04-04", format: "1x1 + 1x4 + 1x1" },
          ],
        },
      },
    });

    const { code, output } = await validate(root);

    expect(code).toBe(0);
    expect(output).toContain("contenu valide");
    expect(output).toContain("pieces/zhu-li-guan/piece.md");
    expect(output).toContain(
      "v2 · format — format illisible : « 1x1 + 1x4 + 1x1 » — attendu « [ » à la position 1",
    );
    expect(output).toContain("1 avertissement de contenu");
    expect(output).not.toContain("shan-ju-qiu-ming");
    expect(output).not.toContain("à préciser");
  });

  it("échoue en désignant le fichier et le champ fautifs", async () => {
    const root = await writeFixtureTree({
      pieces: { "shan-ju-qiu-ming": { ...piece, status: "presque-fini" } },
    });

    const { code, output } = await validate(root);

    expect(code).toBe(1);
    expect(output).toContain("pieces/shan-ju-qiu-ming/piece.md");
    expect(output).toContain("status");
    expect(output).toContain("1 erreur de contenu");
  });

  it("refuse l'ancien statut « study », devenu « experiment »", async () => {
    const root = await writeFixtureTree({
      pieces: { "shan-ju-qiu-ming": { ...piece, status: "study" } },
    });

    const { code, output } = await validate(root);

    expect(code).toBe(1);
    expect(output).toContain("pieces/shan-ju-qiu-ming/piece.md");
    expect(output).toContain("status");
  });

  it("échoue aussi sur un brouillon non publié", async () => {
    const root = await writeFixtureTree({
      pieces: { "shan-ju-qiu-ming": { ...piece, published: false, status: "presque-fini" } },
    });

    expect((await validate(root)).code).toBe(1);
  });
});
