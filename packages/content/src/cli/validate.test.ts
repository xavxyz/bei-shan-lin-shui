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
    const { stdout } = await run("npx", ["tsx", cli, root]);
    return { code: 0, output: stdout };
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
  versions: [{ id: "v1", date: "2026-03-04", format: "A4 vertical", columns: ["空山新雨後"] }],
  published: true,
};

describe("la validation de contenu en pre-commit", () => {
  it("accepte un contenu bien formé", async () => {
    const root = await writeFixtureTree({ pieces: { "shan-ju-qiu-ming": piece } });

    const { code, output } = await validate(root);

    expect(code).toBe(0);
    expect(output).toContain("contenu valide");
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

  it("échoue aussi sur un brouillon non publié", async () => {
    const root = await writeFixtureTree({
      pieces: { "shan-ju-qiu-ming": { ...piece, published: false, status: "presque-fini" } },
    });

    expect((await validate(root)).code).toBe(1);
  });
});
