import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { lineAt, repoFiles } from "./repo-files.js";

/**
 * Un chemin du dépôt cité dans la doc, une skill ou un commentaire du contenu
 * doit exister : sinon l'agent qui le suit cherche un fichier disparu. Un
 * chemin retiré se cite avec le commit où il vivait (`git show <sha>:<chemin>`).
 */

/** Où l'on cite des chemins à suivre. `AGENTS.md`, lien vers `CLAUDE.md`, est lu par lui. */
const CITING = [
  "CLAUDE.md",
  "CODING_STANDARDS.md",
  "README.md",
  "GLOSSARY.md",
  "docs",
  ".claude/skills",
  "content",
];

/** Un chemin commence par l'un des dossiers de tête du dépôt. */
const REFERENCE =
  /(?<![\w/.:@-])((?:packages|apps|content|docs|imports|\.claude)\/[A-Za-z0-9_./<>*{}@-]*)/g;

/** `<date>`, `<slug>`, `*.plan.yaml`, `__FILE__` : un gabarit, pas un chemin. */
const TEMPLATE = /[<>*{}]|__/;

/** Le dossier d'un import en cours : il n'existe que le temps de l'import. */
const WORKING_DIRS = new Set(["imports/"]);

/** Chaque chemin cité qui n'existe pas, sous la forme `fichier:ligne — chemin`. */
export async function findStaleReferences(root: string): Promise<string[]> {
  const files = await repoFiles(root, CITING, (path) => /\.(md|ya?ml)$/.test(path));
  const ignored = await gitIgnored(root);
  const findings: string[] = [];

  for (const { path, text } of files) {
    for (const match of text.matchAll(REFERENCE)) {
      const reference = match[1]!.replace(/\.+$/, "");
      if (TEMPLATE.test(reference) || WORKING_DIRS.has(reference)) continue;
      if (existsSync(join(root, reference)) || ignored(reference)) continue;
      if (citedWithCommit(lineOf(text, match.index), reference)) continue;
      findings.push(`${path}:${lineAt(text, match.index)} — ${reference}`);
    }
  }
  return findings;
}

function lineOf(text: string, offset: number): string {
  const start = text.lastIndexOf("\n", offset) + 1;
  const end = text.indexOf("\n", offset);
  return text.slice(start, end === -1 ? undefined : end);
}

function citedWithCommit(line: string, reference: string): boolean {
  return new RegExp(`\\b[0-9a-f]{7,40}:${escape(reference)}`).test(line);
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Les motifs littéraux de `.gitignore` — `dist`, `imports/scans/`, `/grilles/` :
 * ce qu'une commande produit ou ce qu'on garde en local n'est pas versionné.
 * Les motifs à joker ne désignent pas de chemin cité, ils sont laissés de côté.
 */
async function gitIgnored(root: string): Promise<(path: string) => boolean> {
  const text = await readFile(join(root, ".gitignore"), "utf8").catch(() => "");
  const patterns = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#") && !/[*?[!]/.test(line))
    .map((line) => line.replace(/\/$/, ""));

  return (path) => {
    const segments = path.replace(/\/$/, "").split("/");
    return patterns.some((pattern) => {
      const anchored = pattern.startsWith("/") || pattern.includes("/");
      const literal = pattern.replace(/^\//, "");
      if (!anchored) return segments.includes(literal);
      const joined = segments.join("/");
      return joined === literal || joined.startsWith(`${literal}/`);
    });
  };
}
