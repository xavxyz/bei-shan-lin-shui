import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { findBannedWords } from "./banned-words.js";
import { findStaleReferences } from "./stale-references.js";
import { findYamlWriters } from "./yaml-writers.js";

/** La racine du dépôt, que `pnpm validate:repo` vérifie en pre-commit. */
const root = fileURLToPath(new URL("../../..", import.meta.url));

describe("le dépôt", () => {
  it("n'écrit le YAML que par packages/authoring", async () => {
    expect(await findYamlWriters(root)).toEqual([]);
  });

  it("ne cite que des chemins qui existent", async () => {
    expect(await findStaleReferences(root)).toEqual([]);
  });

  it("n'emploie pas les mots que le glossaire dit d'éviter", async () => {
    expect(await findBannedWords(root)).toEqual([]);
  });
});
