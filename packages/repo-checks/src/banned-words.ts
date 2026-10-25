import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { lineAt, repoFiles } from "./repo-files.js";

/**
 * Les mots que `GLOSSARY.md` marque « _À éviter_ » ne s'écrivent ni dans les
 * skills, ni dans la doc des agents, ni sur le site. Le glossaire lui-même,
 * les ADR qui discutent les termes et les textes de référence ne sont pas lus.
 */

/** Où le vocabulaire du domaine s'impose. `AGENTS.md`, lien vers `CLAUDE.md`, est lu par lui. */
const CHECKED = [
  "CLAUDE.md",
  "CODING_STANDARDS.md",
  "README.md",
  ".claude/skills",
  "docs/agents",
  "apps/site/src",
];

/**
 * Les mots à éviter dont un autre sens a cours dans le dépôt : les signaler
 * noierait les vrais écarts. Ils restent à la relecture.
 */
const HOMONYMS: Record<string, string> = {
  page: "la page HTML, la page Notion",
  dossier: "le dossier du Drive, de l'export",
  photo: "le mode de capture `photo`",
  capture: "le champ `capture`",
  collection: "les collections du content layer d'Astro",
  police: "les polices de caractères du modèle",
  œuvre: "l'œuvre d'un auteur cité, l'image `work`",
  édition: "l'édition d'un fichier, d'un texte source",
  reprise: "reprendre une pièce en veille",
  détail: "l'image `detail`",
  finie: "une tâche finie",
  cadre: "le bord du papier",
  "le maître": "la devise du site, 背山",
};

type Banned = { word: string; term: string; pattern: RegExp };

/** Chaque mot à éviter employé, sous la forme `fichier:ligne — « mot » : dire Terme`. */
export async function findBannedWords(root: string): Promise<string[]> {
  const banned = parseGlossary(await readFile(join(root, "GLOSSARY.md"), "utf8"));
  const files = await repoFiles(root, CHECKED, (path) => /\.(md|astro|tsx?)$/.test(path));
  const findings: string[] = [];

  for (const { path, text } of files) {
    for (const { term, pattern } of banned) {
      for (const match of text.matchAll(pattern)) {
        findings.push(`${path}:${lineAt(text, match.index)} — « ${match[0]} » : dire ${term}`);
      }
    }
  }
  return findings.sort();
}

const ENTRY = /^\*\*(.+?)\*\*.*_À éviter_ : (.+)$/gm;
const TERM = /\*\*(.+?)\*\*/g;

function parseGlossary(glossary: string): Banned[] {
  const terms = new Set([...glossary.matchAll(TERM)].map((match) => lower(match[1]!)));
  const banned: Banned[] = [];

  for (const [, term, list] of glossary.matchAll(ENTRY)) {
    for (const item of list!.split(",").map((word) => word.trim())) {
      // « variante (pour un format candidat) » : le sens visé ne se lit pas au mot.
      if (item.includes("(")) continue;
      if (terms.has(lower(item)) || lower(item) in HOMONYMS) continue;
      banned.push({ word: item, term: term!, pattern: wholeWord(item) });
    }
  }
  return banned;
}

function wholeWord(word: string): RegExp {
  const body = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`(?<![\\p{L}\\p{N}_-])${body}[sx]?(?![\\p{L}\\p{N}_-])`, "giu");
}

function lower(text: string): string {
  return text.toLocaleLowerCase("fr");
}
