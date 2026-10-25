import { lineAt, repoFiles } from "./repo-files.js";

/**
 * Le frontmatter s'écrit par une seule couture, `packages/authoring` (CLAUDE.md,
 * « Où vivent les choses »). Ailleurs, le code lit le YAML et n'en écrit pas :
 * il n'importe de `yaml` que ce qui lit, et ne recopie pas d'options de
 * sérialisation. Les tests et leurs fixtures écrivent librement.
 */

/** Ce que `yaml` offre pour lire : le reste sert à écrire. */
const READING = new Set([
  "parse",
  "parseDocument",
  "parseAllDocuments",
  "isAlias",
  "isCollection",
  "isDocument",
  "isMap",
  "isNode",
  "isPair",
  "isScalar",
  "isSeq",
]);

/** Les options qui ne servent qu'à sérialiser : leur présence trahit une écriture. */
const SERIALIZING =
  /\b(lineWidth|blockQuote|flowCollectionPadding|defaultStringType|defaultKeyType|indentSeq|minContentWidth)\s*:/;

/** Les écrivains YAML admis hors de la couture, et pourquoi. */
const ALLOWED: Record<string, string> = {
  "packages/notion-import/src/plan-file.ts": "écrit le plan d'import, pas le contenu",
  "packages/notion-import/src/plan-versions.ts": "convertit le plan d'import, pas le contenu",
};

const IMPORT_FROM_YAML = /import\s+(type\s+)?([^;]*?)\s+from\s+["']yaml["']/g;

/** Chaque écriture YAML hors de la couture, sous la forme `fichier:ligne — motif`. */
export async function findYamlWriters(root: string): Promise<string[]> {
  const files = await repoFiles(root, ["packages", "apps"], isProductionSource);
  const findings: string[] = [];

  for (const { path, text } of files) {
    if (path.startsWith("packages/authoring/") || path in ALLOWED) continue;
    let importsYaml = false;

    for (const match of text.matchAll(IMPORT_FROM_YAML)) {
      importsYaml = true;
      if (match[1]) continue;
      const at = `${path}:${lineAt(text, match.index)}`;
      const clause = match[2]!;
      if (!clause.startsWith("{")) {
        findings.push(`${at} — importe yaml en entier`);
        continue;
      }
      for (const name of namedValues(clause)) {
        if (!READING.has(name)) findings.push(`${at} — importe ${name} de yaml`);
      }
    }

    if (!importsYaml) continue;
    const option = SERIALIZING.exec(text);
    if (option) {
      findings.push(
        `${path}:${lineAt(text, option.index)} — options de sérialisation YAML (${option[1]})`,
      );
    }
  }
  return findings;
}

function isProductionSource(path: string): boolean {
  return (
    /\.(ts|tsx|astro)$/.test(path) &&
    !/\.test\.ts$/.test(path) &&
    !path.includes("/test-support/") &&
    !path.includes("/tests/")
  );
}

/** Les noms importés comme valeurs : `{ a, type B, c as d }` donne `a` et `c`. */
function namedValues(clause: string): string[] {
  return clause
    .replace(/[{}]/g, "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "" && !item.startsWith("type "))
    .map((item) => item.split(/\s+as\s+/)[0]!);
}
