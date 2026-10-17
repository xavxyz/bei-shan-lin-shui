import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Playwright vérifie que le carrousel est monté et navigue dans une page
 * réelle. Ses états d'affichage relèvent de react-cosmos, pas d'ici.
 */
const piecePath = "/montagnes/shan-ju-qiu-ming";
const images = "/content-images/shan-ju-qiu-ming";

/** Le carrousel de la version courante : le premier de la page, avant l'évolution. */
function carousel(page: Page) {
  return page.getByTestId("carousel").first();
}

function shown(page: Page) {
  return carousel(page).getByTestId("carousel-image");
}

/** Les flèches n'apparaissent qu'une fois l'îlot monté. */
async function mounted(page: Page) {
  await expect(carousel(page).getByRole("button", { name: "Image suivante" })).toBeVisible();
}

test("chaque image de la version courante apparaît exactement une fois sur la page", async ({
  page,
}) => {
  await page.goto(piecePath);
  await mounted(page);

  const current = [
    "v2a-01.jpg",
    "v2a-02.jpg",
    "v2c-01.jpg",
    "v2c-02.jpg",
    "v2c-03.jpg",
    "v2c-04.jpg",
    "v2c-05.jpg",
  ];
  // Les vignettes sont la table des images : chacune y figure une fois…
  const thumbnails = await carousel(page)
    .getByTestId("carousel-thumbnails")
    .locator("img")
    .evaluateAll((all) => all.map((image) => image.getAttribute("src")));
  expect([...thumbnails].sort()).toEqual(current.map((file) => `${images}/${file}`));

  // … et, hors d'elles, la page ne montre que l'image affichée.
  const elsewhere = await page
    .locator("img:visible")
    .evaluateAll((all) =>
      all
        .filter((image) => !image.closest('[data-testid="carousel-thumbnails"]'))
        .map((image) => image.getAttribute("src")),
    );
  expect(elsewhere).toEqual([`${images}/v2a-01.jpg`]);
});

test("le carrousel s'ouvre sur l'image mise en avant, sa légende en français", async ({ page }) => {
  await page.goto(piecePath);

  await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-01.jpg`);
  const caption = carousel(page).getByTestId("carousel-caption");
  await expect(caption).toContainText("v2a");
  await expect(caption).toContainText("cursif");
  await expect(caption).toContainText("retenue");
  await expect(caption).toContainText("œuvre entière");
  await expect(caption).toContainText("Version retenue, encre de Chine sur papier de riz.");
  await expect(caption).toContainText("1 / 7");
});

test("le carrousel est sous le titre, avant le texte", async ({ page }) => {
  await page.goto(piecePath);

  const top = (locator: Locator) =>
    locator.evaluate((element) => element.getBoundingClientRect().top);
  const title = await top(page.getByRole("heading", { name: "山居秋暝" }));
  const image = await top(shown(page));
  const text = await top(page.getByTestId("chinese-text"));
  expect(image).toBeGreaterThan(title);
  expect(text).toBeGreaterThan(image);
});

test("la flèche suivante passe à l'image suivante, puis d'une variation à la suivante", async ({
  page,
}) => {
  await page.goto(piecePath);
  await mounted(page);
  const next = carousel(page).getByRole("button", { name: "Image suivante" });

  await next.click();
  await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-02.jpg`);

  await next.click();
  await expect(shown(page)).toHaveAttribute("src", `${images}/v2c-04.jpg`);
  await expect(carousel(page).getByTestId("carousel-caption")).toContainText("grand courant");
  await expect(carousel(page).getByTestId("carousel-caption")).toContainText("3 / 7");

  await carousel(page).getByRole("button", { name: "Image précédente" }).click();
  await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-02.jpg`);
});

test("glisser vers la gauche passe à l'image suivante", async ({ page }) => {
  await page.goto(piecePath);
  await mounted(page);

  const box = await carousel(page).getByTestId("carousel-stage").boundingBox();
  if (!box) throw new Error("le carrousel n'a pas de surface");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.8, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, y, { steps: 5 });
  await page.mouse.up();

  await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-02.jpg`);
});

