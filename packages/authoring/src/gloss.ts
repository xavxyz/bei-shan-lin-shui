import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDocument } from "yaml";
import { projectFile } from "@bsls/content";
import { pieceFieldsSchema, projectFileSchema, z } from "@bsls/schema";
import { readDraft } from "./drafts.js";
import { editPiece } from "./edit-piece.js";
import { describeIssues, type Outcome } from "./piece-file.js";
import { rootMap, setField } from "./yaml-edit.js";

/** Une glose est une réponse du calligraphe : jamais vide. */
const glossDraftSchema = z.object({ gloss: pieceFieldsSchema.shape.gloss.unwrap() });

/**
 * Écrit la glose d'une pièce : ajoutée sous le titre si elle manque, sinon
 * remplacée. Le reste du fichier ne bouge pas, commentaires compris.
 */
export async function setPieceGloss(
  root: string,
  slug: string,
  gloss: unknown,
): Promise<Outcome<object>> {
  const read = readDraft(glossDraftSchema, { gloss });
  if (!read.ok) return read;

  return editPiece(root, slug, (text, _data, piece) => ({
    edit: setField(text, piece, "gloss", read.draft.gloss, { after: ["title"] }),
    result: {},
  }));
}

/**
 * Écrit la glose d'un projet, comme celle d'une pièce : sous le titre, le reste
 * du fichier intact. Le projet obtenu est vérifié avant d'être écrit.
 */
export async function setProjectGloss(
  root: string,
  projectId: string,
  gloss: unknown,
): Promise<Outcome<object>> {
  const read = readDraft(glossDraftSchema, { gloss });
  if (!read.ok) return read;

  const path = join(root, projectFile(projectId));
  const text = await readFile(path, "utf8").catch(() => undefined);
  if (text === undefined) return { ok: false, message: `projet inconnu : ${projectId}` };

  const project = rootMap(parseDocument(text));
  if (!project) return { ok: false, message: `${projectFile(projectId)} : YAML illisible` };

  const edit = setField(text, project, "gloss", read.draft.gloss, { after: ["title"] });
  if (!edit.ok) return edit;

  const checked = projectFileSchema.safeParse(parseDocument(edit.text).toJS());
  if (!checked.success) return { ok: false, message: describeIssues(checked.error) };

  await writeFile(path, edit.text, "utf8");
  return { ok: true };
}
