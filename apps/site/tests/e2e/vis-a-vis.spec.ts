import { expect, test, type Page } from "@playwright/test";
import { box, expectInReadingOrder } from "./reading-order.js";

/**
 * La page pièce en Vis-à-vis : l'œuvre à gauche, qui tient à l'écran, le texte
 * à droite, qui défile. On regarde où les choses sont, pas comment elles y sont.
 */

/** 題破山寺後禪院 : une image, six lignes de texte. */
const longText = "/pieces/ti-po-shan-si-hou-shan-yuan";
/** 永草書 : un projet, une glose, une liste sans traduction et une intention. */
const withGloss = "/ge-zhi-yan-jiu/yong-cao-shu";
/** 成人不自在 : une version traduite, donc un tableau. */
const translated = "/hong-lou-meng/cheng-ren-bu-zi-zai-zi-zai-bu-cheng-ren";
/** 莫性急 : deux versions, une image chacune. */
const twoVersions = "/pieces/mo-xing-ji";

function work(page: Page) {
  return page.getByTestId("carousel-image").first();
}

function facts(page: Page) {
  return page.getByRole("term").first();
}

function earlierVersion(page: Page) {
  return page.getByTestId("earlier-version");
}

test.describe("sur un écran large", () => {
  test.use({ viewport: { width: 1280, height: 560 } });

  test("l'œuvre est à gauche du texte", async ({ page }) => {
    await page.goto(longText);

    const image = await box(work(page));
    const title = await box(page.getByRole("heading", { name: "題破山寺後禪院" }));
    const text = await box(page.getByTestId("version-text"));
    expect(image.right).toBeLessThan(title.left);
    expect(image.right).toBeLessThan(text.left);
  });

  test("l'œuvre tient entière à l'écran, sans recadrage, quand le texte défile", async ({
    page,
  }) => {
    await page.goto(longText);
    await expect(work(page)).toHaveJSProperty("complete", true);
    // L'image fait 800 px de haut : plus que la fenêtre.
    const viewport = page.viewportSize()!;
    // Le pinyin passé en popover, aucune pièce des fixtures n'a un texte plus haut que son
    // œuvre : on allonge le texte, pour qu'il ait de quoi défiler.
    await page
      .getByTestId("version-text")
      .first()
      .evaluate((text) => {
        (text as HTMLElement).style.minHeight = "300vh";
      });

    // Assez loin pour qu'une œuvre qui défilerait avec le texte soit sortie par le haut.
    const before = await box(work(page));
    await page.mouse.wheel(0, before.top + 50);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before.top + 40);
    // Le texte, lui, a défilé : le fil d'Ariane est passé.
    await expect(page.getByRole("navigation", { name: "Fil d'Ariane" })).not.toBeInViewport();

    const image = await box(work(page));
    expect(image.top).toBeGreaterThanOrEqual(0);
    expect(image.bottom).toBeLessThanOrEqual(viewport.height);

    const natural = await work(page).evaluate((element) => {
      const image = element as HTMLImageElement;
      return image.naturalWidth / image.naturalHeight;
    });
    expect(image.width / image.height).toBeCloseTo(natural, 1);
  });

  test("le fil d'Ariane, le titre, la glose, le texte, les faits puis l'intention se suivent", async ({
    page,
  }) => {
    await page.goto(withGloss);

    await expectInReadingOrder({
      "fil d'Ariane": page.getByRole("navigation", { name: "Fil d'Ariane" }),
      titre: page.getByRole("heading", { name: "永草書" }),
      glose: page.getByTestId("gloss"),
      texte: page.getByTestId("version-text"),
      faits: facts(page),
      intention: page.getByText("Exploration sans modèle du caractère 永 en cursive."),
    });
  });

  test("le fil d'Ariane mène à l'accueil et aux projets de la pièce, par leur titre chinois", async ({
    page,
  }) => {
    await page.goto("/zhong-he-ji/xu-xin-shi-fu");

    const breadcrumb = page.getByRole("navigation", { name: "Fil d'Ariane" });
    await expect(breadcrumb.getByRole("link")).toHaveText(["Accueil", "中和集", "修竹參差"]);
    await expect(breadcrumb.getByRole("link", { name: "中和集" })).toHaveAttribute(
      "lang",
      "zh-Hant",
    );
  });

  test("le tableau précède les faits", async ({ page }) => {
    await page.goto(translated);

    await expectInReadingOrder({
      titre: page.getByRole("heading", { name: "成人不自在，自在不成人" }),
      tableau: page.getByRole("table"),
      faits: facts(page),
    });
  });

  test("les faits se lisent en deux colonnes : date, date chinoise, format, style, statut, source", async ({
    page,
  }) => {
    await page.goto("/zhong-he-ji/xu-xin-shi-fu");

    await expect(page.getByRole("term")).toHaveText([
      "Date",
      "Date chinoise",
      "Format",
      "Style",
      "Statut",
      "Source",
    ]);
    await expect(page.getByRole("definition")).toHaveText([
      "25 février 2026",
      "丙午雨水",
      "3 colonnes de 7 caractères [(3x7)]",
      "libre",
      "encre sèche",
      "李道纯 · 中和集 · 元",
    ]);

    const term = await box(page.getByRole("term").first());
    const definition = await box(page.getByRole("definition").first());
    expect(definition.left).toBeGreaterThan(term.right);
    expect(Math.abs(definition.top - term.top)).toBeLessThan(term.height);
  });

  test("les versions antérieures suivent, chacune avec son œuvre à gauche de son texte", async ({
    page,
  }) => {
    await page.goto(twoVersions);

    const earlier = earlierVersion(page);
    await expect(earlier).toHaveCount(1);
    await earlier.scrollIntoViewIfNeeded();
    const image = await box(earlier.getByTestId("carousel-image"));
    const text = await box(earlier.getByTestId("version-text"));
    expect(image.right).toBeLessThan(text.left);
    expect(text.top).toBeLessThan(image.bottom);

    await expect(earlier.getByTestId("version-text").getByRole("listitem")).toHaveText(
      ["莫性急平流缓进", "墨行机兔起鹘落"],
      { useInnerText: true },
    );
    const current = await box(page.getByTestId("version-text").first());
    expect((await box(earlier)).top).toBeGreaterThan(current.bottom);
  });
});

