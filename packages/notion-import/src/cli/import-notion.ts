#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { formatContentErrors, loadContent } from "@bsls/content";
import { applyImport } from "../apply.js";
import { parsePlan, stringifyPlan } from "../plan-file.js";
import { DEFAULT_HUB_THRESHOLD } from "../propose-projects.js";
import { proposeImport } from "../propose.js";
import { readNotionExport } from "../read-export.js";

/**
 * L'import Notion en deux temps : `plan` propose, le calligraphe arbitre le
 * fichier produit, `apply` écrit. Rien n'atteint le contenu sans relecture.
 */
const USAGE = `usage :
  import:notion plan <export> [--out <plan.yaml>] [--today <AAAA-MM-JJ>] [--seuil <n>]
  import:notion apply <plan.yaml> [--content <racine>]

  <export> : le dossier d'export Notion « Markdown & CSV », ou son seul fichier CSV.
  --seuil  : nombre de liens à partir duquel une page Notion devient un projet
             (${DEFAULT_HUB_THRESHOLD} par défaut).
`;

const PLAN_OPTIONS = ["out", "today", "seuil"];
const APPLY_OPTIONS = ["content"];

async function main(argv: string[]): Promise<number> {
  const [command, target, ...rest] = argv;

  if (command === "plan" && target) {
    const parsed = parseOptions(rest, PLAN_OPTIONS);
    return parsed.ok ? plan(target, parsed.options) : refuse(parsed.message);
  }
  if (command === "apply" && target) {
    const parsed = parseOptions(rest, APPLY_OPTIONS);
    return parsed.ok ? apply(target, parsed.options) : refuse(parsed.message);
  }

  process.stderr.write(USAGE);
  return 2;
}

type Options = Record<string, string>;
type ParsedOptions = { ok: true; options: Options } | { ok: false; message: string };

/** Une option mal écrite est une intention manquée : mieux vaut refuser que l'ignorer. */
function parseOptions(argv: string[], allowed: string[]): ParsedOptions {
  const options: Options = {};

  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]!;
    const value = argv[index + 1];

    if (!flag.startsWith("--")) return { ok: false, message: `option attendue, reçu : ${flag}` };
    const name = flag.slice(2);
    if (!allowed.includes(name)) return { ok: false, message: `option inconnue : ${flag}` };
    if (value === undefined) return { ok: false, message: `option sans valeur : ${flag}` };

    options[name] = value;
  }

  return { ok: true, options };
}

function refuse(message: string): number {
  process.stderr.write(`${message}\n\n${USAGE}`);
  return 2;
}

async function plan(target: string, options: Options): Promise<number> {
  const today = options.today ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    return refuse(`--today attend une date AAAA-MM-JJ, reçu : ${today}`);
  }

  const threshold = options.seuil === undefined ? DEFAULT_HUB_THRESHOLD : Number(options.seuil);
  if (!Number.isInteger(threshold) || threshold < 1) {
    return refuse(`--seuil attend un entier positif, reçu : ${options.seuil}`);
  }

  const pages = await readNotionExport(resolve(target));
  const proposal = proposeImport(pages, { today, hubThreshold: threshold });

  const out = resolve(options.out ?? "notion-import.plan.yaml");
  await writeFile(out, stringifyPlan(proposal), "utf8");

  const warnings = [...proposal.projects, ...proposal.pieces].reduce(
    (total, item) => total + item.warnings.length,
    0,
  );
  process.stdout.write(
    `${proposal.pieces.length} pièces, ${proposal.projects.length} projets proposés, ` +
      `${warnings} points à arbitrer\nplan écrit dans ${out}\n` +
      `relisez-le, corrigez-le, puis : pnpm import:notion apply ${out}\n`,
  );
  return 0;
}

async function apply(target: string, options: Options): Promise<number> {
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
