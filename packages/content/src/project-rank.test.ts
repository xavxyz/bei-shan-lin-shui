import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content.js";
import { writeFixtureTree } from "./test-support/fixture-tree.js";

async function loadIds(projects: Record<string, object>) {
  const result = await loadContent(await writeFixtureTree({ projects }));
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content.projects.map((project) => project.id);
}

describe("le rang des projets", () => {
  it("suit l'identifiant quand aucun projet n'a de rang", async () => {
    const ids = await loadIds({
      shan: { title: "山" },
      feng: { title: "風" },
      yue: { title: "月" },
    });

    expect(ids).toEqual(["feng", "shan", "yue"]);
  });

  it("place après les autres un projet de rang positif, avant eux un projet de rang négatif", async () => {
    const ids = await loadIds({
      feng: { title: "風", rank: 1 },
      shan: { title: "山" },
      yue: { title: "月", rank: -1 },
      hua: { title: "花" },
    });

    expect(ids).toEqual(["yue", "hua", "shan", "feng"]);
  });

  it("refuse un rang qui n'est pas un entier", async () => {
    const result = await loadContent(
      await writeFixtureTree({ projects: { feng: { title: "風", rank: 1.5 } } }),
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]).toMatchObject({
      file: "projects/feng.yaml",
      path: "rank",
    });
  });
});
