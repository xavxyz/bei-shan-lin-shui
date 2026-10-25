import { describe, expect, it } from "vitest";
import {
  loadedImageSchema,
  loadedVariationSchema,
  loadedVersionSchema,
  type LoadedVariation,
  type LoadedVersion,
} from "@bsls/schema";
import { featuredVariation, featuredVersion, pickFeaturedImage } from "@bsls/content/featured";

function variation(
  id: string,
  status: LoadedVariation["status"],
  files: string[],
  { featured = false } = {},
): LoadedVariation {
  const images = files.map((file) =>
    loadedImageSchema.parse({ file, src: `/${file}`, kind: "work", capture: "scan", featured }),
  );
  return loadedVariationSchema.parse({
    id,
    script: "caoshu",
    scriptLabel: "courant",
    status,
    images,
    featuredImage: pickFeaturedImage(images),
  });
}

describe("featuredVariation", () => {
  it("mène une version par sa première variation retenue qui a une image", () => {
    const leading = featuredVariation([
      variation("v1a", "tried", ["v1a-01.jpg"]),
      variation("v1b", "kept", []),
      variation("v1c", "kept", ["v1c-01.jpg"]),
    ]);

    expect(leading?.id).toBe("v1c");
  });

  it("mène une version par la variation qui porte l'image mise en avant, même non retenue", () => {
    const leading = featuredVariation([
      variation("v1a", "kept", ["v1a-01.jpg"]),
      variation("v1b", "tried", ["v1b-01.jpg"], { featured: true }),
    ]);

    expect(leading?.id).toBe("v1b");
  });

  it("à défaut de variation retenue illustrée, prend la première illustrée dans l'ordre du fichier", () => {
    const leading = featuredVariation([
      variation("v1a", "to-try", []),
      variation("v1b", "set-aside", ["v1b-01.jpg"]),
      variation("v1c", "tried", ["v1c-01.jpg"]),
    ]);

    expect(leading?.id).toBe("v1b");
  });

  it("ne mène rien quand aucune variation n'a d'image", () => {
    expect(featuredVariation([variation("v1a", "kept", [])])).toBeUndefined();
  });
});

function version(id: string, variations: LoadedVariation[]): LoadedVersion {
  return loadedVersionSchema.parse({
    id,
    date: "2026-01-01",
    chineseDate: "乙巳冬至",
    chineseDateSimplified: "乙巳冬至",
    format: "à préciser",
    formatLabel: { readable: false },
    columns: [],
    variations,
    hasImage: variations.some((variation) => variation.featuredImage !== null),
  });
}

describe("featuredVersion", () => {
  it("est la dernière version qui a une image, même quand la courante n'en a pas", () => {
    const featured = featuredVersion([
      version("v1", [variation("v1a", "kept", ["v1a.jpg"])]),
      version("v2", [variation("v2a", "to-try", [])]),
    ]);

    expect(featured?.id).toBe("v1");
  });

  it("n'est aucune version quand aucune n'a d'image", () => {
    expect(featuredVersion([version("v1", [variation("v1a", "kept", [])])])).toBeNull();
  });
});

describe("pickFeaturedImage", () => {
  it("à défaut d'image mise en avant, préfère la première œuvre entière à un détail placé avant", () => {
    const images = [
      loadedImageSchema.parse({ file: "v1a-01.jpg", src: "/a", kind: "detail", capture: "scan" }),
      loadedImageSchema.parse({ file: "v1a-02.jpg", src: "/b", kind: "work", capture: "scan" }),
    ];

    expect(pickFeaturedImage(images)?.file).toBe("v1a-02.jpg");
  });
});
