import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { beforeAll, describe, expect, it } from "vitest";
import { loadContent, pieceFile, pieceImageFile } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";
import { attachScan } from "./attach.js";

/** Une pièce telle que le calligraphe l'écrit : commentaires, flux, corps Markdown. */
const PIECE = `---
title: 永草書
slug: yong-cao-shu
status: idea
versions:
  - id: v1
    date: 2026-06-21
    format: A4
    columns: [永，丙午夏至]
    intention: |
      Exploration sans modèle du caractère 永 en cursive.
    variations:
      - id: v1a
        script: caoshu
        status: kept
        images:
          - file: v1a.jpg
            kind: work # work | detail | study | context
            capture: photo # scan | photo
            featured: true
          # une autre feuille, du même jour
          - file: v1a-02.jpg
            kind: study
            capture: scan
      - id: v1b # variation en régulier
        script: kaishu
        status: tried
translation: |
  Les 8 mouvements fondamentaux de l'éternité.
published: true
---

Notes du calligraphe : **ne pas** toucher.
`;

let scan = "";
let notAnImage = "";

beforeAll(async () => {
  const dir = await mkdtemp(join(tmpdir(), "bsls-drive-"));
  scan = join(dir, "2026-10-11_28_01.jpeg");
  await sharp({ create: { width: 4000, height: 6000, channels: 3, background: "white" } })
    .jpeg()
    .toFile(scan);
  notAnImage = join(dir, "2026-10-11_29_01.jpeg");
  await writeFile(notAnImage, "pas une image");
});

/** Un vrai contenu sur le disque : la pièce, ses images existantes. */
async function contentWithPiece(text = PIECE): Promise<string> {
  return writeTree({
    [pieceFile("yong-cao-shu")]: text,
    [pieceImageFile("yong-cao-shu", "v1a.jpg")]: "image existante",
    [pieceImageFile("yong-cao-shu", "v1a-02.jpg")]: "image existante",
  });
}

const readPiece = (root: string) => readFile(join(root, pieceFile("yong-cao-shu")), "utf8");

describe("rattacher un scan à une pièce du contenu", () => {
  it("ajoute l'image en fin de variation et laisse le reste du fichier identique", async () => {
    const root = await contentWithPiece();

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1a",
        image: { source: scan, kind: "study", caption: "Le trait 努 isolé." },
      },
      { contentRoot: root },
    );

    expect(result).toEqual({
      ok: true,
      written: ["pieces/yong-cao-shu/images/v1a-03.jpg", "pieces/yong-cao-shu/piece.md"],
    });
    expect(await readPiece(root)).toBe(
      PIECE.replace(
        `            capture: scan
      - id: v1b`,
        `            capture: scan
          - file: v1a-03.jpg
            kind: study
            capture: scan
            caption: Le trait 努 isolé.
      - id: v1b`,
      ),
    );
  });

  it("ouvre la liste d'images d'une variation qui n'en a pas encore", async () => {
    const root = await contentWithPiece();

    await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1b",
        image: { source: scan, kind: "work" },
      },
      { contentRoot: root },
    );

    expect(await readPiece(root)).toBe(
      PIECE.replace(
        `        status: tried
`,
        `        status: tried
        images:
          - file: v1b.jpg
            kind: work
            capture: scan
`,
      ),
    );
  });

  it("prolonge une liste d'images écrite en flux, commentaires compris", async () => {
    const root = await contentWithPiece(
      PIECE.replace("status: tried\n", "status: tried\n        images: []\n"),
    );

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1b",
        image: { source: scan, kind: "work" },
      },
      { contentRoot: root },
    );

    expect(result).toMatchObject({ ok: true });
    const text = await readPiece(root);
    expect(text).toContain("- id: v1b # variation en régulier");
    expect(text).toContain("# une autre feuille, du même jour");
    expect(text).toContain("Notes du calligraphe : **ne pas** toucher.");
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.pieces[0]?.versions[0]?.variations[1]?.images).toMatchObject(
      [{ file: "v1b.jpg", kind: "work", capture: "scan" }],
    );
  });

  it("ajoute une nouvelle variation à une version existante sans toucher ses sœurs", async () => {
    const root = await contentWithPiece();

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: { id: "v1c", script: "xingshu", status: "kept", personal_note: "Plus libre." },
        image: { source: scan, kind: "work", featured: true },
      },
      { contentRoot: root },
    );

    expect(result).toMatchObject({ ok: true });
    expect(await readPiece(root)).toBe(
      PIECE.replace(
        `        status: tried
`,
        `        status: tried
      - id: v1c
        script: xingshu
        status: kept
        personal_note: Plus libre.
        images:
          - file: v1c.jpg
            kind: work
            capture: scan
            featured: true
`,
      ),
    );
  });

  it("ajoute une nouvelle version après les précédentes, qui restent intactes", async () => {
    const root = await contentWithPiece();

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: {
          id: "v2",
          date: "2026-10-11",
          format: "2x7",
          columns: ["永永永", "丙午"],
          intention: "Reprise sur grille.\n",
        },
        variation: { id: "v2a", script: "caoshu", status: "kept" },
        image: { source: scan, kind: "work", featured: true },
      },
      { contentRoot: root },
    );

    expect(result).toMatchObject({ ok: true });
    expect(await readPiece(root)).toBe(
      PIECE.replace(
        `        status: tried
`,
        `        status: tried
  - id: v2
    date: 2026-10-11
    format: 2x7
    columns: [永永永, 丙午]
    intention: |
      Reprise sur grille.
    variations:
      - id: v2a
        script: caoshu
        status: kept
        images:
          - file: v2a.jpg
            kind: work
            capture: scan
            featured: true
`,
      ),
    );
  });

  it("normalise le scan en JPEG qualité 92, sans dépasser l'A4 à 300 dpi", async () => {
    const root = await contentWithPiece();

    await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1a",
        image: { source: scan, kind: "study" },
      },
      { contentRoot: root },
    );

    const metadata = await sharp(join(root, "pieces/yong-cao-shu/images/v1a-03.jpg")).metadata();
    expect(metadata).toMatchObject({ format: "jpeg", width: 2339, height: 3508 });
    expect(await readFile(join(root, "pieces/yong-cao-shu/images/v1a.jpg"), "utf8")).toBe(
      "image existante",
    );
  });

  it("évite un nom d'image présent sur le disque, même absent de la pièce", async () => {
    const root = await contentWithPiece();
    await writeFile(join(root, "pieces/yong-cao-shu/images/v1a-03.jpg"), "orpheline");

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1a",
        image: { source: scan, kind: "study" },
      },
      { contentRoot: root },
    );

    expect(result).toMatchObject({
      ok: true,
      written: ["pieces/yong-cao-shu/images/v1a-04.jpg", "pieces/yong-cao-shu/piece.md"],
    });
    expect(await readFile(join(root, "pieces/yong-cao-shu/images/v1a-03.jpg"), "utf8")).toBe(
      "orpheline",
    );
  });

  it("donne une pièce que le content layer charge, l'image à sa place", async () => {
    const root = await contentWithPiece();
    await attachScan(
      {
        piece: "yong-cao-shu",
        version: { id: "v2", date: "2026-10-11", format: "A4" },
        variation: { id: "v2a", script: "caoshu", status: "kept" },
        image: { source: scan, kind: "work", featured: true },
      },
      { contentRoot: root },
    );

    const loaded = await loadContent(root, { includeUnpublished: true });

    expect(loaded.ok).toBe(true);
    const piece = loaded.ok ? loaded.content.pieces[0] : undefined;
    expect(piece?.status).toBe("idea");
    expect(piece?.latestVersion.variations[0]?.featuredImage?.src).toBe(
      "/content-images/yong-cao-shu/v2a.jpg",
    );
    expect(piece?.versions[0]?.variations.map((variation) => variation.status)).toEqual([
      "kept",
      "tried",
    ]);
  });
});

