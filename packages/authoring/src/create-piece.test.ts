import { describe, expect, it } from "vitest";
import { loadContent } from "@bsls/content";
import { createPiece } from "./create-piece.js";
import { writeTree } from "@bsls/content/test-support";
import { PROJECT_FILE, readPieceFile } from "./test-support/content-tree.js";

const draft = {
  title: "山居秋暝",
  source: { author: "王維", work: "山居秋暝", dynasty: "唐", full_text: "空山新雨後\n天氣晚來秋" },
  version: {
    date: "2026-10-16",
    format: "A4 vertical",
    columns: ["空山新雨後", "天氣晚來秋"],
    intention: "Retrouver l'humidité\nde la montagne après la pluie.",
  },
};

describe("createPiece", () => {
  it("fait naître une pièce au statut idée, avec une version initiale, que le content layer accepte", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, draft);

    expect(result).toMatchObject({ ok: true, slug: "shan-ju-qiu-ming" });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok).toBe(true);
    const piece = loaded.ok ? loaded.content.pieces[0] : undefined;
    expect(piece).toMatchObject({
      slug: "shan-ju-qiu-ming",
      status: "idea",
      published: false,
      projects: [],
      source: { author: "王維", work: "山居秋暝", dynasty: "唐" },
    });
    expect(piece?.versions).toHaveLength(1);
    expect(piece?.versions[0]).toMatchObject({
      id: "v1",
      date: "2026-10-16",
      format: "A4 vertical",
      intention: "Retrouver l'humidité\nde la montagne après la pluie.",
      variations: [],
    });
    expect(piece?.versions[0]?.columns.map((column) => column.traditional)).toEqual([
      "空山新雨後",
      "天氣晚來秋",
    ]);
  });

  it("dérive le slug du titre chinois en pinyin sans tons", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, { ...draft, title: "有心求柔，無意成剛" });

    expect(result).toMatchObject({ ok: true, slug: "you-xin-qiu-rou-wu-yi-cheng-gang" });
  });

  it("ne touche jamais une pièce existante : un titre au même pinyin prend un slug suffixé", async () => {
    const root = await writeTree({});
    await createPiece(root, draft);
    const before = await readPieceFile(root, "shan-ju-qiu-ming");

    const result = await createPiece(root, {
      ...draft,
      version: { ...draft.version, format: "A3" },
    });

    expect(result).toMatchObject({ ok: true, slug: "shan-ju-qiu-ming-2" });
    expect(await readPieceFile(root, "shan-ju-qiu-ming")).toBe(before);
  });

  it("rattache la pièce aux projets pour lesquels elle est conçue", async () => {
    const root = await writeTree({ "projects/ge-zhi-yan-jiu.yaml": PROJECT_FILE });

    const result = await createPiece(root, { ...draft, projects: ["ge-zhi-yan-jiu"] });

    expect(result).toMatchObject({ ok: true });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]?.projects).toEqual(["ge-zhi-yan-jiu"]);
  });

  it("refuse sans rien écrire un projet inconnu", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, { ...draft, projects: ["inconnu"] });

    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("inconnu");
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });

  it("refuse sans rien écrire un brouillon qui ne respecte pas le schéma", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, { ...draft, version: { ...draft.version, format: "" } });

    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toMatch(/^version\.format : /);
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });

  it("refuse une date qui n'en est pas une, en nommant le champ du brouillon", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, {
      ...draft,
      version: { ...draft.version, date: "pas une date" },
    });

    expect(!result.ok && result.message).toMatch(/^version\.date : /);
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });
});
