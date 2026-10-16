import { expect, test, type Page } from "@playwright/test";

const piecePath = "/montagnes/shan-ju-qiu-ming";

function variations(page: Page) {
  return page.getByTestId("variation");
}

test("toutes les variations de la version courante sont montrées, dans l'ordre du fichier", async ({
  page,
}) => {
  await page.goto(piecePath);

  await expect(variations(page)).toHaveCount(3);
  await expect(variations(page).getByTestId("variation-script")).toHaveText([
    "cursif",
    "cursive folle",
    "grand courant",
  ]);
  await expect(variations(page).getByTestId("variation-status")).toHaveText([
    "retenue",
    "à essayer",
    "écartée",
  ]);
});

test("une variation écartée est visible, avec son commentaire et ses images", async ({ page }) => {
  await page.goto(piecePath);

  const setAside = variations(page).filter({ hasText: "écartée" });
  await expect(setAside).toBeVisible();
  await expect(setAside.getByTestId("variation-note")).toHaveText(
    "Le grand courant noie la lumière ; à laisser de côté.",
  );
  await expect(setAside.locator(".viewer__image")).toBeVisible();
});

test("une variation sans image apparaît avec son style et son statut", async ({ page }) => {
  await page.goto(piecePath);

  const withoutImage = variations(page).filter({ hasText: "cursive folle" });
  await expect(withoutImage).toBeVisible();
  await expect(withoutImage.getByTestId("variation-status")).toHaveText("à essayer");
  await expect(withoutImage.locator("img")).toHaveCount(0);
});

test("les images d'une variation vont de l'œuvre entière au contexte, puis dans l'ordre du fichier", async ({
  page,
}) => {
  await page.goto(piecePath);

  const setAside = variations(page).filter({ hasText: "écartée" });
  const thumbnails = setAside.locator(".viewer__thumbnail img");
  const sources = await thumbnails.evaluateAll((images) =>
    images.map((image) => image.getAttribute("src")),
  );

  expect(sources).toEqual([
    "/content-images/shan-ju-qiu-ming/v2c-04.jpg",
    "/content-images/shan-ju-qiu-ming/v2c-03.jpg",
    "/content-images/shan-ju-qiu-ming/v2c-05.jpg",
    "/content-images/shan-ju-qiu-ming/v2c-02.jpg",
    "/content-images/shan-ju-qiu-ming/v2c-01.jpg",
  ]);
});

test("cliquer une image d'une variation l'ouvre dans la visionneuse, sans toucher l'œuvre mise en avant", async ({
  page,
}) => {
  await page.goto(piecePath);

  const setAside = variations(page).filter({ hasText: "écartée" });
  const shown = setAside.locator(".viewer__image");
  await expect(shown).toHaveAttribute("src", "/content-images/shan-ju-qiu-ming/v2c-04.jpg");

  await setAside.getByRole("button", { name: "Étude de 松 et de 照." }).click();

  await expect(shown).toHaveAttribute("src", "/content-images/shan-ju-qiu-ming/v2c-02.jpg");
  await expect(page.getByTestId("featured-work").locator(".viewer__image")).toHaveAttribute(
    "src",
    "/content-images/shan-ju-qiu-ming/v2a-01.jpg",
  );
});
