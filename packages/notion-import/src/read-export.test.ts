import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readNotionExport } from "./read-export.js";
import { writeExportTree } from "./test-support/export-tree.js";

const CSV = [
  "Titre,Date de création,Dernière modification,Format,Texte de la calligraphie,URL,État,↩️ 文武雙修研究,➡️ 文武雙修研究",
  '莫性急,"22 décembre 2025 07:56","23 février 2026 17:43",2x7,"莫性急平流缓進\n墨行機兔起鶻落",,Mouvementée,,"中和集 (https://app.notion.com/p/2da3eb-1?pvs=21)"',
  '中和集,"31 décembre 2025 09:02","23 février 2026 17:43",🤯,,,Brute,"莫性急 (https://app.notion.com/p/2dc3eb-2?pvs=21)",',
  "",
].join("\n");

describe("readNotionExport", () => {
  it("lit un export réduit à son seul fichier CSV", async () => {
    const root = await writeExportTree({ "性命書法.csv": CSV });

    const pages = await readNotionExport(join(root, "性命書法.csv"));

    expect(pages.map((page) => page.title)).toEqual(["莫性急", "中和集"]);
    expect(pages[0]).toMatchObject({
      createdAt: "2025-12-22",
      editedAt: "2026-02-23",
      format: "2x7",
      status: "Mouvementée",
      text: "莫性急平流缓進\n墨行機兔起鶻落",
      body: "",
      attachments: [],
    });
  });

  it("trouve le CSV quand on lui donne le dossier d'export", async () => {
    const root = await writeExportTree({ "Export/性命書法 abc123.csv": CSV });

    const pages = await readNotionExport(join(root, "Export"));

    expect(pages).toHaveLength(2);
  });

  it("préfère le CSV complet quand Notion en dépose deux", async () => {
    const root = await writeExportTree({
      "性命書法 abc123.csv": "Titre\n莫性急\n",
      "性命書法 abc123_all.csv": CSV,
    });

    const pages = await readNotionExport(root);

    expect(pages).toHaveLength(2);
    expect(pages[0]?.format).toBe("2x7");
  });

  it("retourne les titres liés par les colonnes de relation", async () => {
    const root = await writeExportTree({ "export.csv": CSV });

    const pages = await readNotionExport(root);

    expect(pages[0]?.relations).toEqual(["中和集"]);
    expect(pages[1]?.relations).toEqual(["莫性急"]);
  });

  it("rattache la sous-page à sa ligne malgré le hash du nom de fichier", async () => {
    const root = await writeExportTree({
      "export.csv": CSV,
      "性命書法 abc123/莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0.md":
        "# 莫性急\n\nÉtat: Mouvementée\nFormat: 2x7\n\nDeux colonnes, encre sèche.\n\n![img](x.jpg)\n",
    });

    const pages = await readNotionExport(root);

    expect(pages[0]?.body).toBe("Deux colonnes, encre sèche.");
  });

  it("rapatrie les fichiers joints à une sous-page", async () => {
    const root = await writeExportTree({
      "export.csv": CSV,
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0.md": "# 莫性急\n",
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0/scan-2.jpg": Buffer.from("b"),
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0/scan-1.jpg": Buffer.from("a"),
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0/notes.txt": "pas une image",
    });

    const pages = await readNotionExport(root);

    expect(pages[0]?.attachments.map((file) => file.replace(/^.*\//, ""))).toEqual([
      "scan-1.jpg",
      "scan-2.jpg",
    ]);
  });

  it("rapatrie le fichier joint posé à côté de la sous-page, sans dossier", async () => {
    const root = await writeExportTree({
      "export.csv": CSV,
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0.md": "# 莫性急\n",
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0.png": Buffer.from("a"),
      "中和集 1a2b3c4d5e6f70819283a4b5c6d7e8f9.md": "# 中和集\n",
      "中和集 1a2b3c4d5e6f70819283a4b5c6d7e8f9.png": Buffer.from("b"),
    });

    const pages = await readNotionExport(root);

    expect(pages[0]?.attachments.map((file) => file.replace(/^.*\//, ""))).toEqual([
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0.png",
    ]);
    expect(pages[1]?.attachments.map((file) => file.replace(/^.*\//, ""))).toEqual([
      "中和集 1a2b3c4d5e6f70819283a4b5c6d7e8f9.png",
    ]);
  });

  it("n'attrape pas un fichier homonyme rangé ailleurs dans l'arborescence", async () => {
    const root = await writeExportTree({
      "export.csv": CSV,
      "莫性急 0f1e2d3c4b5a69788796a5b4c3d2e1f0.md": "# 莫性急\n",
      "Images/莫性急.jpeg": Buffer.from("a"),
    });

    const pages = await readNotionExport(root);

    expect(pages[0]?.attachments).toEqual([]);
  });

  it("échoue en désignant le chemin quand aucun CSV n'est trouvé", async () => {
    const root = await writeExportTree({ "lisez-moi.txt": "vide" });

    await expect(readNotionExport(root)).rejects.toThrow(root);
  });
});
