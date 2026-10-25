import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { pieceFile } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("./attach-scan.ts", import.meta.url));

const PIECE = `---
title: 莫性急
slug: mo-xing-ji
status: made
versions:
  - id: v1 # celle de Notion
    date: 2026-01-03
    format: 2x7
    variations:
      - id: v1a
        script: kaishu
        status: tried
published: true
---
`;

/** Un dépôt minimal : le contenu, et un scan copié depuis le Drive. */
async function repository(): Promise<string> {
  const root = await writeTree({ [`content/${pieceFile("mo-xing-ji")}`]: PIECE });
  await mkdir(join(root, "imports/scans"), { recursive: true });
  await sharp({ create: { width: 800, height: 1200, channels: 3, background: "white" } })
    .jpeg()
    .toFile(join(root, "imports/scans/2026-10-11_01_01.jpeg"));
  return root;
}

async function attach(root: string, attachment: string) {
  await writeFile(join(root, "imports/scans/rattachement.yaml"), attachment, "utf8");
  try {
    const { stdout } = await run("npx", ["tsx", cli, "imports/scans/rattachement.yaml"], {
      cwd: root,
    });
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { code?: number; stdout: string; stderr: string };
    return { code: failure.code ?? 1, output: failure.stderr + failure.stdout };
  }
}

describe("attach:scan, appelé par la skill scans", () => {
  it("rattache le scan décrit par un fichier YAML et nomme ce qu'il a écrit", async () => {
    const root = await repository();

    const { code, output } = await attach(
      root,
      `piece: mo-xing-ji
version:
  id: v2
  date: 2026-02-11
  format: "[(2x7)]"
  columns: [莫性急平流緩進, 墨行機兔起鶻落]
variation:
  id: v2a
  script: kaishu
  status: kept
image:
  source: imports/scans/2026-10-11_01_01.jpeg
  kind: work
  featured: true
`,
    );

    expect(code).toBe(0);
    expect(output).toContain("pieces/mo-xing-ji/images/v2a.jpg");
    const piece = await readFile(join(root, "content/pieces/mo-xing-ji/piece.md"), "utf8");
    expect(piece).toContain("  - id: v1 # celle de Notion");
    expect(piece).toContain("  - id: v2\n    date: 2026-02-11");
  });

  it("refuse un rattachement fautif en nommant le champ, sans rien écrire", async () => {
    const root = await repository();

    const { code, output } = await attach(
      root,
      `piece: mo-xing-ji
version: v1
variation: v1a
image:
  source: imports/scans/absent.jpeg
  kind: work
`,
    );

    expect(code).toBe(1);
    expect(output).toContain("image.source");
    expect(await readFile(join(root, "content/pieces/mo-xing-ji/piece.md"), "utf8")).toBe(PIECE);
  });
});
