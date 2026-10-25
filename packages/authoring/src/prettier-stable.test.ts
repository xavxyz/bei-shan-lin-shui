import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { format, resolveConfig } from "prettier";
import { describe, expect, it } from "vitest";
import { writeTree } from "@bsls/content/test-support";
import { addVariation } from "./add-variation.js";
import { addVersion } from "./add-version.js";
import { attachToProject } from "./attach-to-project.js";
import { createPiece } from "./create-piece.js";
import { setPieceStatus } from "./statuses.js";
import { PROJECT_FILE, readPieceFile } from "./test-support/content-tree.js";
import { yongTree } from "./test-support/yong.js";

/**
 * Le pre-commit passe Prettier sur ce que les écrivains produisent : un
 * fichier qu'il réécrirait fait échouer le commit du calligraphe.
 */

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));

/** Ce que Prettier ferait d'un `piece.md` du contenu, avec la configuration du dépôt. */
async function prettified(text: string): Promise<string> {
  const filepath = join(repoRoot, "content/pieces/une-piece/piece.md");
  const config = await resolveConfig(filepath);
  return format(text, { ...config, filepath });
}

/** Huit colonnes de sept caractères : bien plus large en ligne que les 100 colonnes de Prettier. */
const WIDE_COLUMNS = [
  "空山新雨後天氣",
  "晚來秋明月松間",
  "照清泉石上流竹",
  "喧歸浣女蓮動下",
  "漁舟隨意春芳歇",
  "王孫自可留山居",
  "秋暝王維詩一首",
  "丙午霜降戈書於",
];

/** Une ligne de prose plus longue que la largeur de Prettier. */
const LONG_LINE =
  "Retrouver l'humidité de la montagne après la pluie, la lumière de la lune entre les pins et le bruit de la source sur les pierres.";

describe("ce que les écrivains produisent, Prettier le laisse tel quel", () => {
  it("une pièce neuve aux colonnes trop larges pour une ligne, et à la prose longue", async () => {
    const root = await writeTree({ "projects/ge-zhi-yan-jiu.yaml": PROJECT_FILE });

    await createPiece(root, {
      title: "山居秋暝",
      source: { author: "王維", work: "山居秋暝", dynasty: "唐", full_text: WIDE_COLUMNS.join("") },
      translation: LONG_LINE,
      projects: ["ge-zhi-yan-jiu"],
      version: {
        date: "2026-10-16",
        format: "[(8x7)]",
        columns: WIDE_COLUMNS,
        intention: LONG_LINE,
      },
      published: false,
    });

    const text = await readPieceFile(root, "shan-ju-qiu-ming");
    expect(await prettified(text)).toBe(text);
  });

  it("une version ajoutée dont les colonnes tiennent à la racine, pas à leur retrait", async () => {
    const root = await yongTree();
    // 9 colonnes de 4 caractères : 99 de large en ligne, au-delà de 100 sous `  - `.
    const columns = Array.from({ length: 9 }, () => "永永永永");

    await addVersion(root, "yong-cao-shu", {
      date: "2026-10-16",
      format: "A3",
      columns,
      intention: LONG_LINE,
      variations: [{ script: "caoshu", status: "to-try", personal_note: LONG_LINE }],
    });

    const text = await readPieceFile(root, "yong-cao-shu");
    expect(await prettified(text)).toBe(text);
  });

  it("une variation ajoutée, et un statut changé", async () => {
    const root = await yongTree();

    await addVariation(root, "yong-cao-shu", "v1", {
      script: "xingcao",
      status: "to-try",
      personal_note: LONG_LINE,
    });
    await setPieceStatus(root, "yong-cao-shu", "in-progress");

    const text = await readPieceFile(root, "yong-cao-shu");
    expect(await prettified(text)).toBe(text);
  });

  it("une pièce rattachée à tant de projets que leur liste dépasse une ligne", async () => {
    const root = await yongTree();
    const projects = [
      "le-vent-dans-les-pins",
      "les-cinq-pas-de-deng-dai-kun",
      "la-terrasse-de-narbonne-plage",
      "les-saisons-du-calligraphe",
    ];
    for (const id of projects) {
      await writeFile(join(root, `projects/${id}.yaml`), PROJECT_FILE, "utf8");
      expect(await attachToProject(root, "yong-cao-shu", id)).toMatchObject({ ok: true });
    }

    const text = await readPieceFile(root, "yong-cao-shu");
    expect(await prettified(text)).toBe(text);
  });
});
