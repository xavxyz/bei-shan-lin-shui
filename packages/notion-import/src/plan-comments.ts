import { isCollection, isMap, isNode, isScalar, isSeq, type Document, type Node } from "yaml";

/**
 * Les commentaires du plan, chacun à l'endroit qu'il vise : au-dessus d'un
 * nœud (`before`) ou en fin de ligne (`after`). Ils portent ce que le
 * calligraphe sait d'une pièce — une source, une date lue sur le papier, une
 * pièce à refaire — et la suivent dans le contenu.
 */
export type PlanComment = { before?: string; after?: string };

/** Clé : le chemin du nœud visé dans le plan, `pieces.3.versions.0.format`. */
export type PlanComments = Map<string, PlanComment>;

export function collectComments(document: Document): PlanComments {
  const comments: PlanComments = new Map();
  const add = (path: (string | number)[], comment: PlanComment) => {
    const key = path.join(".");
    const existing = comments.get(key) ?? {};
    comments.set(key, {
      before: join(existing.before, comment.before),
      after: join(existing.after, comment.after),
    });
  };

  const walk = (node: unknown, path: (string | number)[], isItem = false) => {
    if (!isCollection(node)) return;

    /* Au-dessus du premier élément, la bibliothèque rattache le commentaire à la
       collection ; celui d'un élément de liste est déjà relevé sur l'élément. */
    if (node.commentBefore && node.items.length > 0 && !isItem) {
      add([...path, firstKey(node)], { before: node.commentBefore });
    }

    if (isSeq(node)) {
      node.items.forEach((item, index) => {
        if (isNode(item)) {
          add([...path, index], {
            before: item.commentBefore ?? undefined,
            after: isCollection(item) ? undefined : (item.comment ?? undefined),
          });
        }
        walk(item, [...path, index], true);
      });
    } else {
      for (const pair of node.items) {
        const key = String(isScalar(pair.key) ? pair.key.value : pair.key);
        const value = pair.value as Node | null;
        add([...path, key], {
          before: join(
            isNode(pair.key) ? (pair.key.commentBefore ?? undefined) : undefined,
            isCollection(value) ? undefined : (value?.commentBefore ?? undefined),
          ),
          after: isCollection(value) ? undefined : (value?.comment ?? undefined),
        });
        walk(value, [...path, key]);
      }
    }
  };

  walk(document.contents, []);
  for (const [key, comment] of comments) {
    if (!comment.before && !comment.after) comments.delete(key);
  }
  return comments;
}

/**
 * Pose sur un document les commentaires d'une entrée du plan : ceux dont le
 * chemin commence par `prefix`, au chemin qui reste.
 */
export function placeComments(document: Document, comments: PlanComments, prefix: string): void {
  for (const [key, comment] of comments) {
    if (key !== prefix && !key.startsWith(`${prefix}.`)) continue;
    const path = key === prefix ? [] : key.slice(prefix.length + 1).split(".");

    /* Le contexte Notion reste au plan, ses commentaires avec lui. */
    if (path[0] === NOTION_KEY) continue;

    const target = find(document, path);
    if (target) {
      /* Au-dessus d'un champ, le commentaire va sur sa clé ; d'un élément de liste, sur lui. */
      above(target.key ?? target.value, comment.before);
      if (target.value && comment.after) {
        target.value.comment = join(target.value.comment ?? undefined, comment.after);
      }
      continue;
    }

    /* Un champ que le contenu n'écrit pas — le fichier source d'une image — laisse
       son commentaire au plus proche de ce qui est écrit, au-dessus de lui. */
    const lines = join(comment.before, comment.after);
    for (let depth = path.length - 1; depth >= 0; depth--) {
      const ancestor = find(document, path.slice(0, depth));
      if (!ancestor) continue;
      above(ancestor.key ?? ancestor.value, lines);
      break;
    }
  }
}

const NOTION_KEY = "notion";

function above(node: Node | undefined, comment: string | undefined): void {
  if (node && comment) node.commentBefore = join(node.commentBefore ?? undefined, comment);
}

/** Le nœud au bout d'un chemin, et sa clé quand il est la valeur d'une paire. */
function find(document: Document, path: string[]): { key?: Node; value?: Node } | undefined {
  let parent: unknown = document.contents;

  /* L'entrée elle-même : son commentaire ouvre le fichier, collé à sa première clé. */
  if (path.length === 0) {
    const first = isMap(parent) ? parent.items[0]?.key : undefined;
    return isNode(first) ? { key: first } : undefined;
  }

  for (const [index, segment] of path.entries()) {
    const last = index === path.length - 1;

    if (isSeq(parent)) {
      const item = parent.items[Number(segment)];
      if (!isNode(item)) return undefined;
      if (last) return { value: item };
      parent = item;
    } else if (isMap(parent)) {
      const pair = parent.items.find(
        (candidate) =>
          String(isScalar(candidate.key) ? candidate.key.value : candidate.key) === segment,
      );
      if (!pair) return undefined;
      if (last) {
        return {
          key: isNode(pair.key) ? pair.key : undefined,
          value: isNode(pair.value) ? pair.value : undefined,
        };
      }
      parent = pair.value;
    } else {
      return undefined;
    }
  }

  return undefined;
}

function firstKey(node: { items: unknown[] }): string | number {
  if (!isMap(node)) return 0;
  const key = node.items[0]!.key;
  return String(isScalar(key) ? key.value : key);
}

function join(...parts: (string | undefined)[]): string | undefined {
  const present = parts.filter((part): part is string => part !== undefined && part !== "");
  return present.length > 0 ? present.join("\n") : undefined;
}
