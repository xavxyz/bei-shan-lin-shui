import { describe, expect, it } from "vitest";
import { writeTree } from "@bsls/content/test-support";
import { findStaleReferences } from "./stale-references.js";

const EXISTING = {
  "packages/scans/src/normalize-image.ts": "",
  "content/pieces/yong/piece.md": "---\ntitle: 永\n---\n",
};

describe("findStaleReferences", () => {
  it("accepte un chemin qui existe, fichier ou dossier", async () => {
    const root = await writeTree({
      ...EXISTING,
      "CLAUDE.md":
        "La normalisation vit dans `packages/scans/src/normalize-image.ts`, sous `packages/scans/`.\n",
    });

    expect(await findStaleReferences(root)).toEqual([]);
  });

  it("signale un chemin disparu, cité dans la doc, une skill ou un commentaire du contenu", async () => {
    const root = await writeTree({
      ...EXISTING,
      "docs/adr/0001-scans.md": "Plafonné (`packages/notion-import/src/normalize-image.ts`).\n",
      ".claude/skills/scans/SKILL.md": "Le registre `imports/scans.yaml` liste les scans.\n",
      "content/pieces/lian-dan/piece.md":
        "---\n# identifiée au registre imports/scans.yaml，scan 20_01\ntitle: 煉丹\n---\n",
    });

    expect(await findStaleReferences(root)).toEqual([
      ".claude/skills/scans/SKILL.md:1 — imports/scans.yaml",
      "content/pieces/lian-dan/piece.md:2 — imports/scans.yaml",
      "docs/adr/0001-scans.md:1 — packages/notion-import/src/normalize-image.ts",
    ]);
  });

  it("ignore les gabarits de chemin : <date>, <slug>, globs", async () => {
    const root = await writeTree({
      ...EXISTING,
      "CLAUDE.md": [
        "`pnpm import:notion plan <export> --out imports/notion-<date>.plan.yaml`",
        "Chaque pièce vit dans `content/pieces/<slug>/piece.md`, les plans dans `imports/*.plan.yaml`.",
        "",
      ].join("\n"),
    });

    expect(await findStaleReferences(root)).toEqual([]);
  });

  it("accepte un chemin ignoré par git : sorties de build, copies locales", async () => {
    const root = await writeTree({
      ...EXISTING,
      ".gitignore": "node_modules\ndist\nimports/scans/\n/grilles/\n",
      "README.md": "Publication `apps/site/dist`, scans dans `imports/scans/2026-10-11_01.jpeg`.\n",
    });

    expect(await findStaleReferences(root)).toEqual([]);
  });

  it("accepte un chemin disparu cité avec le commit où il vivait", async () => {
    const root = await writeTree({
      ...EXISTING,
      "content/pieces/tu-na/piece.md":
        "---\n# registre imports/scans.yaml, retiré : git show 954688d:imports/scans.yaml\ntitle: 吐納\n---\n",
    });

    expect(await findStaleReferences(root)).toEqual([]);
  });

  it("accepte le dossier imports/ lui-même, qui n'existe que le temps d'un import", async () => {
    const root = await writeTree({
      ...EXISTING,
      "docs/adr/0002-sources.md": "Garder les textes avec le plan, dans `imports/`.\n",
    });

    expect(await findStaleReferences(root)).toEqual([]);
  });

  it("ne lit pas une adresse web comme un chemin du dépôt", async () => {
    const root = await writeTree({
      ...EXISTING,
      "README.md": "Voir https://github.com/xavxyz/bsls/blob/main/packages/disparu/x.ts.\n",
    });

    expect(await findStaleReferences(root)).toEqual([]);
  });
});
