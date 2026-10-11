import { describe, expect, it } from "vitest";
import { deriveSlug, disambiguate } from "./slug.js";

describe("deriveSlug", () => {
  it("dérive un slug en pinyin sans tons du titre chinois", () => {
    expect(deriveSlug("山居秋暝")).toBe("shan-ju-qiu-ming");
  });

  it("accepte un titre écrit en simplifié", () => {
    expect(deriveSlug("有心求柔，无意成刚")).toBe("you-xin-qiu-rou-wu-yi-cheng-gang");
  });

  it("laisse la ponctuation, les emoji et les guillemets chinois de côté", () => {
    expect(deriveSlug("（回光反照） 《破惑歌》")).toBe("hui-guang-fan-zhao-po-huo-ge");
    expect(deriveSlug("📜 百字碑")).toBe("bai-zi-bei");
  });

  it("garde les mots latins entiers plutôt que de les épeler", () => {
    expect(deriveSlug("مشكاة • MESHKAH ")).toBe("meshkah");
  });

  it("romanise chaque caractère han d'un titre mêlé", () => {
    expect(deriveSlug("易筋经 v2")).toBe("yi-jin-jing-v2");
  });

  it("tronque un titre trop long sur une frontière de syllabe", () => {
    const slug = deriveSlug("南海之帝為倏北海之帝為忽中央之帝為混沌倏與忽時相與遇於混沌之地");

    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug.split("-").every((part) => part !== "")).toBe(true);
  });

  it("retombe sur un slug de repli quand rien n'est romanisable", () => {
    expect(deriveSlug("〔﹣〕")).toBe("sans-titre");
  });
});

describe("disambiguate", () => {
  it("laisse un slug libre intact", () => {
    expect(disambiguate("mo-xing-ji", new Set())).toBe("mo-xing-ji");
  });

  it("suffixe un slug déjà pris jusqu'à en trouver un libre", () => {
    const taken = new Set(["mo-xing-ji", "mo-xing-ji-2"]);

    expect(disambiguate("mo-xing-ji", taken)).toBe("mo-xing-ji-3");
  });
});
