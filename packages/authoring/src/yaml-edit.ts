import { Document, isMap, isScalar, isSeq, type Node, type YAMLMap } from "yaml";
import type { Refusal } from "./piece-file.js";

/**
 * Éditions textuelles d'un frontmatter : chacune renvoie le texte complet,
 * dont seul l'endroit visé a changé. Aucune ne resérialise le document.
 */

export type Edit = { ok: true; text: string } | Refusal;

/** Ajoute des éléments à la fin de la liste `key` du nœud `parent`, en la créant au besoin. */
export function appendToList(text: string, parent: YAMLMap, key: string, items: unknown[]): Edit {
  const list = parent.get(key, true) as Node | undefined;

  if (list === undefined) {
    const at = lineEnd(text, parent.range![1]);
    return insert(text, at, indent(toYaml({ [key]: items }), column(text, parent.range![0])));
  }

  if (!isSeq(list)) return { ok: false, message: `${key} : attendu une liste` };

  if (list.flow) {
    const existing = list.toJSON() as unknown[];
    const replacement = flowOrBlock(
      key,
      [...existing, ...items],
      column(text, keyStart(parent, key)),
    );
    return {
      ok: true,
      text: text.slice(0, keyStart(parent, key)) + replacement + text.slice(list.range![1]),
    };
  }

  const first = list.items[0] as Node;
  const at = lineEnd(text, list.range![1]);
  return insert(text, at, indent(toYaml(items), column(text, first.range![0]) - 2));
}

/** Remplace la valeur scalaire `key` du nœud `parent`, et rien d'autre. */
export function replaceScalar(text: string, parent: YAMLMap, key: string, value: string): Edit {
  const node = parent.get(key, true) as Node | undefined;
  if (!isScalar(node)) return { ok: false, message: `${key} : attendu une valeur simple` };
  const [start, end] = node.range!;
  return { ok: true, text: text.slice(0, start) + value + text.slice(end) };
}

export function rootMap(doc: Document.Parsed): YAMLMap | undefined {
  return isMap(doc.contents) ? doc.contents : undefined;
}

/** Le nœud de la version `id`, à éditer en place. */
export function versionNode(piece: YAMLMap, id: string): YAMLMap | undefined {
  return versionNodes(piece).find((version) => version.get("id") === id);
}

/** Le nœud de la variation `id`, où qu'elle soit parmi les versions. */
export function variationNode(piece: YAMLMap, id: string): YAMLMap | undefined {
  return versionNodes(piece)
    .flatMap((version) => mapsIn(version.get("variations", true)))
    .find((variation) => variation.get("id") === id);
}

function versionNodes(piece: YAMLMap): YAMLMap[] {
  return mapsIn(piece.get("versions", true));
}

function mapsIn(node: unknown): YAMLMap[] {
  return isSeq(node) ? node.items.filter((item): item is YAMLMap => isMap(item)) : [];
}

/** Texte long jamais replié, prose en bloc littéral, listes en ligne sans espaces intérieurs. */
const YAML_FORMAT = {
  lineWidth: 0,
  flowCollectionPadding: false,
  blockQuote: "literal",
} as const;

/**
 * Sérialise un fragment comme le calligraphe l'écrit : les colonnes d'une
 * version restent sur une ligne, `columns: [永永永, 丙午]`.
 */
export function toYaml(value: unknown): string {
  const document = new Document(value);
  keepColumnsInline(document.contents);
  return document.toString(YAML_FORMAT);
}

/** Les colonnes d'une version, où qu'elles soient dans le fragment, s'écrivent en ligne. */
function keepColumnsInline(node: unknown): void {
  if (isMap(node)) {
    for (const pair of node.items) {
      if (isScalar(pair.key) && pair.key.value === "columns" && isSeq(pair.value)) {
        pair.value.flow = true;
      }
      keepColumnsInline(pair.value);
    }
  } else if (isSeq(node)) {
    node.items.forEach(keepColumnsInline);
  }
}

/** Décale chaque ligne non vide d'un fragment YAML. */
export function indent(fragment: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return fragment
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

/**
 * Une liste de scalaires reste en ligne, comme `projects: [a, b]` ; une liste
 * d'objets passe en bloc. La clé se réécrit à sa colonne d'origine.
 */
function flowOrBlock(key: string, items: unknown[], keyColumn: number): string {
  const scalars = items.every((item) => typeof item === "string");
  if (scalars) return `${key}: [${(items as string[]).join(", ")}]`;
  const block = indent(toYaml({ [key]: items }), keyColumn).trimEnd();
  return block.slice(keyColumn);
}

function keyStart(parent: YAMLMap, key: string): number {
  const pair = parent.items.find((item) => isScalar(item.key) && item.key.value === key);
  return (pair!.key as Node).range![0];
}

function insert(text: string, at: number, fragment: string): Edit {
  const before = text.slice(0, at);
  const separator = before === "" || before.endsWith("\n") ? "" : "\n";
  return { ok: true, text: before + separator + fragment + text.slice(at) };
}

/** Colonne d'un décalage dans le texte. */
function column(text: string, offset: number): number {
  return offset - (text.lastIndexOf("\n", offset - 1) + 1);
}

/** Début de la ligne qui suit la fin d'un nœud : on insère toujours entre deux lignes. */
function lineEnd(text: string, offset: number): number {
  if (offset > 0 && text[offset - 1] === "\n") return offset;
  const next = text.indexOf("\n", offset);
  return next === -1 ? text.length : next + 1;
}
