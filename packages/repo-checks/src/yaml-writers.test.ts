import { describe, expect, it } from "vitest";
import { writeTree } from "@bsls/content/test-support";
import { findYamlWriters } from "./yaml-writers.js";

describe("findYamlWriters", () => {
  it("laisse lire le YAML partout : parse, parseDocument, les gardes de type", async () => {
    const root = await writeTree({
      "packages/content/src/load.ts": `import { parse as parseYaml } from "yaml";\n`,
      "packages/scans/src/attach.ts": `import {\n  parseDocument,\n  isMap,\n  type YAMLMap,\n} from "yaml";\n`,
      "packages/scans/src/types.ts": `import type { Document } from "yaml";\n`,
    });

    expect(await findYamlWriters(root)).toEqual([]);
  });

  it("refuse une écriture YAML hors de packages/authoring", async () => {
    const root = await writeTree({
      "packages/notion-import/src/apply.ts": `import { Document, parseDocument } from "yaml";\n`,
      "packages/scans/src/registry.ts": `import { stringify } from "yaml";\n`,
      "packages/scans/src/all.ts": `import * as YAML from "yaml";\n`,
    });

    expect(await findYamlWriters(root)).toEqual([
      "packages/notion-import/src/apply.ts:1 — importe Document de yaml",
      "packages/scans/src/all.ts:1 — importe yaml en entier",
      "packages/scans/src/registry.ts:1 — importe stringify de yaml",
    ]);
  });

  it("refuse des options de sérialisation recopiées, même sans import d'écriture", async () => {
    const root = await writeTree({
      "packages/notion-import/src/plan-comments.ts": [
        `import { parseDocument } from "yaml";`,
        `const YAML_OPTIONS = { lineWidth: 0, blockQuote: "literal" } as const;`,
        `export const write = (text: string) => parseDocument(text).toString(YAML_OPTIONS);`,
        ``,
      ].join("\n"),
    });

    expect(await findYamlWriters(root)).toEqual([
      "packages/notion-import/src/plan-comments.ts:2 — options de sérialisation YAML (lineWidth)",
    ]);
  });

  it("laisse écrire packages/authoring, les tests et leurs fixtures", async () => {
    const root = await writeTree({
      "packages/authoring/src/yaml-edit.ts": `import { Document } from "yaml";\nconst F = { lineWidth: 0 };\n`,
      "packages/grilles/src/grilles.test.ts": `import { stringify } from "yaml";\n`,
      "packages/content/src/test-support/fixture-tree.ts": `import { stringify } from "yaml";\n`,
    });

    expect(await findYamlWriters(root)).toEqual([]);
  });
});
