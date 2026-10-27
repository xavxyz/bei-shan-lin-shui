#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parsePlan } from "../plan-file.js";
import { convertPlanToVersions } from "../plan-versions.js";

/**
 * Convertit sur place un plan à `version:` unique vers `versions: [...]`, en
 * gardant chaque commentaire. Rejouable : une pièce déjà convertie n'est pas
 * touchée, un plan déjà converti n'est pas réécrit.
 *
 * usage : convert-plan-versions <plan.yaml>...
 */
async function main(paths: string[]): Promise<number> {
  if (paths.length === 0) {
    process.stderr.write("usage : convert-plan-versions <plan.yaml>...\n");
    return 2;
  }

  let failed = false;
  for (const path of paths.map((given) => resolve(given))) {
    const { text, converted } = convertPlanToVersions(await readFile(path, "utf8"));
    if (converted > 0) await writeFile(path, text, "utf8");

    const parsed = parsePlan(text);
    process.stdout.write(`${path} : ${converted} pièces converties\n`);
    if (!parsed.ok) {
      failed = true;
      for (const error of parsed.errors) {
        process.stderr.write(`  ${error.path || "(racine)"} — ${error.message}\n`);
      }
    }
  }

  return failed ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
