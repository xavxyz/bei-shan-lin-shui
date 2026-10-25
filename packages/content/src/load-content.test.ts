import { describe, expect, it } from "vitest";
import { loadContent } from "./load-content.js";
import { writeFixtureTree } from "./test-support/fixture-tree.js";

const shanJuQiuMing = {
  title: "山居秋暝",
  slug: "shan-ju-qiu-ming",
  projects: ["four-seasons"],
  status: "in-progress",
  source: { author: "王維", work: "山居秋暝", dynasty: "唐", full_text: "空山新雨後\n天氣晚來秋" },
  versions: [
    {
      id: "v1",
      date: "2026-03-04",
      format: "A4 vertical",
      columns: ["空山新雨後", "天氣晚來秋"],
      intention: "Quatre colonnes, encre grasse.\n",
      variations: [
        {
          id: "v1a",
          script: "xingshu",
          status: "set-aside",
          personal_note: "Trop sage, les liaisons manquent de tension.\n",
          images: [{ file: "v1a-01.jpg", kind: "work", capture: "scan", featured: true }],
        },
      ],
    },
  ],
  published: true,
};

const fourSeasons = {
  title: "四季",
  presentation: "Une série sur le passage des saisons.\n",
};

const wellFormedTree = {
  projects: { "four-seasons": fourSeasons },
  pieces: { "shan-ju-qiu-ming": shanJuQiuMing },
  files: ["pieces/shan-ju-qiu-ming/images/v1a-01.jpg"],
};

/** Charge tout, comme le mode admin et la validation : ce qui est publié comme le reste. */
async function loadTree(tree: Parameters<typeof writeFixtureTree>[0]) {
  return loadContent(await writeFixtureTree(tree), { includeUnpublished: true });
}

/** Charge tout d'une arborescence attendue valide, ou fait échouer le test avec ses erreurs. */
async function loadValid(tree: Parameters<typeof writeFixtureTree>[0]) {
  const result = await loadTree(tree);
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content;
}

/** Charge ce que reçoit le site public d'une arborescence attendue valide. */
async function loadPublic(tree: Parameters<typeof writeFixtureTree>[0]) {
  const result = await loadContent(await writeFixtureTree(tree));
  if (!result.ok) expect.unreachable(`chargement en échec : ${JSON.stringify(result.errors)}`);
  return result.content;
}

describe("une pièce bien formée", () => {
  it("est acceptée et retournée typée", async () => {
    const content = await loadValid(wellFormedTree);

    const piece = content.pieces[0]!;
    expect(piece.slug).toBe("shan-ju-qiu-ming");
    expect(piece.status).toBe("in-progress");
    expect(piece.title.traditional).toBe("山居秋暝");
    expect(piece.versions[0]!.variations[0]!.script).toBe("xingshu");
  });

  it("expose ses images sous une URL servie par le site", async () => {
    const content = await loadValid(wellFormedTree);

    expect(content.pieces[0]!.versions[0]!.variations[0]!.images[0]!.src).toBe(
      "/content-images/shan-ju-qiu-ming/v1a-01.jpg",
    );
  });

  it("nomme les styles d'écriture en français", async () => {
    const content = await loadValid(wellFormedTree);

    expect(content.pieces[0]!.versions[0]!.variations[0]!.scriptLabel).toBe("courant");
  });

  it("accepte le style libre et le nomme en français", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": withVariations([{ ...variation("v1a"), script: "ziyou" }]),
      },
    });

    const libre = content.pieces[0]!.versions[0]!.variations[0]!;
    expect(libre.script).toBe("ziyou");
    expect(libre.scriptLabel).toBe("libre");
  });
});

