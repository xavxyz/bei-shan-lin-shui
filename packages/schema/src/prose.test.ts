import { describe, expect, it } from "vitest";
import { pieceFrontmatterSchema, projectFileSchema } from "./index.js";

const BLANK = "  \t ";
const BLANK_MESSAGE = "attendu : un texte, ni vide ni fait seulement d'espaces";

const version = {
  id: "v1",
  date: "2026-10-20",
  format: "[(2x5)]",
  columns: ["說到辛酸處", "荒唐愈可悲"],
};

const piece = {
  title: "說到辛酸處",
  slug: "shuo-dao-xin-suan-chu",
  status: "idea",
  versions: [version],
};

function issuesOf(result: { success: boolean; error?: { issues: object[] } }) {
  if (result.success) expect.unreachable("la valeur aurait dû être refusée");
  return result.error!.issues;
}

describe("un texte écrit à la main n'est jamais blanc", () => {
  it("refuse une ligne de traduction faite seulement d'espaces, en pointant la ligne", () => {
    const result = pieceFrontmatterSchema.safeParse({
      ...piece,
      versions: [{ ...version, translation: ["Aux passages d'aigreur,", BLANK] }],
    });

    expect(issuesOf(result)).toEqual([
      expect.objectContaining({ path: ["versions", 0, "translation", 1], message: BLANK_MESSAGE }),
    ]);
  });

  it("refuse une ligne de traduction vide, avec le même message", () => {
    const result = pieceFrontmatterSchema.safeParse({
      ...piece,
      versions: [{ ...version, translation: ["Aux passages d'aigreur,", ""] }],
    });

    expect(issuesOf(result)).toEqual([expect.objectContaining({ message: BLANK_MESSAGE })]);
  });

  it.each([
    ["la glose", { gloss: BLANK }, ["gloss"]],
    ["l'intention", { versions: [{ ...version, intention: BLANK }] }, ["versions", 0, "intention"]],
    ["le texte intégral", { source: { full_text: BLANK } }, ["source", "full_text"]],
  ])("refuse %s d'une pièce faite seulement d'espaces", (_, fields, path) => {
    const result = pieceFrontmatterSchema.safeParse({ ...piece, ...fields });

    expect(issuesOf(result)).toEqual([expect.objectContaining({ path, message: BLANK_MESSAGE })]);
  });

  it.each([["gloss"], ["presentation"]])(
    "refuse le champ %s d'un projet fait seulement d'espaces",
    (field) => {
      const result = projectFileSchema.safeParse({ title: "氣功", [field]: BLANK });

      expect(issuesOf(result)).toEqual([
        expect.objectContaining({ path: [field], message: BLANK_MESSAGE }),
      ]);
    },
  );

  it("garde tel quel un texte entouré d'espaces", () => {
    const result = pieceFrontmatterSchema.safeParse({ ...piece, gloss: " Une glose. " });

    expect(result.success && result.data.gloss).toBe(" Une glose. ");
  });
});
