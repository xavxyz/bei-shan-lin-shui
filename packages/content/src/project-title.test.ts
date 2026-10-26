import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content.js";
import { writeFixtureTree } from "./test-support/fixture-tree.js";

const project = {
  title: "紅樓夢",
  presentation: "Le 紅樓夢 par ses vers et ses inscriptions.\n",
};

async function load(fields: object) {
  const root = await writeFixtureTree({ projects: { "hong-lou-meng": fields } });
  return loadContent(root);
}

async function loadProject(fields: object) {
  const result = await load(fields);
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content.projects[0]!;
}

describe("le titre d'un projet", () => {
  it("est un texte chinois, dont le simplifié et le pinyin sont dérivés", async () => {
    const loaded = await loadProject(project);

    expect(loaded.title).toEqual({
      traditional: "紅樓夢",
      simplified: "红楼梦",
      pinyin: "hóng lóu mèng",
    });
  });

  it("prend son pinyin dans les surcharges, s'il y en a une", async () => {
    const loaded = await loadProject({
      ...project,
      pinyin_overrides: { 紅樓夢: "Hóng lóu mèng" },
    });

    expect(loaded.title.pinyin).toBe("Hóng lóu mèng");
  });

  it("refuse une surcharge qui ne vise pas son titre, en désignant la clé", async () => {
    const result = await load({ ...project, pinyin_overrides: { 紅樓: "hóng lóu" } });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      expect.objectContaining({
        file: "projects/hong-lou-meng.yaml",
        path: "pinyin_overrides.紅樓",
      }),
    ]);
  });
});

describe("un projet", () => {
  it("est valide sans présentation", async () => {
    const loaded = await loadProject({ title: "戈之研究", gloss: "Explorations personnelles" });

    expect(loaded.title.traditional).toBe("戈之研究");
    expect(loaded.presentation).toBeUndefined();
  });

  it("refuse un thème, qui n'existe plus, en désignant le champ", async () => {
    const result = await load({ ...project, theme: "ink" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toEqual([
      expect.objectContaining({ file: "projects/hong-lou-meng.yaml", path: "theme" }),
    ]);
  });
});
