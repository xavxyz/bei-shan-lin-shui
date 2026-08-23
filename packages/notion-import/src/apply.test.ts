import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { loadContent } from "@bsls/content";
import { applyImport } from "./apply.js";
import { planFileSchema, type ArbitratedPlan } from "./plan-file.js";
import { writeExportTree } from "./test-support/export-tree.js";

let scan = "";

beforeAll(async () => {
  const jpeg = await sharp({
    create: { width: 4000, height: 6000, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  const root = await writeExportTree({ "莫性急 abc/scan.png": jpeg });
  scan = join(root, "莫性急 abc/scan.png");
});

function plan(overrides: Partial<ArbitratedPlan> = {}): ArbitratedPlan {
  return planFileSchema.parse({
    projects: [],
    pieces: [
      {
        slug: "mo-xing-ji",
        title: "莫性急",
        status: "made",
        published: true,
        version: {
          id: "v1",
          date: "2025-12-22",
          format: "2x7",
          columns: ["莫性急平流緩進", "墨行機兔起鶻落"],
          intention: "Deux colonnes,\nencre grasse.",
        },
      },
    ],
    ...overrides,
  });
}

async function contentRoot(): Promise<string> {
  return mkdtemp(join(tmpdir(), "bsls-import-"));
}

describe("applyImport", () => {
  it("écrit une pièce que le content layer accepte", async () => {
    const root = await contentRoot();

    const result = await applyImport(plan(), { contentRoot: root });

    expect(result).toMatchObject({ ok: true });
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok).toBe(true);
    expect(loaded.ok && loaded.content.pieces[0]).toMatchObject({
      slug: "mo-xing-ji",
      status: "made",
      title: { traditional: "莫性急" },
      latestVersion: { id: "v1", date: "2025-12-22", format: "2x7" },
    });
  });

  it("n'écrit aucune trace de l'échafaudage Notion", async () => {
    const root = await contentRoot();
    const arbitrated = plan();
    /* Le bloc de contexte est présent dans le fichier de plan, jamais dans le contenu. */
    Object.assign(arbitrated.pieces[0]!, {
      notion: { title: "莫性急", url: "https://app.notion.com/p/abc", relations: ["中和集"] },
    });

    await applyImport(arbitrated, { contentRoot: root });

    const written = await readFile(join(root, "pieces/mo-xing-ji/piece.md"), "utf8");
    expect(written).not.toContain("notion");
    expect(written).not.toContain("中和集");
    expect(written).not.toContain("http");
  });

  it("rapatrie les fichiers joints et les normalise en JPEG", async () => {
    const root = await contentRoot();
    const arbitrated = plan();
    arbitrated.pieces[0]!.variations = [
      {
        id: "v1a",
        script: "xingshu",
        status: "tried",
        images: [{ file: "v1a-01.jpg", source: scan, featured: true, kind: "work" }],
      },
    ];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(result.ok).toBe(true);
    const image = sharp(join(root, "pieces/mo-xing-ji/images/v1a-01.jpg"));
    const { format, width, height } = await image.metadata();
    expect(format).toBe("jpeg");
    expect(width).toBeLessThanOrEqual(2480);
    expect(height).toBeLessThanOrEqual(3508);
    expect(await loadContent(root, { includeUnpublished: true })).toMatchObject({ ok: true });
  });

  it("écrit les projets et leur rattache les pièces", async () => {
    const root = await contentRoot();
    const arbitrated = plan({
      projects: [
        {
          id: "zhong-he-ji",
          title: "中和集",
          presentation: "Les pièces tirées du 中和集.",
          theme: "jade",
        },
      ],
    });
    arbitrated.pieces[0]!.projects = ["zhong-he-ji"];

    await applyImport(arbitrated, { contentRoot: root });

    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.projects[0]).toMatchObject({
      id: "zhong-he-ji",
      pieceSlugs: ["mo-xing-ji"],
    });
  });

  it("refuse d'écraser une pièce déjà sur le disque", async () => {
    const root = await contentRoot();
    await mkdir(join(root, "pieces/mo-xing-ji"), { recursive: true });
    await writeFile(join(root, "pieces/mo-xing-ji/piece.md"), "déjà là");

    const result = await applyImport(plan(), { contentRoot: root });

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors[0]?.path).toBe("pieces.0.slug");
    expect(await readFile(join(root, "pieces/mo-xing-ji/piece.md"), "utf8")).toBe("déjà là");
  });

  it("refuse un projet sans présentation, et n'écrit alors rien du tout", async () => {
    const root = await contentRoot();
    const arbitrated = plan({
      projects: [{ id: "zhong-he-ji", title: "中和集", presentation: "", theme: "jade" }],
    });
    arbitrated.pieces[0]!.projects = ["zhong-he-ji"];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe("projects.0.presentation");
    await expect(readFile(join(root, "pieces/mo-xing-ji/piece.md"), "utf8")).rejects.toThrow();
  });

  it("refuse un classement vers un projet que rien ne décrit", async () => {
    const root = await contentRoot();
    const arbitrated = plan();
    arbitrated.pieces[0]!.projects = ["fantome"];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe("pieces.0.projects.0");
  });

  it("signale un fichier joint absent de l'export", async () => {
    const root = await contentRoot();
    const arbitrated = plan();
    arbitrated.pieces[0]!.variations = [
      {
        id: "v1a",
        script: "xingshu",
        status: "tried",
        images: [{ file: "v1a-01.jpg", source: "/introuvable.jpg", featured: true, kind: "work" }],
      },
    ];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe("pieces.0.variations.0.images.0.source");
  });

  it("refuse un fichier joint que sharp ne sait pas décoder, sans rien écrire", async () => {
    const root = await contentRoot();
    const exportRoot = await writeExportTree({
      "莫性急 abc/scan.heic": Buffer.from("ce n'est pas une image décodable"),
    });
    const arbitrated = plan();
    arbitrated.pieces[0]!.variations = [
      {
        id: "v1a",
        script: "xingshu",
        status: "tried",
        images: [
          {
            file: "v1a-01.jpg",
            source: join(exportRoot, "莫性急 abc/scan.heic"),
            featured: true,
            kind: "work",
          },
        ],
      },
    ];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe("pieces.0.variations.0.images.0.source");
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces).toEqual([]);
  });

  it("refuse deux pièces qui se disputent le même slug", async () => {
    const root = await contentRoot();
    const arbitrated = plan();
    arbitrated.pieces.push({ ...arbitrated.pieces[0]! });

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe("pieces.1.slug");
  });
});