test("les images d'une variation vont de l'œuvre entière au contexte, puis dans l'ordre du fichier", async ({
  page,
}) => {
  await page.goto(piecePath);
  await mounted(page);

  const sources = await carousel(page)
    .getByTestId("carousel-thumbnails")
    .locator("img")
    .evaluateAll((thumbnails) => thumbnails.map((image) => image.getAttribute("src")));

  expect(sources).toEqual([
    `${images}/v2a-01.jpg`,
    `${images}/v2a-02.jpg`,
    `${images}/v2c-04.jpg`,
    `${images}/v2c-03.jpg`,
    `${images}/v2c-05.jpg`,
    `${images}/v2c-02.jpg`,
    `${images}/v2c-01.jpg`,
  ]);
});

test("cliquer une vignette l'affiche", async ({ page }) => {
  await page.goto(piecePath);
  await mounted(page);

  await carousel(page).getByRole("button", { name: "Étude de 松 et de 照." }).click();

  await expect(shown(page)).toHaveAttribute("src", `${images}/v2c-02.jpg`);
});

test("vignettes sur écran large, points sous 768 px", async ({ page }) => {
  await page.goto(piecePath);
  await mounted(page);

  await expect(carousel(page).getByTestId("carousel-thumbnails")).toBeVisible();
  await expect(carousel(page).getByTestId("carousel-dots")).toBeHidden();

  await page.setViewportSize({ width: 390, height: 844 });

  await expect(carousel(page).getByTestId("carousel-thumbnails")).toBeHidden();
  await expect(carousel(page).getByTestId("carousel-dots")).toBeVisible();
  await carousel(page).getByTestId("carousel-dots").getByRole("button").nth(2).click();
  await expect(shown(page)).toHaveAttribute("src", `${images}/v2c-04.jpg`);
});

test("cliquer une variation de la liste amène le carrousel sur sa première image", async ({
  page,
}) => {
  await page.goto(piecePath);
  await mounted(page);

  const variations = carousel(page).getByTestId("variation");
  await variations.filter({ hasText: "grand courant" }).getByRole("button").click();

  await expect(shown(page)).toHaveAttribute("src", `${images}/v2c-04.jpg`);
  await expect(variations.filter({ hasText: "grand courant" })).toHaveAttribute(
    "aria-current",
    "true",
  );
  await expect(variations.filter({ hasText: "cursif" })).not.toHaveAttribute("aria-current");
});

test("une version antérieure dépliée a son propre carrousel", async ({ page }) => {
  await page.goto(piecePath);
  await mounted(page);
  await page.getByText("voir l'évolution", { exact: true }).click();

  const earlier = page.getByTestId("earlier-version").getByTestId("carousel");
  await expect(earlier.getByTestId("carousel-image")).toHaveAttribute(
    "src",
    `${images}/v1a-01.jpg`,
  );
  await expect(earlier.getByTestId("carousel-caption")).toContainText("1 / 2");

  await earlier.getByRole("button", { name: "Image suivante" }).click();
  await expect(earlier.getByTestId("carousel-image")).toHaveAttribute(
    "src",
    `${images}/v1b-01.jpg`,
  );
  await expect(earlier.getByTestId("carousel-caption")).toContainText("régulier");
  await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-01.jpg`);
});

test("une pièce à une seule image n'a ni flèches ni vignettes", async ({ page }) => {
  await page.goto("/montagnes/deng-guan-que-lou");

  await expect(shown(page)).toBeVisible();
  await expect(page.getByRole("button", { name: "Image suivante" })).toHaveCount(0);
  await expect(page.getByTestId("carousel-thumbnails")).toHaveCount(0);
});

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("la page montre la première image et la liste des variations", async ({ page }) => {
    await page.goto(piecePath);

    await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-01.jpg`);
    await expect(carousel(page).getByTestId("variation")).toHaveCount(3);
  });
});

