#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { generateGrids, summarize } from "../index.js";

/**
 * Écrit les feuilles quadrillées d'une pièce dans une page HTML autonome, à
 * ouvrir dans le navigateur et à imprimer. Lit `content/` et `imports/` depuis
 * le répertoire courant ; n'écrit que la page.
 *
 * usage : grilles <slug> [--version vN] [--format <format>]… [--texte <colonnes>] [--out <fichier.html>]
 *
 * `--texte` remplace les colonnes de la version : colonnes séparées par « / ».
 */
const USAGE =
  "usage : grilles <slug> [--version vN] [--format <format>]… [--texte '<col>/<col>/…'] [--out <fichier.html>]\n";

async function main(argv: string[]): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: argv,
      allowPositionals: true,
      options: {
        version: { type: "string" },
        format: { type: "string", multiple: true },
        texte: { type: "string" },
        out: { type: "string" },
      },
    });
  } catch {
    process.stderr.write(USAGE);
    return 2;
  }
  const [slug, ...rest] = parsed.positionals;
  if (!slug || rest.length > 0) {
    process.stderr.write(USAGE);
    return 2;
  }
  const { values } = parsed;

  const result = await generateGrids({
    root: process.cwd(),
    slug,
    version: values.version,
    formats: values.format,
    columns: values.texte?.split(/[/／]/),
  });
  if (!result.ok) {
    process.stderr.write(`${result.message}\n`);
    return 1;
  }

  const out = resolve(values.out ?? `grilles/${slug}.html`);
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, result.html);
  process.stdout.write(`${summarize(result.candidates)}\n\n${pathToFileURL(out).href}\n`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