describe("violations de schéma", () => {
  it("rejette un statut de pièce inconnu, en désignant le fichier et le champ", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: { "shan-ju-qiu-ming": { ...shanJuQiuMing, status: "presque-fini" } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.file).toBe("pieces/shan-ju-qiu-ming/piece.md");
    expect(result.errors[0]!.path).toBe("status");
    expect(result.errors[0]!.message).toContain("idea");
  });

  it("rejette le statut finished : l'encre sèche est le stade le plus avancé", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: { "shan-ju-qiu-ming": { ...shanJuQiuMing, status: "finished" } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.file).toBe("pieces/shan-ju-qiu-ming/piece.md");
    expect(result.errors[0]!.path).toBe("status");
  });

  it("rejette un style d'écriture inconnu, en désignant la variation fautive", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: {
        "shan-ju-qiu-ming": withVariations([{ ...variation("v1a"), script: "lishu" }]),
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.path).toBe("versions.0.variations.0.script");
    expect(result.errors[0]!.message).toContain("kaishu");
  });

  it("rejette un identifiant de variation dupliqué", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: {
        "shan-ju-qiu-ming": withVariations([variation("v1a"), variation("v1a")]),
      },
      files: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.path).toBe("versions.0.variations.1.id");
    expect(result.errors[0]!.message).toContain("v1a");
  });

  it("rejette une image référencée absente du disque, en donnant le chemin attendu", async () => {
    const result = await loadTree({ ...wellFormedTree, files: [] });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.path).toBe("versions.0.variations.0.images.0.file");
    expect(result.errors[0]!.message).toContain("images/v1a-01.jpg");
  });

  it("rejette une pièce rattachée à un projet qui n'existe pas", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: { "shan-ju-qiu-ming": { ...shanJuQiuMing, projects: ["five-seasons"] } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.path).toBe("projects.0");
    expect(result.errors[0]!.message).toContain("five-seasons");
  });

  it("rejette un slug qui ne correspond pas au dossier, car l'URL en dépend", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: { "shan-ju-qiu-ming": { ...shanJuQiuMing, slug: "autre-chose" } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.path).toBe("slug");
    expect(result.errors[0]!.message).toContain("shan-ju-qiu-ming");
  });

  it("signale toutes les pièces fautives, pas seulement la première", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      pieces: {
        "shan-ju-qiu-ming": { ...shanJuQiuMing, status: "presque-fini" },
        "deng-guan-que-lou": {
          ...shanJuQiuMing,
          slug: "deng-guan-que-lou",
          title: "登鸛雀樓",
          status: "aussi-faux",
          versions: [{ ...shanJuQiuMing.versions[0], variations: [] }],
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.map((error) => error.file).sort()).toEqual([
      "pieces/deng-guan-que-lou/piece.md",
      "pieces/shan-ju-qiu-ming/piece.md",
    ]);
  });
});

describe("versions et variations", () => {
  it("retourne les versions dans l'ordre chronologique", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": {
          ...shanJuQiuMing,
          versions: [
            { id: "v2", date: "2026-05-01", format: "A4 vertical", columns: [], variations: [] },
            { id: "v1", date: "2026-03-04", format: "A4 vertical", columns: [], variations: [] },
            { id: "v3", date: "2026-04-02", format: "A3 vertical", columns: [], variations: [] },
          ],
        },
      },
    });

    const piece = content.pieces[0]!;
    expect(piece.versions.map((version) => version.id)).toEqual(["v1", "v3", "v2"]);
    expect(piece.versions.map((version) => version.date)).toEqual([
      "2026-03-04",
      "2026-04-02",
      "2026-05-01",
    ]);
    expect(piece.latestVersion.id).toBe("v2");
  });

  it("fait coexister les variations d'une même version sans qu'aucune n'écrase les autres", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": withVariations([
          { ...variation("v1a"), script: "kaishu", status: "kept" },
          { ...variation("v1b"), script: "caoshu", status: "tried" },
          { ...variation("v1c"), script: "kuangcao", status: "set-aside" },
        ]),
      },
    });

    const variations = content.pieces[0]!.versions[0]!.variations;
    expect(variations.map((each) => each.id)).toEqual(["v1a", "v1b", "v1c"]);
    expect(variations.map((each) => each.script)).toEqual(["kaishu", "caoshu", "kuangcao"]);
    expect(variations.map((each) => each.status)).toEqual(["kept", "tried", "set-aside"]);
  });
});

