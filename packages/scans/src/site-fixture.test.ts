import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { expect, it } from "vitest";
import { pieceFile, pieceImageFile } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";
import { attachScan } from "./attach.js";

/**
 * Les E2E montrent, sur un build réel, un scan rattaché par `attachScan` :
 * celui de `莫性急` v2a dans les fixtures du site, copie réduite de la pièce de
 * `content/`. Ce test établit que la fixture est exactement ce que produit le
 * rattachement, à partir de la pièce telle qu'elle était avant lui.
 */
const SITE_FIXTURES = fileURLToPath(
  new URL("../../../apps/site/tests/fixtures/content", import.meta.url),
);
const SLUG = "mo-xing-ji";

const BEFORE = `---
# 緩 en traditionnel sur les deux scans (Notion : 缓)
# traduction écrite à la main sur le scan 2026-10-11_01_01.jpeg
title: 莫性急
slug: mo-xing-ji
status: made
versions:
  # date du papier : 3.1.26 (Notion disait 2025-12-22)
  - id: v1
    date: 2026-01-03
    format: 2x7
    columns: [莫性急平流緩進, 墨行機兔起鶻落]
    variations:
      - id: v1a
        script: kaishu
        status: tried
        images:
          - file: v1a.jpg
            kind: work
            capture: scan
  # scan 2026-10-11_01_01.jpeg, image mise en avant de la pièce
  # date du papier : 戈 立春 (丙午) → 2026-02-11 ; format 2x7 + 蘇東坡 (苏 écrit en simplifié)
  - id: v2
    date: 2026-02-11
    format: 2x7 + 蘇東坡
    columns: [莫性急平流緩進, 墨行機兔起鶻落]
    variations:
      - id: v2a
        script: kaishu
        status: kept
translation: La patience et la constance dans la progression. La vivacité et la précision dans l'action.
published: true
---
`;

/** Le rattachement qui a produit la fixture, tel que la skill `scans` l'écrirait. */
const ATTACHMENT = {
  piece: SLUG,
  version: "v2",
  variation: "v2a",
  image: { kind: "work", featured: true },
};

it("la fixture du site est le rattachement d'un scan par attachScan, à l'octet près", async () => {
  const v1a = pieceImageFile(SLUG, "v1a.jpg");
  const root = await writeTree({
    [pieceFile(SLUG)]: BEFORE,
    [v1a]: await readFile(join(SITE_FIXTURES, v1a)),
  });
  // Le scan de la fixture est déjà réduit : le rattacher ne doit plus le redimensionner.
  const image = pieceImageFile(SLUG, "v2a.jpg");
  const source = join(SITE_FIXTURES, image);

  const result = await attachScan(
    { ...ATTACHMENT, image: { ...ATTACHMENT.image, source } },
    { contentRoot: root },
  );

  expect(result).toMatchObject({ ok: true });
  expect(await readFile(join(root, pieceFile(SLUG)), "utf8")).toBe(
    await readFile(join(SITE_FIXTURES, pieceFile(SLUG)), "utf8"),
  );
  const produced = await sharp(join(root, image)).metadata();
  const committed = await sharp(source).metadata();
  expect({ format: committed.format, width: committed.width, height: committed.height }).toEqual({
    format: produced.format,
    width: produced.width,
    height: produced.height,
  });
});
