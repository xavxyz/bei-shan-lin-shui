import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { writeTree } from "../test-support/fixture-tree.js";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("./memory-marks.ts", import.meta.url));

/** Exécute la vérification comme `pnpm validate:content`, depuis la racine donnée. */
async function check(root: string, dirs: string[]) {
  try {
    const { stdout } = await run("npx", ["tsx", cli, ...dirs], { cwd: root });
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { code?: number; stdout: string; stderr: string };
    return { code: failure.code ?? 1, output: failure.stderr + failure.stdout };
  }
}

describe("aucune donnée de mémoire (ADR 0004)", () => {
  it("accepte un fait sourcé, et un fait laissé à relever", async () => {
    const root = await writeTree({
      "docs/sources/tai-xi.md": "# 胎息\n\n**Source :** zh.wikisource `胎息經註`.\n",
      "content/pieces/tai-xi/piece.md": "---\ntitle: 胎息\n---\n# à relever dans le 全宋詩\n",
    });

    const { code } = await check(root, ["content", "docs/sources"]);

    expect(code).toBe(0);
  });

  it("refuse une marque de mémoire en désignant le fichier et la ligne", async () => {
    const root = await writeTree({
      "docs/sources/zhong-he-ji.md": "# 中和集\n\n- Le 吹毛劍 du 碧巖錄. Non collationné.\n",
      "content/pieces/yuan-dao-ge/piece.md": "---\ntitle: 原道歌\n---\n",
    });

    const { code, output } = await check(root, ["content", "docs/sources"]);

    expect(code).toBe(1);
    expect(output).toContain("docs/sources/zhong-he-ji.md:3");
    expect(output).toContain("non collationné");
  });

  it("refuse chaque marque, dans le contenu comme dans les textes de référence", async () => {
    const root = await writeTree({
      "docs/sources/a.md": "Daté des 元, de mémoire.\n",
      "docs/sources/b.md": "Transcription non relue.\n",
      "content/pieces/c/piece.md": "---\nsource:\n  dynasty: 唐 # donné de mémoire\n---\n",
    });

    const { code, output } = await check(root, ["content", "docs/sources"]);

    expect(code).toBe(1);
    expect(output).toContain("docs/sources/a.md:1");
    expect(output).toContain("docs/sources/b.md:1");
    expect(output).toContain("content/pieces/c/piece.md:3");
    expect(output).toContain("3 marques de mémoire");
  });
});
