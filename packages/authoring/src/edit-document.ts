import { parseDocument, type YAMLMap } from "yaml";
import type { z } from "@bsls/schema";
import type { Outcome, Refusal } from "./piece-file.js";
import { rootMap, type Edit } from "./yaml-edit.js";

/**
 * Le circuit commun aux écritures d'un document YAML du contenu, frontmatter
 * de pièce ou fichier de projet : vérifier qu'il est valide, lui appliquer une
 * édition textuelle, vérifier ce qu'elle donne. Lire et écrire restent à
 * l'appelant, qui seul sait où vit le document.
 */

export type Change<T> = { edit: Edit; result: T } | Refusal;

export type ChangeOf<D, T> = (
  text: string,
  data: D,
  map: YAMLMap,
) => Change<T> | Promise<Change<T>>;

/** Le document tel que le schéma le lit, ou la raison de son refus. */
export function checkYaml<S extends z.ZodTypeAny>(
  schema: S,
  text: string,
): Outcome<{ data: z.infer<S> }> {
  const document = parseDocument(text);
  if (document.errors.length > 0) {
    return { ok: false, message: document.errors.map((error) => error.message).join("\n") };
  }
  const result = schema.safeParse(document.toJS());
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: describeIssues(result.error), issues: result.error.issues };
}

export function describeIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "(racine)"} : ${issue.message}`)
    .join("\n");
}

/**
 * Applique `change` au texte d'un document valide, sans rien écrire : rend le
 * texte obtenu s'il est encore valide, ou la raison du refus. `label` nomme le
 * document dans les messages.
 */
export async function applyChange<D, T extends object>(
  label: string,
  text: string,
  check: (text: string) => Outcome<{ data: D }>,
  change: ChangeOf<D, T>,
): Promise<Outcome<{ text: string; result: T }>> {
  const before = check(text);
  if (!before.ok) return { ok: false, message: `${label} est déjà invalide :\n${before.message}` };

  const map = rootMap(parseDocument(text));
  if (!map) return { ok: false, message: `${label} : YAML illisible` };

  const outcome = await change(text, before.data, map);
  if ("ok" in outcome) return outcome;
  if (!outcome.edit.ok) return outcome.edit;

  const after = check(outcome.edit.text);
  if (!after.ok) return after;

  return { ok: true, text: outcome.edit.text, result: outcome.result };
}
