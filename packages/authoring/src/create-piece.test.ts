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
    format: "[(2x5)]",
    columns: ["空山新雨後", "天氣晚來秋"],
    intention: "Retrouver l'humidité\nde la montagne après la pluie.",
  },
  published: false,
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
      format: "[(2x5)]",
      intention: "Retrouver l'humidité\nde la montagne après la pluie.",
      variations: [],
    });
    expect(piece?.versions[0]?.columns.map((column) => column.traditional)).toEqual([
      "空山新雨後",
      "天氣晚來秋",
    ]);
  });

  it("écrit publiée la pièce dont la publication est demandée : le site la montrera une fois scannée", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, { ...draft, published: true });

    expect(result).toMatchObject({ ok: true });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toMatchObject([
      { slug: "shan-ju-qiu-ming", status: "idea", published: true, versions: [{ id: "v1" }] },
    ]);
  });

  it("écrit non publiée la pièce dont la publication est refusée : le site ne la charge pas", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, { ...draft, published: false });

    expect(result).toMatchObject({ ok: true });
    const loaded = await loadContent(root);
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });

  it("refuse sans rien écrire un brouillon qui ne dit pas si la pièce est publiée", async () => {
    const root = await writeTree({});
    const { published: _, ...withoutPublication } = draft;

    const result = await createPiece(root, withoutPublication);

    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toMatch(/^published : .*oui.*non/);
    expect(!result.ok && result.message).not.toMatch(/Required/);
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });

  it("écrit les colonnes sur une ligne, et une à une quand la ligne dépasserait 100 colonnes", async () => {
    const root = await writeTree({});
    const long = [
      "真鉛真汞大丹頭",
      "采取當於罔象求",
      "有作有為終有累",
      "無求無執便無憂",
      "常清常靜心珠現",
      "忘物忘機命寶周",
    ];

    await createPiece(root, draft);
    await createPiece(root, {
      ...draft,
      title: "工夫日用",
      version: { ...draft.version, columns: long },
    });

    expect(await readPieceFile(root, "shan-ju-qiu-ming")).toContain(
      "    columns: [空山新雨後, 天氣晚來秋]\n",
    );
    expect(await readPieceFile(root, "gong-fu-ri-yong")).toContain(
      `    columns:\n${long.map((column) => `      - ${column}\n`).join("")}`,
    );
  });

  it("écrit la glose de la pièce et la traduction de sa version, une ligne par colonne", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, {
      ...draft,
      gloss: "Une glose écrite par le calligraphe.",
      version: { ...draft.version, translation: ["Première ligne", "Seconde ligne"] },
    });

    expect(result).toMatchObject({ ok: true });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]).toMatchObject({
      gloss: "Une glose écrite par le calligraphe.",
      versions: [{ id: "v1", translation: ["Première ligne", "Seconde ligne"] }],
    });
  });

  it("refuse sans rien écrire une traduction qui n'a pas une ligne par colonne", async () => {
    const root = await writeTree({});

    const result = await createPiece(root, {
      ...draft,
      version: { ...draft.version, translation: ["Une seule ligne pour deux colonnes"] },
    });

    expect(result).toMatchObject({ ok: false });
    expect(!result.ok && result.message).toContain("translation");
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
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
      version: { ...draft.version, format: "[(1x5, 1x5)]" },
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
