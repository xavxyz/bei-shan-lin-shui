import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { loadContent } from "@bsls/content";
import { applyImport } from "./apply.js";
import { parsePlan, planFileSchema, type ArbitratedPlan } from "./plan-file.js";
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
        versions: [
          {
            id: "v1",
            date: "2025-12-22",
            format: "2x7",
            columns: ["莫性急平流緩進", "墨行機兔起鶻落"],
            intention: "Deux colonnes,\nencre grasse.",
          },
        ],
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
    arbitrated.pieces[0]!.versions[0]!.variations = [
      {
        id: "v1a",
        script: "xingshu",
        status: "tried",
        images: [
          { file: "v1a-01.jpg", source: scan, featured: true, kind: "work", capture: "scan" },
        ],
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

  it("écrit chaque version telle que le plan la porte", async () => {
    const root = await contentRoot();
    const arbitrated = plan();
    const variation = (id: string, file: string, featured: boolean) => ({
      id,
      script: "kaishu" as const,
      status: "kept" as const,
      images: [{ file, source: scan, featured, kind: "work" as const, capture: "scan" as const }],
    });
    arbitrated.pieces[0]!.versions = [
      {
        id: "v1",
        date: "2026-01-03",
        format: "2x7",
        columns: ["莫性急平流緩進", "墨行機兔起鶻落"],
        variations: [variation("v1a", "v1a.jpg", false)],
      },
      {
        id: "v2",
        date: "2026-02-11",
        format: "2x7 + 蘇東坡",
        columns: ["莫性急平流緩進", "墨行機兔起鶻落"],
        variations: [variation("v2a", "v2a.jpg", true)],
      },
    ];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(result.ok).toBe(true);
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok).toBe(true);
    const piece = loaded.ok ? loaded.content.pieces[0] : undefined;
    expect(piece?.versions.map((version) => [version.id, version.date, version.format])).toEqual([
      ["v1", "2026-01-03", "2x7"],
      ["v2", "2026-02-11", "2x7 + 蘇東坡"],
    ]);
    expect(piece?.versions.map((version) => version.variations.map((v) => v.id))).toEqual([
      ["v1a"],
      ["v2a"],
    ]);
    expect(piece?.featuredImage?.file).toBe("v2a.jpg");
  });

  it("garde le mode de capture d'une image, un scan à défaut", async () => {
    const root = await contentRoot();
    const [piece] = plan().pieces;
    const arbitrated = planFileSchema.parse({
      projects: [],
      pieces: [
        {
          ...piece,
          versions: [
            {
              ...piece!.versions[0],
              variations: [
                {
                  id: "v1a",
                  script: "xingshu",
                  status: "kept",
                  images: [
                    { file: "v1a-01.jpg", source: scan, featured: true },
                    { file: "v1a-02.jpg", source: scan, kind: "context", capture: "photo" },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    await applyImport(arbitrated, { contentRoot: root });

    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(
      loaded.ok && loaded.content.pieces[0]?.latestVersion.variations[0]?.images,
    ).toMatchObject([
      { file: "v1a-01.jpg", kind: "work", capture: "scan" },
      { file: "v1a-02.jpg", kind: "context", capture: "photo" },
    ]);
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
    arbitrated.pieces[0]!.versions[0]!.variations = [
      {
        id: "v1a",
        script: "xingshu",
        status: "tried",
        images: [
          {
            file: "v1a-01.jpg",
            source: "/introuvable.jpg",
            featured: true,
            kind: "work",
            capture: "scan",
          },
        ],
      },
    ];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe(
      "pieces.0.versions.0.variations.0.images.0.source",
    );
  });

  it("refuse un fichier joint que sharp ne sait pas décoder, sans rien écrire", async () => {
    const root = await contentRoot();
    const exportRoot = await writeExportTree({
      "莫性急 abc/scan.heic": Buffer.from("ce n'est pas une image décodable"),
    });
    const arbitrated = plan();
    arbitrated.pieces[0]!.versions[0]!.variations = [
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
            capture: "scan",
          },
        ],
      },
    ];

    const result = await applyImport(arbitrated, { contentRoot: root });

    expect(!result.ok && result.errors[0]?.path).toBe(
      "pieces.0.versions.0.variations.0.images.0.source",
    );
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

/** Les commentaires du plan sont le savoir du calligraphe sur ses pièces : ils lui survivent. */
describe("applyImport, depuis le texte du plan", () => {
  function parsed(text: string): ArbitratedPlan {
    const result = parsePlan(text);
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    return result.plan;
  }

  async function applied(text: string): Promise<string> {
    const root = await contentRoot();
    const result = await applyImport(parsed(text), { contentRoot: root });
    expect(result).toMatchObject({ ok: true });
    expect(await loadContent(root, { includeUnpublished: true })).toMatchObject({ ok: true });
    return readFile(join(root, "pieces/mo-xing-ji/piece.md"), "utf8");
  }

  it("garde en tête du frontmatter le commentaire posé au-dessus d'une pièce", async () => {
    const written = await applied(`
pieces:
  # à refaire
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    published: false
    versions:
      - id: v1
        date: 2025-12-22
        format: 2x7
        columns: [莫性急平流緩進, 墨行機兔起鶻落]
`);

    expect(written).toMatch(/^---\n# à refaire\ntitle: 莫性急\n/);
  });

  it("garde sur son champ le commentaire de fin de ligne", async () => {
    const written = await applied(`
pieces:
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    published: false
    versions:
      - id: v1
        date: 2025-12-22
        format: 2x7 # supposé : ni scan, ni format dans Notion
        columns: [莫性急平流緩進, 墨行機兔起鶻落]
`);

    expect(written).toContain("    format: 2x7 # supposé : ni scan, ni format dans Notion\n");
  });

  it("garde sur sa colonne le commentaire de fin de ligne", async () => {
    const written = await applied(`
pieces:
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    published: false
    versions:
      - id: v1
        date: 2025-12-22
        format: 2x7
        columns:
          - 莫性急平流緩進 # 莫 pour 墨
          - 墨行機兔起鶻落
`);

    expect(written).toContain("      - 莫性急平流緩進 # 莫 pour 墨\n      - 墨行機兔起鶻落\n");
  });

  it("garde au-dessus d'une version, d'une variation, d'une image ou d'un champ ce que le plan y écrivait", async () => {
    const written = await applied(`
pieces:
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    published: false
    versions:
      # date du papier : « 2 26 »
      - id: v1
        date: 2026-01-02
        format: 2x7
        # 墨行機 : 墨 pour 莫
        columns: [莫性急平流緩進, 墨行機兔起鶻落]
      # date du papier : 立春 (丙午)
      - id: v2
        date: 2026-02-11
        format: 2x7
        columns: [莫性急平流緩進, 墨行機兔起鶻落]
        variations:
          # gardée, image mise en avant
          - id: v2a
            script: kaishu
            status: kept
            images:
              # signé 戈
              - file: v2a.jpg
                source: "${scan}"
                featured: true
`);

    expect(written).toContain(
      [
        "versions:",
        "  # date du papier : « 2 26 »",
        "  - id: v1",
        "    date: 2026-01-02",
        "    format: 2x7",
        "    # 墨行機 : 墨 pour 莫",
        "    columns:",
      ].join("\n"),
    );
    expect(written).toContain("  # date du papier : 立春 (丙午)\n  - id: v2\n");
    expect(written).toContain("      # gardée, image mise en avant\n      - id: v2a\n");
    expect(written).toContain("          # signé 戈\n          - file: v2a.jpg\n");
  });

  it("remonte sur l'image le commentaire de son fichier source, et laisse au plan ceux de Notion", async () => {
    const written = await applied(`
pieces:
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    published: false
    versions:
      - id: v1
        date: 2026-01-02
        format: 2x7
        columns: [莫性急平流緩進, 墨行機兔起鶻落]
        variations:
          - id: v1a
            script: kaishu
            status: kept
            images:
              - file: v1a.jpg
                # scanné à l'envers, retourné sur le Drive
                source: "${scan}" # feuille ①
                featured: true
    # page retrouvée par le titre
    notion:
      # relation vers 中和集
      title: 莫性急
`);

    expect(written).toContain(
      "          # scanné à l'envers, retourné sur le Drive\n          # feuille ①\n          - file: v1a.jpg\n",
    );
    expect(written).not.toContain("page retrouvée");
    expect(written).not.toContain("中和集");
  });

  it("garde en tête du fichier d'un projet le commentaire posé au-dessus de lui", async () => {
    const root = await contentRoot();
    const plan = parsed(`
projects:
  - id: zhong-he-ji
    title: 中和集
    presentation: Les pièces tirées du 中和集.
    theme: ink
  # projet désigné par le calligraphe à l'arbitrage du scan 24
  - id: qi-gong
    title: 氣功
    presentation: Lecture des ouvrages de Yang Jwing-Ming.
    theme: ink # les thèmes attendront
pieces: []
`);

    await applyImport(plan, { contentRoot: root });

    expect(await readFile(join(root, "projects/qi-gong.yaml"), "utf8")).toBe(
      [
        "# projet désigné par le calligraphe à l'arbitrage du scan 24",
        "title: 氣功",
        "presentation: Lecture des ouvrages de Yang Jwing-Ming.",
        "theme: ink # les thèmes attendront",
        "",
      ].join("\n"),
    );
    expect(await loadContent(root, { includeUnpublished: true })).toMatchObject({ ok: true });
  });

  it("écrit la source du texte que le plan attribue à la pièce", async () => {
    const root = await contentRoot();
    const plan = parsed(`
pieces:
  - slug: mo-xing-ji
    title: 莫性急
    status: made
    published: false
    source:
      author: 蘇軾
      dynasty: 宋
    versions:
      - id: v1
        date: 2025-12-22
        format: 2x7
        columns: [莫性急平流緩進, 墨行機兔起鶻落]
`);

    await applyImport(plan, { contentRoot: root });

    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]?.source).toMatchObject({
      author: "蘇軾",
      dynasty: "宋",
    });
  });
});
