#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { formatContentErrors, loadContent } from "@bsls/content";
import { applyImport } from "../apply.js";
import { parsePlan, stringifyPlan } from "../plan-file.js";
import { proposeImport } from "../propose.js";
import { readNotionExport } from "../read-export.js";

/**
 * L'import Notion en deux temps : `plan` propose, le calligraphe arbitre le
 * fichier produit, `apply` écrit. Rien n'atteint le contenu sans relecture.
 */
const USAGE = `usage :
  import:notion plan <export> [--out <plan.yaml>] [--today <AAAA-MM-JJ>]
  import:notion apply <plan.yaml> [--content <racine>]

  <export> : le dossier d'export Notion « Markdown & CSV », ou son seul fichier CSV.
`;

async function main(argv: string[]): Promise<number> {
  const [command, target, ...rest] = argv;
  const options = parseOptions(rest);

  if (command === "plan" && target) return plan(target, options);
  if (command === "apply" && target) return apply(target, options);

  process.stderr.write(USAGE);
  return 2;
}

function parseOptions(argv: string[]): Record<string, string> {
  const options: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (flag?.startsWith("--") && value !== undefined) options[flag.slice(2)] = value;
  }
  return options;
}

async function plan(target: string, options: Record<string, string>): Promise<number> {
  const pages = await readNotionExport(resolve(target));
  const proposal = proposeImport(pages, {
    today: options.today ?? new Date().toISOString().slice(0, 10),
  });

  const out = resolve(options.out ?? "notion-import.plan.yaml");
  await writeFile(out, stringifyPlan(proposal), "utf8");

  const warnings = proposal.pieces.reduce((total, piece) => total + piece.warnings.length, 0);
  process.stdout.write(
    `${proposal.pieces.length} pièces, ${proposal.projects.length} projets proposés, ` +
      `${warnings} points à arbitrer\nplan écrit dans ${out}\n` +
      `relisez-le, corrigez-le, puis : pnpm import:notion apply ${out}\n`,
  );
  return 0;
}

async function apply(target: string, options: Record<string, string>): Promise<number> {
  const parsed = parsePlan(await readFile(resolve(target), "utf8"));
  if (!parsed.ok) {
    process.stderr.write(`plan illisible :\n${format(parsed.errors)}\n`);
    return 1;
  }

  const contentRoot = resolve(options.content ?? "content");
  const result = await applyImport(parsed.plan, { contentRoot });
  if (!result.ok) {
    process.stderr.write(`import refusé, rien n'a été écrit :\n${format(result.errors)}\n`);
    return 1;
  }

  /* Le contenu importé doit passer la validation, sans quoi il casserait le build. */
  const loaded = await loadContent(contentRoot, { includeUnpublished: true });
  if (!loaded.ok) {
    process.stderr.write(`contenu écrit mais invalide :\n${formatContentErrors(loaded.errors)}\n`);
    return 1;
  }

  process.stdout.write(
    `${result.written.length} fichiers écrits dans ${contentRoot}\n` +
      `contenu valide : ${loaded.content.pieces.length} pièces, ${loaded.content.projects.length} projets\n`,
  );
  return 0;
}

function format(errors: { path: string; message: string }[]): string {
  return errors.map((error) => `  ${error.path || "(racine)"} — ${error.message}`).join("\n");
}

process.exitCode = await main(process.argv.slice(2));
