import { Document, isMap, isNode, isScalar, isSeq, type Node, type YAMLMap } from "yaml";
import { placeComments, type NodeComment } from "./comments.js";
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
    const atColumn = column(text, parent.range![0]);
    return insert(text, at, indent(toYaml({ [key]: items }, { column: atColumn }), atColumn));
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
  const itemsColumn = column(text, first.range![0]) - 2;
  return insert(text, at, indent(toYaml(items, { column: itemsColumn }), itemsColumn));
}

/** Remplace la valeur scalaire `key` du nœud `parent`, et rien d'autre. */
export function replaceScalar(text: string, parent: YAMLMap, key: string, value: string): Edit {
  const node = parent.get(key, true) as Node | undefined;
  if (!isScalar(node)) return { ok: false, message: `${key} : attendu une valeur simple` };
  const [start, end] = node.range!;
  return { ok: true, text: text.slice(0, start) + value + text.slice(end) };
}

/**
 * Écrit le champ `key` du nœud `parent` : remplacé s'il existe, à sa colonne,
 * sinon inséré après le premier champ présent de `after`, ou à la fin du nœud.
 */
export function setField(
  text: string,
  parent: YAMLMap,
  key: string,
  value: unknown,
  options: { after?: string[] } = {},
): Edit {
  const existing = pairOf(parent, key);
  if (existing) {
    const start = (existing.key as Node).range![0];
    const end = valueEnd(existing, start);
    const keyColumn = column(text, start);
    const fragment = indent(toYaml({ [key]: value }, { column: keyColumn }), keyColumn);
    const replacement = text[end - 1] === "\n" ? fragment : fragment.trimEnd();
    return {
      ok: true,
      text: text.slice(0, start) + replacement.slice(keyColumn) + text.slice(end),
    };
  }

  const anchor = (options.after ?? []).map((name) => pairOf(parent, name)).find(Boolean);
  const anchorStart = anchor ? (anchor.key as Node).range![0] : parent.range![0];
  const at = lineEnd(text, anchor ? valueEnd(anchor, anchorStart) : parent.range![1]);
  const atColumn = column(text, anchorStart);
  return insert(text, at, indent(toYaml({ [key]: value }, { column: atColumn }), atColumn));
}

type Pair = YAMLMap["items"][number];

function pairOf(parent: YAMLMap, key: string): Pair | undefined {
  return parent.items.find((item) => isScalar(item.key) && item.key.value === key);
}

/** Fin de la valeur d'une paire, commentaire de fin de ligne exclu. */
function valueEnd(pair: Pair, keyStart: number): number {
  const value = pair.value as Node | null;
  return value?.range ? value.range[1] : keyStart;
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

export type YamlOptions = {
  /** Les commentaires à poser, chacun sur le nœud qu'il vise. */
  comments?: NodeComment[];
  /** La colonne où le fragment sera inséré : elle compte dans la largeur d'une ligne. */
  column?: number;
};

/**
 * Sérialise un fragment comme le calligraphe l'écrit : les colonnes d'une
 * version restent sur une ligne, `columns: [永永永, 丙午]`. Les commentaires
 * se posent sur les nœuds qu'ils visent.
 */
export function toYaml(value: unknown, options: YamlOptions = {}): string {
  const document = new Document(value);
  placeComments(document, options.comments ?? []);
  keepColumnsInline(document.contents, options.column ?? 0);
  return document.toString(YAML_FORMAT);
}

/** La largeur de ligne de Prettier, qui vérifie le contenu en pre-commit (`.prettierrc`). */
const PRINT_WIDTH = 100;

/**
 * Les colonnes d'une version, où qu'elles soient dans le fragment, s'écrivent
 * en ligne quand la ligne tient dans la largeur de Prettier, qui la replierait
 * sinon ; une colonne commentée garde la sienne.
 */
function keepColumnsInline(node: unknown, column: number): void {
  if (isMap(node)) {
    for (const pair of node.items) {
      const value = pair.value;
      if (isScalar(pair.key) && pair.key.value === "columns" && isSeq(value)) {
        const columns = value.items.map((item) => String(isScalar(item) ? item.value : item));
        const width = column + displayWidth(`columns: [${columns.join(", ")}]`);
        const commented = value.items.some(
          (item) => isNode(item) && (item.comment || item.commentBefore),
        );
        value.flow = !commented && width <= PRINT_WIDTH;
      }
      keepColumnsInline(value, column + 2);
    }
  } else if (isSeq(node)) {
    for (const item of node.items) keepColumnsInline(item, column + 2);
  }
}

/** Largeur affichée, comme Prettier la compte : un caractère chinois en vaut deux. */
function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += WIDE.test(char) ? 2 : 1;
  return width;
}

const WIDE =
  /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{20000}-\u{3FFFD}]/u;

/** Décale chaque ligne non vide d'un fragment YAML. */
export function indent(fragment: string, spaces: number): string {
  const pad = " ".repeat(spaces);
  return fragment
    .split("\n")
    .map((line) => (line === "" ? line : pad + line))
    .join("\n");
}

/**
 * Une liste de scalaires reste en ligne, comme `projects: [a, b]`, tant que la
 * ligne tient dans la largeur de Prettier ; au-delà, comme une liste d'objets,
 * elle passe en bloc. La clé se réécrit à sa colonne d'origine.
 */
function flowOrBlock(key: string, items: unknown[], keyColumn: number): string {
  const scalars = items.every((item) => typeof item === "string");
  const inline = `${key}: [${(items as string[]).join(", ")}]`;
  if (scalars && keyColumn + displayWidth(inline) <= PRINT_WIDTH) return inline;
  const block = indent(toYaml({ [key]: items }, { column: keyColumn }), keyColumn).trimEnd();
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
