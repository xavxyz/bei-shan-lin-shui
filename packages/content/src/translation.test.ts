import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content.js";
import { writeFixtureTree } from "./test-support/fixture-tree.js";

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
  published: true,
};

async function load(overrides: { versions?: object[]; piece?: object }) {
  const root = await writeFixtureTree({
    pieces: {
      "shuo-dao-xin-suan-chu": {
        ...piece,
        versions: overrides.versions ?? [version],
        ...overrides.piece,
      },
    },
  });
  /* Tout le contenu, comme à la validation : la pièce n'a pas d'image. */
  return loadContent(root, { includeUnpublished: true });
}

async function loadErrors(overrides: { versions?: object[]; piece?: object }) {
  const result = await load(overrides);
  if (result.ok) expect.unreachable("le chargement aurait dû échouer");
  return result.errors;
}

describe("traduction par colonne", () => {
  it("rend la traduction d'une version, une ligne par colonne", async () => {
    const result = await load({
      versions: [
        {
          ...version,
          translation: [
            "Aux passages d'aigreur ou même d'âcreté,",
            "L'exagération n'en devient que plus vaine ;",
          ],
        },
      ],
    });

    if (!result.ok) expect.unreachable(JSON.stringify(result.errors));
    expect(result.content.pieces[0]!.latestVersion.translation).toEqual([
      "Aux passages d'aigreur ou même d'âcreté,",
      "L'exagération n'en devient que plus vaine ;",
    ]);
  });

  it("est optionnelle", async () => {
    const result = await load({});

    if (!result.ok) expect.unreachable(JSON.stringify(result.errors));
    expect(result.content.pieces[0]!.latestVersion.translation).toBeUndefined();
  });

  it("refuse une traduction plus courte que les colonnes, en pointant la version", async () => {
    const errors = await loadErrors({
      versions: [{ ...version, translation: ["Aux passages d'aigreur ou même d'âcreté,"] }],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe("pieces/shuo-dao-xin-suan-chu/piece.md");
    expect(errors[0]!.path).toBe("versions.0.translation");
    expect(errors[0]!.message).toContain("2 colonnes");
  });

  it("refuse une traduction plus longue que les colonnes, en pointant la version", async () => {
    const errors = await loadErrors({
      versions: [
        { ...version, date: "2026-10-01", translation: ["Un", "Deux"] },
        { ...version, id: "v2", translation: ["Un", "Deux", "Trois"] },
      ],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe("versions.1.translation");
  });

  it("refuse une ligne vide, en pointant la version", async () => {
    const errors = await loadErrors({
      versions: [{ ...version, translation: ["Aux passages d'aigreur ou même d'âcreté,", ""] }],
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toMatch(/^versions\.0\.translation/);
  });

  it("refuse une traduction de pièce", async () => {
    const errors = await loadErrors({
      piece: { translation: "Aux passages d'aigreur ou même d'âcreté," },
    });

    expect(errors).toHaveLength(1);
    expect(errors[0]!.path).toBe("translation");
    expect(errors[0]!.message).toContain("version");
  });
});