test.describe("au clavier", () => {
  const evolution = (page: Page) => page.getByText("voir l'évolution", { exact: true });
  const earlier = (page: Page) => page.getByTestId("earlier-version").getByTestId("carousel");
  const position = (of: Locator) => of.getByTestId("carousel-position");

  test("sans cliquer, la flèche droite avance le carrousel visible", async ({ page }) => {
    await page.goto(piecePath);
    await mounted(page);

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(shown(page)).toHaveAttribute("src", `${images}/v2c-04.jpg`);
    await expect(position(carousel(page))).toHaveText("3 / 7");

    await page.keyboard.press("ArrowLeft");
    await expect(shown(page)).toHaveAttribute("src", `${images}/v2a-02.jpg`);
    await expect(position(carousel(page))).toHaveText("2 / 7");
  });

  test("avec un seul carrousel visible, la flèche bas fait défiler la page", async ({ page }) => {
    await page.goto(piecePath);
    await mounted(page);

    await page.keyboard.press("ArrowDown");

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    await expect(position(carousel(page))).toHaveText("1 / 7");
  });

  test("une version antérieure repliée ne capte jamais les flèches", async ({ page }) => {
    await page.goto(piecePath);
    await mounted(page);
    // Le carrousel courant hors de la fenêtre, il ne reste que celui, caché, de l'évolution.
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(shown(page)).not.toBeInViewport();

    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");
    await evolution(page).click();

    await expect(position(earlier(page))).toHaveText("1 / 2");
    await expect(earlier(page).getByTestId("carousel-image")).toHaveAttribute(
      "src",
      `${images}/v1a-01.jpg`,
    );
    await expect(position(carousel(page))).toHaveText("1 / 7");
  });

  test.describe("deux carrousels à l'écran", () => {
    test.use({ viewport: { width: 1280, height: 1600 } });

    /**
     * L'évolution dépliée, la fenêtre descend jusqu'à ne plus montrer que le
     * bas de l'image courante : l'image antérieure est la plus visible.
     */
    async function bothInView(page: Page) {
      await page.goto(piecePath);
      await mounted(page);
      await evolution(page).click();
      await expect(earlier(page).getByRole("button", { name: "Image suivante" })).toBeVisible();
      await shown(page).evaluate((image) => {
        const box = image.getBoundingClientRect();
        window.scrollTo(0, window.scrollY + box.bottom - box.height / 5);
      });
      await expect(shown(page)).toBeInViewport();
      await expect(shown(page)).not.toBeInViewport({ ratio: 0.5 });
      await expect(earlier(page).getByTestId("carousel-image")).toBeInViewport({ ratio: 0.5 });
    }

    test("la flèche droite pilote le premier de la page, même à peine visible", async ({
      page,
    }) => {
      await bothInView(page);

      await page.keyboard.press("ArrowRight");

      await expect(position(carousel(page))).toHaveText("2 / 7");
      await expect(position(earlier(page))).toHaveText("1 / 2");
    });

    test("les flèches haut et bas font défiler la page, sans changer d'image", async ({ page }) => {
      await bothInView(page);
      const before = await page.evaluate(() => window.scrollY);

      await page.keyboard.press("ArrowDown");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
      await page.keyboard.press("ArrowUp");
      await page.keyboard.press("ArrowUp");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(before);

      await expect(position(carousel(page))).toHaveText("1 / 7");
      await expect(position(earlier(page))).toHaveText("1 / 2");
    });

    test("le premier carrousel sorti de la fenêtre, la flèche droite pilote le suivant", async ({
      page,
    }) => {
      await bothInView(page);
      await earlier(page)
        .getByTestId("carousel-image")
        .evaluate((image) => image.scrollIntoView({ block: "end" }));
      await expect(shown(page)).not.toBeInViewport();

      await page.keyboard.press("ArrowRight");

      await expect(position(earlier(page))).toHaveText("2 / 2");
      await expect(position(carousel(page))).toHaveText("1 / 7");
    });
  });
});
