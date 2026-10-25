import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content.js";
import { writeFixtureTree } from "./test-support/fixture-tree.js";

const piece = {
  title: "永",
  slug: "yong",
  projects: ["ge-zhi-yan-jiu"],
  status: "idea",
  versions: [{ id: "v1", date: "2026-06-21", format: "1x1", columns: ["永"] }],
  published: true,
};

const project = {
  title: "戈之研究",
  presentation: "Une série sur le trait 戈.\n",
};

async function load(overrides: { piece?: object; project?: object }) {
  const root = await writeFixtureTree({
    projects: { "ge-zhi-yan-jiu": { ...project, ...overrides.project } },
    pieces: { yong: { ...piece, ...overrides.piece } },
  });
  // La pièce n'a pas d'image : on charge tout, comme le mode admin.
  return loadContent(root, { includeUnpublished: true });
}

async function loadValid(overrides: { piece?: object; project?: object }) {
  const result = await load(overrides);
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content;
}

describe("glose", () => {
  it("rend la glose d'une pièce", async () => {
    const content = await loadValid({
      piece: { gloss: "Les 8 mouvements fondamentaux de l'éternité" },
    });

    expect(content.pieces[0]!.gloss).toBe("Les 8 mouvements fondamentaux de l'éternité");
  });

  it("rend la glose d'un projet", async () => {
    const content = await loadValid({ project: { gloss: "Explorations personnelles" } });

    expect(content.projects[0]!.gloss).toBe("Explorations personnelles");
  });

  it("est optionnelle, sur la pièce comme sur le projet", async () => {
    const content = await loadValid({});

    expect(content.pieces[0]!.gloss).toBeUndefined();
    expect(content.projects[0]!.gloss).toBeUndefined();
  });

  it("refuse une glose vide, en désignant le champ", async () => {
    const result = await load({ piece: { gloss: "" } });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.file).toBe("pieces/yong/piece.md");
    expect(result.errors[0]!.path).toBe("gloss");
  });
});