describe("date chinoise", () => {
  async function chineseDateOf(date: string) {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": {
          ...shanJuQiuMing,
          versions: [{ id: "v1", date, format: "A4 vertical", columns: [], variations: [] }],
        },
      },
    });
    return content.pieces[0]!.versions[0]!.chineseDate;
  }

  it("dérive l'année en tronc et branche et le jieqi de la date stockée", async () => {
    expect(await chineseDateOf("2026-05-13")).toBe("丙午立夏");
  });

  it("redonne le jieqi d'une date stockée au milieu de ce jieqi", async () => {
    // 雨水 le 18 février, 驚蟄 le 5 mars : le milieu de 雨水 est le 25 février.
    expect(await chineseDateOf("2026-02-25")).toBe("丙午雨水");
    // 立夏 le 5 mai, 小滿 le 21 mai : le milieu de 立夏 est le 13 mai.
    expect(await chineseDateOf("2026-05-13")).toBe("丙午立夏");
  });

  it("écrit les jieqi en traditionnel", async () => {
    expect(await chineseDateOf("2026-03-12")).toBe("丙午驚蟄");
    expect(await chineseDateOf("2026-08-30")).toBe("丙午處暑");
  });

  it("donne le jieqi dès le jour même du terme", async () => {
    expect(await chineseDateOf("2026-02-04")).toBe("丙午立春");
    expect(await chineseDateOf("2026-03-05")).toBe("丙午驚蟄");
  });

  it("change d'année au 立春, comme le papier : avant, c'est encore l'année précédente", async () => {
    expect(await chineseDateOf("2026-02-03")).toBe("乙巳大寒");
    // Signé 立春 (丙午) le 11 février, avant le Nouvel An lunaire du 17.
    expect(await chineseDateOf("2026-02-11")).toBe("丙午立春");
  });
});

describe("libellé du format", () => {
  it("dit en français le format de chaque version, à côté de sa notation", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": {
          ...shanJuQiuMing,
          versions: [
            { id: "v1", date: "2026-03-04", format: "[(4x5)]", columns: [], variations: [] },
            { id: "v2", date: "2026-05-01", format: "2x7 + 蘇東坡", columns: [], variations: [] },
          ],
        },
      },
    });

    const [v1, v2] = content.pieces[0]!.versions;
    expect(v1).toMatchObject({
      format: "[(4x5)]",
      formatLabel: { readable: true, text: "4 colonnes de 5 caractères" },
    });
    expect(v2).toMatchObject({ format: "2x7 + 蘇東坡", formatLabel: { readable: false } });
  });
});

describe("rattachement aux projets", () => {
  const trees = (projects: string[]) => ({
    projects: { "four-seasons": fourSeasons, mountains: { ...fourSeasons, title: "山" } },
    pieces: { "shan-ju-qiu-ming": { ...shanJuQiuMing, projects, versions: bareVersions() } },
    files: [],
  });

  it("accepte une pièce sans projet et la garde accessible sous sa route propre", async () => {
    const content = await loadValid(trees([]));

    expect(content.pieces[0]!.projects).toEqual([]);
    expect(content.pieces[0]!.href).toBe("/pieces/shan-ju-qiu-ming");
    expect(content.projects.flatMap((project) => project.pieceSlugs)).toEqual([]);
  });

  it("rattache une pièce à un projet unique", async () => {
    const content = await loadValid(trees(["four-seasons"]));

    expect(content.pieces[0]!.href).toBe("/four-seasons/shan-ju-qiu-ming");
    expect(byId(content, "four-seasons").pieceSlugs).toEqual(["shan-ju-qiu-ming"]);
    expect(byId(content, "mountains").pieceSlugs).toEqual([]);
  });

  it("rend une pièce de deux projets accessible depuis chacun d'eux", async () => {
    const content = await loadValid(trees(["four-seasons", "mountains"]));

    expect(byId(content, "four-seasons").pieceSlugs).toEqual(["shan-ju-qiu-ming"]);
    expect(byId(content, "mountains").pieceSlugs).toEqual(["shan-ju-qiu-ming"]);
  });
});

