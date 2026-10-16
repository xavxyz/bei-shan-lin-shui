import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { expect, it } from "vitest";
import { pieceFile, pieceImageFile } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";
import { attachScan } from "./attach.js";

/**
 * Les E2E montrent, sur un build réel, un scan rattaché par `attachScan` :
 * celui de `行行重行行` v3a dans les fixtures du site. Ce test établit que la
 * fixture est exactement ce que produit le rattachement, à partir de la pièce
 * telle qu'elle était avant lui.
 */
const SITE_FIXTURES = fileURLToPath(
  new URL("../../../apps/site/tests/fixtures/content", import.meta.url),
);
const SLUG = "xing-xing-zhong-xing-xing";

const BEFORE = `---
title: 行行重行行
slug: xing-xing-zhong-xing-xing
projects: []
status: experiment
source:
  author: 佚名
  work: 古詩十九首
  dynasty: 漢
versions:
  - id: v1
    date: 2026-04-09
    format: Bande étroite
    columns: [行行重行行, 與君生別離]
    intention: |
      Une seule bande, très étroite : la marche sans fin.
    variations:
      - id: v1a
        script: xingcao
        status: tried
        personal_note: |
          Le premier 行 part trop haut.
  - id: v2
    date: 2026-04-23
    format: Bande étroite
    columns: [行行重行行]
    intention: |
      Une seule colonne : la marche, sans la séparation.
    variations:
      - id: v2a
        script: caoshu
        status: set-aside
  - id: v3
    date: 2026-05-02
    format: Bande étroite
    columns: [行行重行行, 與君生別離]
    intention: |
      Retour aux deux colonnes, la seconde plus basse.
    variations:
      - id: v3a
        script: xingcao
        status: to-try
pinyin_overrides:
  行行重行行: háng háng chóng háng háng
translation: |
  Marcher, marcher, et marcher encore,
  vivant, me voici séparé de toi.
published: true
---
`;

/** Le rattachement qui a produit la fixture, tel que la skill `scans` l'écrirait. */
const ATTACHMENT = {
  piece: SLUG,
  version: "v3",
  variation: "v3a",
  image: { kind: "work", caption: "La bande entière, au scanner." },
};

/** Le scan d'origine : une bande étroite, plus haute que l'A4 à 300 dpi. */
async function bandScan(dir: string): Promise<string> {
  const source = join(dir, "2026-05-02_01_01.jpeg");
  await sharp({ create: { width: 900, height: 4200, channels: 3, background: "#f4efe4" } })
    .jpeg()
    .toFile(source);
  return source;
}

it("la fixture du site est le rattachement d'un scan par attachScan, à l'octet près", async () => {
  const root = await writeTree({ [pieceFile(SLUG)]: BEFORE });
  const source = await bandScan(await mkdtemp(join(tmpdir(), "bsls-drive-")));

  const result = await attachScan(
    { ...ATTACHMENT, image: { ...ATTACHMENT.image, source } },
    { contentRoot: root },
  );

  expect(result).toMatchObject({ ok: true });
  expect(await readFile(join(root, pieceFile(SLUG)), "utf8")).toBe(
    await readFile(join(SITE_FIXTURES, pieceFile(SLUG)), "utf8"),
  );
  const image = pieceImageFile(SLUG, "v3a.jpg");
  const produced = await sharp(join(root, image)).metadata();
  const committed = await sharp(join(SITE_FIXTURES, image)).metadata();
  expect({ format: committed.format, width: committed.width, height: committed.height }).toEqual({
    format: produced.format,
    width: produced.width,
    height: produced.height,
  });
});
