import { describe, expect, it } from "vitest";
import { parsePlan, stringifyPlan } from "./plan-file.js";
import { proposeImport } from "./propose.js";
import type { NotionPage } from "./read-export.js";

function pages(overrides: Partial<NotionPage>[] = [{}]): NotionPage[] {
  return overrides.map((override) => ({
    title: "莫性急",
    createdAt: "2025-12-22",
    editedAt: "2026-02-23",
    format: "2x7",
    text: "莫性急平流緩進",
    url: "https://app.notion.com/p/abc",
    status: "Mouvementée",
    relations: [],
    body: "",
    attachments: [],
    ...override,
  }));
}

function planFor(overrides?: Partial<NotionPage>[]) {
  return stringifyPlan(proposeImport(pages(overrides), { today: "2026-08-23" }));
}

describe("plan d'import", () => {
  it("se relit tel qu'il a été écrit", () => {
    const result = parsePlan(planFor());

    expect(result.ok).toBe(true);
    expect(result.ok && result.plan.pieces[0]).toMatchObject({
      slug: "mo-xing-ji",
      title: "莫性急",
      status: "made",
      published: false,
      projects: [],
      version: { id: "v1", date: "2025-12-22", format: "2x7" },
    });
  });

  it("porte les avertissements en commentaire, au-dessus de la pièce visée", () => {
    const text = planFor([{ status: "À refaire", format: "" }]);

    expect(text).toMatch(/# à arbitrer — status : /);
    expect(text).toMatch(/# à arbitrer — version\.format : /);
    expect(text.indexOf("à arbitrer")).toBeLessThan(text.indexOf("slug: mo-xing-ji"));
  });

  it("laisse le contexte Notion hors du plan relu", () => {
    const text = planFor([{ relations: ["中和集"] }]);
    const result = parsePlan(text);

    expect(text).toContain("notion:");
    expect(result.ok && result.plan.pieces[0]).not.toHaveProperty("notion");
    expect(JSON.stringify(result.ok && result.plan)).not.toContain("中和集");
  });

  it("accepte les corrections du calligraphe", () => {
    const corrected = planFor().replace("status: made", "status: finished");

    const result = parsePlan(corrected);

    expect(result.ok && result.plan.pieces[0]?.status).toBe("finished");
  });

  it("rejette un statut inconnu en désignant le champ", () => {
    const result = parsePlan(planFor().replace("status: made", "status: terminée"));

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.path).toBe("pieces.0.status");
  });

  it("rejette un YAML illisible", () => {
    const result = parsePlan("pieces: [\n");

    expect(result.ok).toBe(false);
  });

  it("garde le texte multi-ligne lisible en bloc littéral", () => {
    const text = planFor([{ body: "Deux colonnes,\nencre grasse." }]);

    expect(text).toContain("intention: |-");
    expect(parsePlan(text).ok).toBe(true);
  });
});
