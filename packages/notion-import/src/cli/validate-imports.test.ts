import { execFile } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { stringifyPlan } from "../plan-file.js";
import { proposeImport } from "../propose.js";
import { writeExportTree } from "../test-support/export-tree.js";

const run = promisify(execFile);
const cli = fileURLToPath(new URL("./validate-imports.ts", import.meta.url));

/** Exécute la validation comme le fait le hook de pre-commit. */
async function validate(files: Record<string, string>) {
  const root = await writeExportTree(files);
  try {
    const { stdout } = await run("npx", ["tsx", cli, root, join(root, "content")]);
    return { code: 0, output: stdout };
  } catch (error) {
    const failure = error as { code?: number; stdout: string; stderr: string };
    return { code: failure.code ?? 1, output: failure.stderr + failure.stdout };
  }
}

const plan = stringifyPlan(
  proposeImport(
    [
      {
        title: "莫性急",
        createdAt: "2025-12-22",
        editedAt: "2026-02-23",
        format: "2x7",
        text: "莫性急平流緩進",
        url: "https://app.notion.com/p/abc",
        status: "Mouvementée",
        relations: [],
        body: "",
        attachments: [],
      },
    ],
    { today: "2026-08-23" },
  ),
);

const scans = (match: string) => `scans:
  - file: 2026-10-11_01_01.jpeg
    read: [莫性急平流緩進]
    match: ${match}
    confidence: high
`;

describe("la validation des imports en pre-commit", () => {
  it("accepte un plan et un registre qui s'accordent", async () => {
    const { code, output } = await validate({
      "notion.plan.yaml": plan,
      "scans.yaml": scans("mo-xing-ji"),
    });

    expect(code).toBe(0);
    expect(output).toContain("imports valides : 1 plans, 1 scans au registre");
  });

  it("accepte un scan rattaché à une pièce du contenu, hors de tout plan", async () => {
    const { code, output } = await validate({
      "scans.yaml": scans("yong-cao-shu"),
      "content/pieces/yong-cao-shu/piece.md": `---
title: 永草書
slug: yong-cao-shu
status: idea
versions:
  - id: v1
    date: 2026-06-21
    format: A4
---
`,
    });

    expect(code).toBe(0);
    expect(output).toContain("imports valides : 0 plans, 1 scans au registre");
  });

  it("échoue sur un scan rattaché à une pièce absente du plan", async () => {
    const { code, output } = await validate({
      "notion.plan.yaml": plan,
      "scans.yaml": scans("shan-ju-qiu-ming"),
    });

    expect(code).toBe(1);
    expect(output).toContain("2026-10-11_01_01.jpeg.match");
  });

  it("échoue sur un plan mal formé, en le nommant", async () => {
    const { code, output } = await validate({
      "notion.plan.yaml": plan.replace("status: made", "status: presque-fini"),
    });

    expect(code).toBe(1);
    expect(output).toContain("notion.plan.yaml");
    expect(output).toContain("status");
  });

  it("échoue sur une pièce à version unique, de l'ancienne forme", async () => {
    const old = plan.replace(/versions:\n( +)- id: v1/, "version:\n$1  id: v1");

    const { code, output } = await validate({ "notion.plan.yaml": old });

    expect(old).not.toBe(plan);
    expect(code).toBe(1);
    expect(output).toContain("pieces.0.versions");
  });
});
