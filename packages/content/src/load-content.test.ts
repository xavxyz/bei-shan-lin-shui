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
  translation: "Après la pluie nouvelle sur la montagne déserte…\n",
  published: true,
};

const fourSeasons = {
  title: "Quatre saisons",
  presentation: "Une série sur le passage des saisons.\n",
  theme: "jade",
};

const wellFormedTree = {
  projects: { "four-seasons": fourSeasons },
  pieces: { "shan-ju-qiu-ming": shanJuQiuMing },
  files: ["pieces/shan-ju-qiu-ming/images/v1a-01.jpg"],
};

async function loadTree(tree: Parameters<typeof writeFixtureTree>[0]) {
  return loadContent(await writeFixtureTree(tree));
}

/** Charge une arborescence attendue valide, ou fait échouer le test avec ses erreurs. */
async function loadValid(tree: Parameters<typeof writeFixtureTree>[0]) {
  const result = await loadTree(tree);
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
    expect(piece.translation).toContain("Après la pluie");
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

  it("rejette un thème de projet inconnu", async () => {
    const result = await loadTree({
      ...wellFormedTree,
      projects: { "four-seasons": { ...fourSeasons, theme: "fuchsia" } },
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]!.file).toBe("projects/four-seasons.yaml");
    expect(result.errors[0]!.path).toBe("theme");
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

describe("rattachement aux projets", () => {
  const trees = (projects: string[]) => ({
    projects: { "four-seasons": fourSeasons, mountains: { ...fourSeasons, title: "Montagnes" } },
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
        { file: "v1a-01.jpg", kind: "attempt", capture: "photo" },
        { file: "v1a-02.jpg", kind: "work", capture: "scan" },
      ]),
    );

    expect(content.pieces[0]!.featuredImage!.file).toBe("v1a-02.jpg");
  });

  it("retombe sur la première image quand aucune n'est une œuvre entière", async () => {
    const content = await loadValid(
      withImages([{ file: "v1a-01.jpg", kind: "attempt", capture: "photo" }]),
    );

    expect(content.pieces[0]!.featuredImage!.file).toBe("v1a-01.jpg");
  });

  it("expose la galerie de la variation mise en avant, image retenue en tête", async () => {
    const content = await loadValid(
      withImages([
        { file: "v1a-01.jpg", kind: "detail", capture: "scan" },
        { file: "v1a-02.jpg", kind: "work", capture: "scan", featured: true },
      ]),
    );

    expect(content.pieces[0]!.gallery.map((image) => image.file)).toEqual([
      "v1a-02.jpg",
      "v1a-01.jpg",
    ]);
    expect(content.pieces[0]!.featuredScriptLabel).toBe("courant");
  });

  it("retourne une galerie vide et aucun style quand la pièce n'a aucune image", async () => {
    const content = await loadValid(withImages([]));

    expect(content.pieces[0]!.gallery).toEqual([]);
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

describe("pièces non publiées", () => {
  it("les exclut du contenu retourné et des listes de projets", async () => {
    const content = await loadValid({
      projects: { "four-seasons": fourSeasons },
      files: [],
      pieces: {
        "shan-ju-qiu-ming": { ...shanJuQiuMing, versions: bareVersions() },
        "deng-guan-que-lou": {
          ...shanJuQiuMing,
          slug: "deng-guan-que-lou",
          title: "登鸛雀樓",
          versions: bareVersions(),
          published: false,
        },
      },
    });

    expect(content.pieces.map((piece) => piece.slug)).toEqual(["shan-ju-qiu-ming"]);
    expect(byId(content, "four-seasons").pieceSlugs).toEqual(["shan-ju-qiu-ming"]);
  });

  it("les valide quand même : un brouillon mal formé casse le build", async () => {
    const result = await loadTree({
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
    });

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