describe("un rattachement refusé n'écrit rien", () => {
  const cases: [string, Record<string, unknown>, string][] = [
    ["une pièce absente", { piece: "shan-ju-qiu-ming", version: "v1", variation: "v1a" }, "piece"],
    ["une version absente", { version: "v3", variation: "v3a" }, "version"],
    ["une variation absente", { variation: "v1z" }, "variation"],
    [
      "une version déjà prise",
      {
        version: { id: "v1", date: "2026-10-11", format: "A4" },
        variation: { id: "v1c", script: "caoshu", status: "kept" },
      },
      "version.id",
    ],
    [
      "une variation déjà prise",
      { variation: { id: "v1b", script: "caoshu", status: "kept" } },
      "variation.id",
    ],
    [
      "une variation qui n'est pas de sa version",
      { variation: { id: "v2a", script: "caoshu", status: "kept" } },
      "variation.id",
    ],
    [
      "un style hors vocabulaire",
      { variation: { id: "v1c", script: "gothique", status: "kept" } },
      "variation.script",
    ],
    [
      "une date illisible",
      {
        version: { id: "v2", date: "pas une date", format: "A4" },
        variation: { id: "v2a", script: "caoshu", status: "kept" },
      },
      "version.date",
    ],
    ["un scan illisible", { image: { source: "illisible", kind: "work" } }, "image.source"],
    ["un type d'image inconnu", { image: { source: "scan", kind: "poster" } }, "image.kind"],
  ];

  it.each(cases)("%s", async (_, overrides, field) => {
    const root = await contentWithPiece();
    const before = await snapshot(root);
    const sources: Record<string, string> = { scan, illisible: notAnImage };
    const image = (overrides.image as { source: string } | undefined) ?? {
      source: "scan",
      kind: "work",
    };

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1a",
        ...overrides,
        image: { ...image, source: sources[image.source] ?? image.source },
      },
      { contentRoot: root },
    );

    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.map((error) => error.path)).toContain(field);
    expect(await snapshot(root)).toEqual(before);
  });

  it("une pièce déjà invalide : la corriger avant d'y rattacher quoi que ce soit", async () => {
    const root = await contentWithPiece(PIECE.replace("status: idea", "status: presque-finie"));
    const before = await snapshot(root);

    const result = await attachScan(
      {
        piece: "yong-cao-shu",
        version: "v1",
        variation: "v1a",
        image: { source: scan, kind: "work" },
      },
      { contentRoot: root },
    );

    expect(!result.ok && result.errors.map((error) => error.path)).toEqual(["piece"]);
    expect(await snapshot(root)).toEqual(before);
  });
});

/** Tout ce que contient le contenu, fichier par fichier. */
async function snapshot(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = join(entry.parentPath, entry.name);
    files[path.slice(root.length)] = await readFile(path, "base64");
  }
  return files;
}
