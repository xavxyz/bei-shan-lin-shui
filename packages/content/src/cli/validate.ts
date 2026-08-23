#!/usr/bin/env node
import { resolve } from "node:path";
import { loadContent } from "../load-content.js";
import { formatContentErrors } from "../format-errors.js";

/**
 * Valide une racine de contenu et sort en erreur si elle est invalide.
 * Exécuté en pre-commit : un fichier mal formé n'atteint jamais un commit.
 */
async function main(): Promise<number> {
  const root = resolve(process.argv[2] ?? "content");
  const result = await loadContent(root, { includeUnpublished: true });

  if (!result.ok) {
    process.stderr.write(`${formatContentErrors(result.errors)}\n`);
    return 1;
  }

  const { pieces, projects } = result.content;
  process.stdout.write(`contenu valide : ${pieces.length} pièces, ${projects.length} projets\n`);
  return 0;
}

process.exitCode = await main();