describe("dérivations linguistiques", () => {
  it("dérive le simplifié et le pinyin depuis le traditionnel", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": { ...shanJuQiuMing, versions: bareVersions() },
      },
    });

    const title = content.pieces[0]!.title;
    expect(title.traditional).toBe("山居秋暝");
    expect(title.simplified).toBe("山居秋暝");

    const column = content.pieces[0]!.versions[0]!.columns[0]!;
    expect(column.traditional).toBe("天氣晚來秋");
    expect(column.simplified).toBe("天气晚来秋");
    expect(column.pinyin).toBe("tiān qì wǎn lái qiū");
  });

  it("dérive aussi le texte intégral de la source", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": { ...shanJuQiuMing, versions: bareVersions() },
      },
    });

    expect(content.pieces[0]!.source!.full_text!.simplified).toContain("空山新雨后");
  });

  it("rejette une surcharge qui ne corrige aucun texte de la pièce", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": {
          ...shanJuQiuMing,
          versions: bareVersions(),
          pinyin_overrides: { 行行重行行: "háng háng chóng háng háng" },
        },
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.path).toBe("pinyin_overrides.行行重行行");
    expect(result.errors[0]!.message).toContain("colonne");
  });

  it("fait primer une surcharge manuelle de pinyin sur la valeur générée", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [],
      pieces: {
        "shan-ju-qiu-ming": {
          ...shanJuQiuMing,
          versions: [
            {
              id: "v1",
              date: "2026-03-04",
              format: "A4 vertical",
              columns: ["行行重行行"],
              variations: [],
            },
          ],
          pinyin_overrides: { 行行重行行: "háng háng chóng háng háng" },
        },
      },
    });

    expect(content.pieces[0]!.versions[0]!.columns[0]!.pinyin).toBe("háng háng chóng háng háng");
  });
});

describe("image mise en avant", () => {
  const withImages = (images: unknown[]) => ({
    ...wellFormedTree,
    files: images.map(
      (image) => `pieces/shan-ju-qiu-ming/images/${(image as { file: string }).file}`,
    ),
    pieces: {
      "shan-ju-qiu-ming": withVariations([{ ...variation("v1a"), images }]),
    },
  });

  it("retient l'image explicitement mise en avant", async () => {
    const content = await loadValid(
      withImages([
        { file: "v1a-01.jpg", kind: "work", capture: "scan" },
        { file: "v1a-02.jpg", kind: "work", capture: "scan", featured: true },
      ]),
    );

    expect(content.pieces[0]!.featuredImage!.file).toBe("v1a-02.jpg");
  });

  it("retient la première mise en avant quand plusieurs le sont", async () => {
    const content = await loadValid(
      withImages([
        { file: "v1a-01.jpg", kind: "detail", capture: "scan", featured: true },
        { file: "v1a-02.jpg", kind: "work", capture: "scan", featured: true },
      ]),
    );

    expect(content.pieces[0]!.featuredImage!.file).toBe("v1a-01.jpg");
  });

  it("retombe sur la première œuvre entière quand aucune n'est mise en avant", async () => {
    const content = await loadValid(
      withImages([
        { file: "v1a-01.jpg", kind: "study", capture: "photo" },
        { file: "v1a-02.jpg", kind: "work", capture: "scan" },
      ]),
    );

    expect(content.pieces[0]!.featuredImage!.file).toBe("v1a-02.jpg");
  });

  it("retombe sur la première image quand aucune n'est une œuvre entière", async () => {
    const content = await loadValid(
      withImages([{ file: "v1a-01.jpg", kind: "study", capture: "photo" }]),
    );

    expect(content.pieces[0]!.featuredImage!.file).toBe("v1a-01.jpg");
  });

  it("nomme en français le style de la variation mise en avant", async () => {
    const content = await loadValid(
      withImages([
        { file: "v1a-01.jpg", kind: "detail", capture: "scan" },
        { file: "v1a-02.jpg", kind: "work", capture: "scan", featured: true },
      ]),
    );

    expect(content.pieces[0]!.featuredScriptLabel).toBe("courant");
  });

  it("ne nomme aucun style quand la pièce n'a aucune image", async () => {
    const content = await loadValid(withImages([]));

    expect(content.pieces[0]!.featuredScriptLabel).toBeNull();
  });

  it("retourne rien quand la pièce n'a aucune image", async () => {
    const content = await loadValid(withImages([]));

    expect(content.pieces[0]!.featuredImage).toBeNull();
    expect(content.pieces[0]!.versions[0]!.variations[0]!.featuredImage).toBeNull();
  });

  it("préfère une variation retenue à une variation écartée, et la version la plus récente", async () => {
    const content = await loadValid({
      ...wellFormedTree,
      files: [
        "pieces/shan-ju-qiu-ming/images/v1a-01.jpg",
        "pieces/shan-ju-qiu-ming/images/v2a-01.jpg",
        "pieces/shan-ju-qiu-ming/images/v2b-01.jpg",
      ],
      pieces: {
        "shan-ju-qiu-ming": {
          ...shanJuQiuMing,
          versions: [
            {
              id: "v1",
              date: "2026-03-04",
              format: "A4 vertical",
              columns: [],
              variations: [{ ...variation("v1a"), images: [imageNamed("v1a-01.jpg")] }],
            },
            {
              id: "v2",
              date: "2026-05-01",
              format: "A4 vertical",
              columns: [],
              variations: [
                { ...variation("v2a"), status: "set-aside", images: [imageNamed("v2a-01.jpg")] },
                { ...variation("v2b"), status: "kept", images: [imageNamed("v2b-01.jpg")] },
              ],
            },
          ],
        },
      },
    });

    expect(content.pieces[0]!.featuredImage!.file).toBe("v2b-01.jpg");
  });
});