test.describe("sous 64 rem", () => {
  test.use({ viewport: { width: 900, height: 900 } });

  test("la page s'empile : titre, glose, œuvre, texte, faits, prose", async ({ page }) => {
    await page.goto(withGloss);

    await expectInReadingOrder({
      titre: page.getByRole("heading", { name: "永草書" }),
      glose: page.getByTestId("gloss"),
      œuvre: work(page),
      texte: page.getByTestId("version-text"),
      faits: facts(page),
      intention: page.getByText("Exploration sans modèle du caractère 永 en cursive."),
    });
  });

  test("les versions antérieures viennent en dernier", async ({ page }) => {
    await page.goto(twoVersions);

    await expectInReadingOrder({
      titre: page.getByRole("heading", { name: "莫性急" }),
      œuvre: work(page),
      texte: page.getByTestId("version-text").first(),
      faits: facts(page),
      "version antérieure": earlierVersion(page),
    });
    // L'œuvre suit le texte du regard : elle ne reste plus collée en haut.
    await page.mouse.wheel(0, 1500);
    await expect(work(page)).not.toBeInViewport();
  });
});

test.describe("sous 40 rem", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("chaque ligne du tableau empile le simplifié au-dessus du français", async ({ page }) => {
    await page.goto(translated);

    const rows = page
      .getByRole("table")
      .getByRole("row")
      .filter({ has: page.getByRole("cell") });
    await expect(rows).toHaveCount(2);
    for (const row of await rows.all()) {
      const [chinese, french] = await row.getByRole("cell").all();
      const zh = await box(chinese!);
      const fr = await box(french!);
      expect(fr.top).toBeGreaterThanOrEqual(zh.bottom - 1);
      expect(Math.abs(fr.left - zh.left)).toBeLessThan(2);
    }
  });
});

test("chaque écriture est balisée dans sa langue", async ({ page }) => {
  await page.goto("/zhong-he-ji/xu-xin-shi-fu");

  await expect(page.getByRole("heading", { name: "虛心實腹" })).toHaveAttribute("lang", "zh-Hant");
  await expect(page.getByTestId("version-text")).toHaveAttribute("lang", "zh-Hans");
  await page.getByRole("heading", { name: "虛心實腹" }).getByText("虛心實腹").hover();
  await expect(page.getByRole("tooltip")).toHaveAttribute("lang", "zh-Latn-pinyin");
  await expect(page.getByRole("definition").filter({ hasText: "丙午雨水" })).toHaveAttribute(
    "lang",
    "zh-Hans",
  );
  await expect(page.getByRole("definition").filter({ hasText: "李道纯" })).toHaveAttribute(
    "lang",
    "zh-Hans",
  );
});

test("plus aucun repli ni texte vertical", async ({ page }) => {
  for (const path of [twoVersions, translated, longText, "/pieces/mo-si-wen-ke"]) {
    await page.goto(path);

    await expect(page.locator("details")).toHaveCount(0);
    const vertical = await page
      .locator("body *")
      .evaluateAll(
        (elements) =>
          elements.filter((element) => getComputedStyle(element).writingMode.startsWith("vertical"))
            .length,
      );
    expect(vertical, path).toBe(0);
  }
});
