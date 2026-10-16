import { describe, expect, it } from "vitest";
import { loadedImageSchema, loadedVariationSchema, type LoadedVariation } from "@bsls/schema";
import { featuredVariation, pickFeaturedImage } from "@bsls/content/featured";

function variation(
  id: string,
  status: LoadedVariation["status"],
  files: string[],
): LoadedVariation {
  const images = files.map((file) =>
    loadedImageSchema.parse({ file, src: `/${file}`, kind: "work", capture: "scan" }),
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

describe("pickFeaturedImage", () => {
  it("à défaut d'image mise en avant, préfère la première œuvre entière à un détail placé avant", () => {
    const images = [
      loadedImageSchema.parse({ file: "v1a-01.jpg", src: "/a", kind: "detail", capture: "scan" }),
      loadedImageSchema.parse({ file: "v1a-02.jpg", src: "/b", kind: "work", capture: "scan" }),
    ];

    expect(pickFeaturedImage(images)?.file).toBe("v1a-02.jpg");
  });
});