describe("visibilité", () => {
  const scanned = { ...shanJuQiuMing };
  const unscanned = {
    ...shanJuQiuMing,
    slug: "deng-guan-que-lou",
    title: "登鸛雀樓",
    versions: bareVersions(),
  };
  const unpublished = { ...shanJuQiuMing, slug: "jiang-xue", title: "江雪", published: false };
  const tree = {
    projects: { "four-seasons": fourSeasons },
    pieces: {
      "shan-ju-qiu-ming": scanned,
      "deng-guan-que-lou": unscanned,
      "jiang-xue": unpublished,
    },
    files: ["pieces/shan-ju-qiu-ming/images/v1a-01.jpg", "pieces/jiang-xue/images/v1a-01.jpg"],
  };

  it("le public ne reçoit que les pièces publiées qui ont une image, dans les projets comme ailleurs", async () => {
    const content = await loadPublic(tree);

    expect(content.pieces.map((piece) => piece.slug)).toEqual(["shan-ju-qiu-ming"]);
    expect(byId(content, "four-seasons").pieceSlugs).toEqual(["shan-ju-qiu-ming"]);
  });

  it("le mode admin rend tout : non publiées et pièces sans image", async () => {
    const content = await loadValid(tree);

    expect(content.pieces.map((piece) => piece.slug)).toEqual([
      "deng-guan-que-lou",
      "jiang-xue",
      "shan-ju-qiu-ming",
    ]);
    expect(byId(content, "four-seasons").pieceSlugs).toEqual([
      "deng-guan-que-lou",
      "jiang-xue",
      "shan-ju-qiu-ming",
    ]);
  });

  it("valide aussi ce que le public ne voit pas : un brouillon mal formé casse le build", async () => {
    const result = await loadContent(
      await writeFixtureTree({
        ...wellFormedTree,
        files: [],
        pieces: {
          "shan-ju-qiu-ming": {
            ...shanJuQiuMing,
            versions: bareVersions(),
            published: false,
            status: "presque-fini",
          },
        },
      }),
    );

    expect(result.ok).toBe(false);
  });
});

function byId(content: { projects: { id: string; pieceSlugs: string[] }[] }, id: string) {
  const project = content.projects.find((each) => each.id === id);
  if (!project) throw new Error(`projet absent du contenu : ${id}`);
  return project;
}

function variation(id: string) {
  return { id, script: "xingshu", status: "tried", images: [] as unknown[] };
}

function imageNamed(file: string) {
  return { file, kind: "work", capture: "scan" };
}

/** Une version unique portant les variations données, sur la pièce de référence. */
function withVariations(variations: unknown[]) {
  return {
    ...shanJuQiuMing,
    versions: [{ ...shanJuQiuMing.versions[0], variations }],
  };
}

/** Versions dépouillées d'images, pour les tests qui n'en ont pas besoin. */
function bareVersions() {
  return [
    {
      id: "v1",
      date: "2026-03-04",
      format: "A4 vertical",
      columns: ["天氣晚來秋"],
      variations: [],
    },
  ];
}
