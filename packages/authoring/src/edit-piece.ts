import type { YAMLMap } from "yaml";
import type { PieceFrontmatter } from "@bsls/schema";
import { checkPiece, parseFrontmatter, readPiece, writePiece, type Outcome } from "./piece-file.js";
import { rootMap, type Edit } from "./yaml-edit.js";

export function compact(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}

type Change<T> = { edit: Edit; result: T } | { ok: false; message: string };

/**
 * Lit une pièce valide, applique une édition textuelle, et n'écrit que si la
 * pièce obtenue est encore valide. Sinon, rien n'est écrit.
 */
export async function editPiece<T extends object>(
  root: string,
  slug: string,
  change: (text: string, data: PieceFrontmatter, piece: YAMLMap) => Change<T> | Promise<Change<T>>,
): Promise<Outcome<T>> {
  const read = await readPiece(root, slug);
  if (!read.ok) return read;

  const before = checkPiece(read.piece.frontmatter);
  if (!before.ok) return { ok: false, message: `${slug} est déjà invalide :\n${before.message}` };

  const map = rootMap(parseFrontmatter(read.piece.frontmatter));
  if (!map) return { ok: false, message: `${slug} : frontmatter illisible` };

  const outcome = await change(read.piece.frontmatter, before.data, map);
  if ("ok" in outcome) return outcome;
  if (!outcome.edit.ok) return outcome.edit;

  const after = checkPiece(outcome.edit.text);
  if (!after.ok) return after;

  await writePiece({ ...read.piece, frontmatter: outcome.edit.text });
  return { ok: true, ...outcome.result };
}
