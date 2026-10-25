import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadContent } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";
import { setPieceGloss, setProjectGloss } from "./gloss.js";
import { readPieceFile } from "./test-support/content-tree.js";
import { YONG, YONG_HEAD, YONG_TAIL, YONG_V1, loadYong, yongTree } from "./test-support/yong.js";

const SANS_GLOSE = `---\n${YONG_HEAD}${YONG_V1}published: true\n---\n`;

describe("setPieceGloss", () => {
  it("ajoute la glose sous le titre d'une pièce qui n'en a pas, sans toucher au reste du fichier", async () => {
    const root = await yongTree(SANS_GLOSE);

    const result = await setPieceGloss(root, "yong-cao-shu", "Le caractère 永, en cursive.");

    expect(result).toMatchObject({ ok: true });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      SANS_GLOSE.replace("title: 永草書\n", "title: 永草書\ngloss: Le caractère 永, en cursive.\n"),
    );
    expect((await loadYong(root))?.gloss).toBe("Le caractère 永, en cursive.");
  });

  it("remplace la glose existante, et elle seule", async () => {
    const root = await yongTree();

    await setPieceGloss(root, "yong-cao-shu", "Une glose reprise.");

    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace(YONG_TAIL, YONG_TAIL.replace(/^gloss: .*$/m, "gloss: Une glose reprise.")),
    );
  });

  it("remplace une glose écrite en bloc sans avaler le champ qui la suit", async () => {
    const enBloc = YONG.replace(/^gloss: .*$/m, "gloss: |\n  Une glose\n  sur deux lignes.");
    const root = await yongTree(enBloc);

    await setPieceGloss(root, "yong-cao-shu", "Une glose reprise.");

    expect(await readPieceFile(root, "yong-cao-shu")).toBe(
      YONG.replace(/^gloss: .*$/m, "gloss: Une glose reprise."),
    );
  });

  it("refuse sans rien écrire une glose vide", async () => {
    const root = await yongTree();

    const result = await setPieceGloss(root, "yong-cao-shu", "");

    expect(result).toMatchObject({ ok: false });
    expect(await readPieceFile(root, "yong-cao-shu")).toBe(YONG);
  });

  it("refuse une pièce introuvable", async () => {
    const root = await yongTree();

    const result = await setPieceGloss(root, "inconnue", "Une glose.");

    expect(result).toMatchObject({ ok: false, message: "pièce introuvable : inconnue" });
  });

  it("laisse remonter un fichier de pièce illisible, qui n'est pas une pièce introuvable", async () => {
    const root = await writeTree({ "pieces/yong-cao-shu/piece.md/v1a.jpg": "un répertoire" });

    await expect(setPieceGloss(root, "yong-cao-shu", "Une glose.")).rejects.toMatchObject({
      code: "EISDIR",
    });
  });
});

const PROJET = `# projet ouvert à l'arbitrage du scan 24
title: 氣功
presentation: Lecture des ouvrages de Yang Jwing-Ming. # à étoffer
`;

async function projectTree(): Promise<string> {
  return writeTree({ "projects/qi-gong.yaml": PROJET });
}

async function readProject(root: string): Promise<string> {
  return readFile(join(root, "projects/qi-gong.yaml"), "utf8");
}

describe("setProjectGloss", () => {
  it("ajoute la glose sous le titre du projet, sans toucher au reste du fichier", async () => {
    const root = await projectTree();

    const result = await setProjectGloss(root, "qi-gong", "Une glose de projet.");

    expect(result).toMatchObject({ ok: true });
    expect(await readProject(root)).toBe(
      PROJET.replace("title: 氣功\n", "title: 氣功\ngloss: Une glose de projet.\n"),
    );
    const loaded = await loadContent(root, { includeUnpublished: true });
    expect(loaded.ok && loaded.content.projects[0]).toMatchObject({
      id: "qi-gong",
      gloss: "Une glose de projet.",
    });
  });

  it("remplace la glose existante, et elle seule", async () => {
    const root = await projectTree();
    await setProjectGloss(root, "qi-gong", "Une glose de projet.");

    await setProjectGloss(root, "qi-gong", "Une glose reprise.");

    expect(await readProject(root)).toBe(
      PROJET.replace("title: 氣功\n", "title: 氣功\ngloss: Une glose reprise.\n"),
    );
  });

  it("refuse sans rien écrire une glose vide", async () => {
    const root = await projectTree();

    const result = await setProjectGloss(root, "qi-gong", "");

    expect(result).toMatchObject({ ok: false });
    expect(await readProject(root)).toBe(PROJET);
  });

  it("refuse sans rien écrire un projet déjà invalide", async () => {
    const invalide = `${PROJET}theme: encre\n`;
    const root = await writeTree({ "projects/qi-gong.yaml": invalide });

    const result = await setProjectGloss(root, "qi-gong", "Une glose de projet.");

    expect(result).toMatchObject({ ok: false, message: expect.stringContaining("déjà invalide") });
    expect(await readProject(root)).toBe(invalide);
  });

  it("refuse un projet inconnu", async () => {
    const root = await projectTree();

    const result = await setProjectGloss(root, "inconnu", "Une glose de projet.");

    expect(result).toMatchObject({ ok: false, message: "projet inconnu : inconnu" });
  });

  it("laisse remonter un fichier de projet illisible, qui n'est pas un projet inconnu", async () => {
    const root = await writeTree({ "projects/qi-gong.yaml/piece.md": "un répertoire" });

    await expect(setProjectGloss(root, "qi-gong", "Une glose de projet.")).rejects.toMatchObject({
      code: "EISDIR",
    });
  });
});
