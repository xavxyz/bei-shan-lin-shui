#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadContent } from "@bsls/content";
import { parsePlan } from "../plan-file.js";
import { parseScanRegistry } from "@bsls/scans";

/**
 * Valide ce qui attend l'import : chaque plan `*.plan.yaml` et le registre des
 * scans. Exécuté en pre-commit, comme la validation du contenu : un plan ou un
 * registre mal formé n'atteint jamais un commit, et ne se découvre pas à `apply`.
 *
 * usage : validate-imports <dossier imports> [<racine du contenu>]
 */
async function main(argv: string[]): Promise<number> {
  const importsDir = resolve(argv[0] ?? "imports");
  const contentRoot = resolve(argv[1] ?? "content");
  const failures: string[] = [];
  const knownPieces = new Map<string, Set<string>>();
  const know = (slug: string, versions: { variations: { id: string }[] }[]) =>
    knownPieces.set(
      slug,
      new Set(versions.flatMap((version) => version.variations.map((variation) => variation.id))),
    );

  const plans = (await readdir(importsDir)).filter((name) => name.endsWith(".plan.yaml")).sort();
  for (const name of plans) {
    const parsed = parsePlan(await readFile(join(importsDir, name), "utf8"));
    if (!parsed.ok) {
      failures.push(`${name} :\n${format(parsed.errors)}`);
      continue;
    }
    parsed.plan.pieces.forEach((piece) => know(piece.slug, piece.versions));
  }

  /* Un contenu invalide est signalé par validate:content ; ici on n'y cherche que des pièces. */
  const content = await loadContent(contentRoot, { includeUnpublished: true });
  if (content.ok) content.content.pieces.forEach((piece) => know(piece.slug, piece.versions));

  const registry = join(importsDir, "scans.yaml");
  let scans = 0;
  if (existsSync(registry)) {
    const parsed = parseScanRegistry(await readFile(registry, "utf8"), { knownPieces });
    if (parsed.ok) scans = parsed.scans.length;
    else failures.push(`scans.yaml :\n${format(parsed.errors)}`);
  }

  if (failures.length > 0) {
    process.stderr.write(`${failures.join("\n\n")}\n`);
    return 1;
  }

  process.stdout.write(`imports valides : ${plans.length} plans, ${scans} scans au registre\n`);
  return 0;
}

function format(errors: { path: string; message: string }[]): string {
  return errors.map((error) => `  ${error.path || "(racine)"} — ${error.message}`).join("\n");
}

process.exitCode = await main(process.argv.slice(2));
