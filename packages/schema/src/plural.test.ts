import { describe, expect, it } from "vitest";
import { plural } from "./index.js";

describe("un compte dit en français", () => {
  it("laisse au singulier un compte de un", () => {
    expect(plural(1, "pièce")).toBe("1 pièce");
  });

  it("met au pluriel chaque mot d'un compte de plus de un", () => {
    expect(plural(2, "pièce")).toBe("2 pièces");
    expect(plural(3, "ligne horizontale")).toBe("3 lignes horizontales");
  });
});
