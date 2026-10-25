import { isCollection, isMap, isNode, isScalar, isSeq, type Document, type Node } from "yaml";

/** Le chemin d'un nœud dans un document : `["versions", 0, "format"]`. */
export type NodePath = (string | number)[];

/**
 * Un commentaire et le nœud qu'il vise : au-dessus de lui (`before`) ou en fin
 * de ligne (`after`). Il porte ce que le calligraphe sait d'une pièce — une
 * source, une date lue sur le papier, une pièce à refaire.
 */
export type NodeComment = { path: NodePath; before?: string; after?: string };

/** Relève les commentaires d'un document, chacun avec le chemin du nœud qu'il vise. */
export function collectComments(document: Document): NodeComment[] {
  const comments = new Map<string, NodeComment>();
  const add = (path: NodePath, before?: string | null, after?: string | null) => {
    const id = path.join(".");
    const existing = comments.get(id);
    comments.set(id, {
      path,
      before: joinLines(existing?.before, before),
      after: joinLines(existing?.after, after),
    });
  };

  const walk = (node: unknown, path: NodePath, isItem = false) => {
    if (!isCollection(node)) return;

    /* Au-dessus du premier élément, la bibliothèque rattache le commentaire à la
       collection ; celui d'un élément de liste est déjà relevé sur l'élément. */
    if (node.commentBefore && node.items.length > 0 && !isItem) {
      add([...path, isMap(node) ? keyOf(node.items[0]!.key) : 0], node.commentBefore);
    }

    if (isSeq(node)) {
      node.items.forEach((item, index) => {
        if (isNode(item)) {
          add([...path, index], item.commentBefore, isCollection(item) ? undefined : item.comment);
        }
        walk(item, [...path, index], true);
      });
    } else {
      for (const pair of node.items) {
        const key = keyOf(pair.key);
        const value = pair.value as Node | null;
        const scalar = isCollection(value) ? undefined : value;
        add(
          [...path, key],
          joinLines(isNode(pair.key) ? pair.key.commentBefore : undefined, scalar?.commentBefore),
          scalar?.comment,
        );
        walk(value, [...path, key]);
      }
    }
  };

  walk(document.contents, []);
  return [...comments.values()].filter((comment) => comment.before || comment.after);
}

/** Les commentaires visant `prefix` ou ce qu'il contient, au chemin qui reste. */
export function commentsUnder(comments: NodeComment[], prefix: NodePath): NodeComment[] {
  return comments
    .filter((comment) => prefix.every((segment, index) => comment.path[index] === segment))
    .map((comment) => ({ ...comment, path: comment.path.slice(prefix.length) }));
}

/** Pose chaque commentaire sur le nœud qu'il vise. */
export function placeComments(document: Document, comments: NodeComment[]): void {
  for (const comment of comments) {
    const target = find(document, comment.path);
    if (target) {
      /* Au-dessus d'un champ, le commentaire va sur sa clé ; d'un élément de liste, sur lui. */
      above(target.key ?? target.value, comment.before);
      if (target.value && comment.after) {
        target.value.comment = joinLines(target.value.comment, comment.after);
      }
      continue;
    }

    /* Un champ que le document n'écrit pas — le fichier source d'une image — laisse
       son commentaire au plus proche de ce qui est écrit, au-dessus de lui. */
    const lines = joinLines(comment.before, comment.after);
    for (let depth = comment.path.length - 1; depth >= 0; depth--) {
      const ancestor = find(document, comment.path.slice(0, depth));
      if (!ancestor) continue;
      above(ancestor.key ?? ancestor.value, lines);
      break;
    }
  }
}

function above(node: Node | undefined, comment: string | undefined): void {
  if (node && comment) node.commentBefore = joinLines(node.commentBefore, comment);
}

/** Le nœud au bout d'un chemin, et sa clé quand il est la valeur d'une paire. */
function find(document: Document, path: NodePath): { key?: Node; value?: Node } | undefined {
  let parent: unknown = document.contents;

  /* Le document lui-même : son commentaire l'ouvre, collé à sa première clé. */
  if (path.length === 0) {
    const first = isMap(parent) ? parent.items[0]?.key : undefined;
    return isNode(first) ? { key: first } : undefined;
  }

  for (const [index, segment] of path.entries()) {
    const last = index === path.length - 1;

    if (isSeq(parent)) {
      const item = typeof segment === "number" ? parent.items[segment] : undefined;
      if (!isNode(item)) return undefined;
      if (last) return { value: item };
      parent = item;
    } else if (isMap(parent)) {
      const pair = parent.items.find((candidate) => keyOf(candidate.key) === segment);
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

function keyOf(key: unknown): string {
  return String(isScalar(key) ? key.value : key);
}

function joinLines(...parts: (string | null | undefined)[]): string | undefined {
  const present = parts.filter((part): part is string => typeof part === "string" && part !== "");
  return present.length > 0 ? present.join("\n") : undefined;
}
