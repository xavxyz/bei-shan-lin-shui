#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Refuse les marques d'un fait écrit de mémoire (ADR 0004) dans les dossiers
 * donnés, relatifs au répertoire courant. Un fait s'écrit avec sa source, ou
 * reste « à relever » avec l'ouvrage où le chercher : ce qui est accepté.
 * Exécuté par `pnpm validate:content`, donc en pre-commit et en CI.
 */
const MARKS = ["de mémoire", "non collationné", "non relu"];

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && /\.(md|ya?ml)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

async function main(): Promise<number> {
  const dirs = process.argv.slice(2);
  const found: string[] = [];

  for (const dir of dirs) {
    for (const file of await filesUnder(dir)) {
      const lines = (await readFile(file, "utf8")).split("\n");
      lines.forEach((line, index) => {
        const lower = line.toLowerCase();
        for (const mark of MARKS) {
          if (lower.includes(mark)) found.push(`${file}:${index + 1} — « ${mark} »`);
        }
      });
    }
  }

  if (found.length > 0) {
    const count = `${found.length} marque${found.length > 1 ? "s" : ""} de mémoire`;
    const hint =
      "Sourcer le fait, le retirer, ou le laisser « à relever » avec l'ouvrage où le chercher (ADR 0004).";
    process.stderr.write(`${[...found, "", count, hint].join("\n")}\n`);
    return 1;
  }
  return 0;
}

process.exitCode = await main();
