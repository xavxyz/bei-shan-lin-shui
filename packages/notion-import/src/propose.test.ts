import { describe, expect, it } from "vitest";
import { proposeImport } from "./propose.js";
import type { NotionPage } from "./read-export.js";

const TODAY = "2026-08-23";

function page(overrides: Partial<NotionPage> = {}): NotionPage {
  return {
    title: "莫性急",
    createdAt: "2025-12-22",
    editedAt: "2026-02-23",
    format: "2x7",
    text: "莫性急平流缓進\n墨行機兔起鶻落",
    url: "",
    status: "Mouvementée",
    relations: [],
    body: "",
    attachments: [],
    ...overrides,
  };
}

function propose(pages: NotionPage[]) {
  return proposeImport(pages, { today: TODAY });
}

function warningsOn(piece: { warnings: { field: string }[] }, field: string) {
  return piece.warnings.filter((warning) => warning.field === field);
}

describe("proposeImport", () => {
  it("fait de chaque page une pièce portant une unique version initiale", () => {
    const plan = propose([page(), page({ title: "登山歌訣", text: "登山歌訣" })]);

    expect(plan.pieces).toHaveLength(2);
    expect(plan.pieces[0]).toMatchObject({
      slug: "mo-xing-ji",
      title: "莫性急",
      published: false,
      version: {
        id: "v1",
        date: "2025-12-22",
        format: "2x7",
        columns: ["莫性急平流缓進", "墨行機兔起鶻落"].map(toTraditional),
      },
    });
  });

  it("propose un statut du schéma pour chaque état Notion", () => {
    const states: [string, string][] = [
      ["Brute", "idea"],
      ["Préparée", "study"],
      ["En cours", "in-progress"],
      ["Mouvementée", "made"],
      ["Cadre imprimé", "finished"],
    ];

    for (const [notionState, expected] of states) {
      const [piece] = propose([page({ status: notionState })]).pieces;
      expect(piece?.status).toBe(expected);
      expect(warningsOn(piece!, "status")).toEqual([]);
    }
  });

  it("signale les états qu'il ne sait pas trancher seul", () => {
    const [aRefaire] = propose([page({ status: "À refaire" })]).pieces;
    const [inconnu] = propose([page({ status: "" })]).pieces;

    expect(aRefaire?.status).toBe("in-progress");
    expect(warningsOn(aRefaire!, "status")).not.toEqual([]);
    expect(inconnu?.status).toBe("idea");
    expect(warningsOn(inconnu!, "status")).not.toEqual([]);
  });

  it("convertit le texte en traditionnel et le signale", () => {
    const [piece] = propose([page({ title: "红楼梦", text: "无意成刚" })]).pieces;

    expect(piece?.title).toBe("紅樓夢");
    expect(piece?.version.columns).toEqual(["無意成剛"]);
    expect(warningsOn(piece!, "title")).not.toEqual([]);
  });

  it("écarte les lignes vides du texte et signale celles qui ne sont pas des colonnes", () => {
    const [piece] = propose([
      page({ text: "至人無己\n\n無心無為\n\nune note en français" }),
    ]).pieces;

    expect(piece?.version.columns).toEqual(["至人無己", "無心無為", "une note en français"]);
    expect(warningsOn(piece!, "version.columns")).not.toEqual([]);
  });

  it("propose un format à préciser quand la colonne est vide", () => {
    const [piece] = propose([page({ format: "" })]).pieces;

    expect(piece?.version.format).toBe("à préciser");
    expect(warningsOn(piece!, "version.format")).not.toEqual([]);
  });

  it("signale une pièce sans aucun texte de calligraphie", () => {
    const [piece] = propose([page({ text: "" })]).pieces;

    expect(piece?.version.columns).toEqual([]);
    expect(warningsOn(piece!, "version.columns")).not.toEqual([]);
  });

  it("retombe sur la modification puis sur aujourd'hui quand la création manque", () => {
    const [modifie] = propose([page({ createdAt: undefined })]).pieces;
    const [sansDate] = propose([page({ createdAt: undefined, editedAt: undefined })]).pieces;

    expect(modifie?.version.date).toBe("2026-02-23");
    expect(sansDate?.version.date).toBe(TODAY);
    expect(warningsOn(sansDate!, "version.date")).not.toEqual([]);
  });

  it("suffixe le second slug quand deux titres donnent le même pinyin", () => {
    const plan = propose([page({ title: "莫性急" }), page({ title: "莫姓急" })]);

    expect(plan.pieces.map((piece) => piece.slug)).toEqual(["mo-xing-ji", "mo-xing-ji-2"]);
    expect(warningsOn(plan.pieces[1]!, "slug")).not.toEqual([]);
  });

  it("reprend le corps de la sous-page comme note d'intention", () => {
    const [piece] = propose([page({ body: "Deux colonnes, encre grasse." })]).pieces;

    expect(piece?.version.intention).toBe("Deux colonnes, encre grasse.");
  });

  it("remplace les relations Notion par une appartenance à un projet", () => {
    const hub = page({ title: "中和集", relations: ["莫性急", "虛心實腹", "自題相"] });
    const pages = [
      hub,
      page({ title: "莫性急", relations: ["中和集"] }),
      page({ title: "虛心實腹", relations: ["中和集"] }),
      page({ title: "自題相", relations: ["中和集"] }),
      page({ title: "調身", relations: [] }),
    ];

    const plan = propose(pages);

    expect(plan.projects.map((project) => project.id)).toEqual(["zhong-he-ji"]);
    expect(plan.projects[0]).toMatchObject({ title: "中和集", presentation: "" });
    expect(plan.pieces.map((piece) => piece.projects)).toEqual([
      [],
      ["zhong-he-ji"],
      ["zhong-he-ji"],
      ["zhong-he-ji"],
      [],
    ]);
  });

  it("signale la page-pôle, qui est sans doute un échafaudage plutôt qu'une pièce", () => {
    const plan = propose([
      page({ title: "中和集", relations: ["莫性急", "虛心實腹", "自題相"] }),
      page({ title: "莫性急", relations: ["中和集"] }),
      page({ title: "虛心實腹", relations: ["中和集"] }),
      page({ title: "自題相", relations: ["中和集"] }),
    ]);

    expect(warningsOn(plan.pieces[0]!, "projects")).not.toEqual([]);
    expect(warningsOn(plan.pieces[1]!, "projects")).toEqual([]);
  });

  it("ne propose aucun projet autour d'une page trop peu reliée", () => {
    const plan = propose([
      page({ title: "調身", relations: ["五氣朝元"] }),
      page({ title: "五氣朝元", relations: ["調身"] }),
    ]);

    expect(plan.projects).toEqual([]);
    expect(plan.pieces.every((piece) => piece.projects.length === 0)).toBe(true);
  });

  it("range les fichiers joints dans une unique variation, la première mise en avant", () => {
    const [piece] = propose([
      page({ attachments: ["/export/莫性急 abc/scan-1.jpg", "/export/莫性急 abc/scan-2.png"] }),
    ]).pieces;

    expect(piece?.variations).toEqual([
      {
        id: "v1a",
        script: "xingshu",
        status: "tried",
        images: [
          { file: "v1a-01.jpg", source: "/export/莫性急 abc/scan-1.jpg", featured: true },
          { file: "v1a-02.jpg", source: "/export/莫性急 abc/scan-2.png", featured: false },
        ],
      },
    ]);
    expect(warningsOn(piece!, "variations.0.script")).not.toEqual([]);
  });

  it("n'invente aucune variation à une page sans image", () => {
    const [piece] = propose([page()]).pieces;

    expect(piece?.variations).toEqual([]);
  });
});

function toTraditional(text: string): string {
  return text.replace("缓", "緩");
}
