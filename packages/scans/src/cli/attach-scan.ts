#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse } from "yaml";
import { attachScan } from "../attach.js";

/**
 * Rattache un scan arbitré à une pièce du contenu. La skill `scans` écrit le
 * rattachement dans un fichier YAML, après la réponse du calligraphe, et
 * appelle cette commande ; le chemin du scan se lit depuis le répertoire courant.
 *
 * usage : attach:scan <rattachement.yaml> [--content <racine>]
 */
const USAGE = "usage : attach:scan <rattachement.yaml> [--content <racine>]\n";

async function main(argv: string[]): Promise<number> {
  const [file, flag, value, ...rest] = argv;
  if (!file || rest.length > 0 || (flag !== undefined && (flag !== "--content" || !value))) {
    process.stderr.write(USAGE);
    return 2;
  }

  let attachment: unknown;
  try {
    attachment = parse(await readFile(resolve(file), "utf8"));
  } catch (cause) {
    process.stderr.write(`${file} illisible : ${(cause as Error).message}\n`);
    return 1;
  }

  /* Le scan désigné par un chemin relatif se trouve depuis le dépôt, pas depuis le fichier. */
  if (isRecord(attachment) && isRecord(attachment.image)) {
    const source = attachment.image.source;
    if (typeof source === "string") attachment.image.source = resolve(source);
  }

  const result = await attachScan(attachment, { contentRoot: resolve(value ?? "content") });
  if (!result.ok) {
    const lines = result.errors.map((error) => `  ${error.path || "(racine)"} — ${error.message}`);
    process.stderr.write(`rattachement refusé, rien n'est écrit :\n${lines.join("\n")}\n`);
    return 1;
  }

  process.stdout.write(`rattaché :\n${result.written.map((path) => `  ${path}`).join("\n")}\n`);
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

process.exitCode = await main(process.argv.slice(2));
