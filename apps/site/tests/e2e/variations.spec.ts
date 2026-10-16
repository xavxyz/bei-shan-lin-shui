import { expect, test, type Page } from "@playwright/test";

const piecePath = "/montagnes/shan-ju-qiu-ming";

/** Les variations à l'écran : celles de la version courante, l'évolution restant repliée. */
function variations(page: Page) {
  return page.getByTestId("variation").filter({ visible: true });
}

test("toutes les variations de la version courante sont listées, dans l'ordre du fichier", async ({
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

test("une variation écartée est listée avec son commentaire", async ({ page }) => {
  await page.goto(piecePath);

  const setAside = variations(page).filter({ hasText: "écartée" });
  await expect(setAside).toBeVisible();
  await expect(setAside.getByTestId("variation-note")).toHaveText(
    "Le grand courant noie la lumière ; à laisser de côté.",
  );
});

test("une variation sans image est listée, mais absente du carrousel", async ({ page }) => {
  await page.goto(piecePath);
  await expect(page.getByRole("button", { name: "Image suivante" }).first()).toBeVisible();

  const withoutImage = variations(page).filter({ hasText: "cursive folle" });
  await expect(withoutImage).toBeVisible();
  await expect(withoutImage.getByTestId("variation-status")).toHaveText("à essayer");
  await expect(withoutImage.getByRole("button")).toHaveCount(0);

  const thumbnailGroups = page
    .getByTestId("carousel-thumbnails")
    .filter({ visible: true })
    .getByRole("list");
  await expect(thumbnailGroups).toHaveCount(2);
  await expect(page.getByRole("list", { name: "v2b · cursive folle" })).toHaveCount(0);
});

test("la liste des variations ne contient aucune image", async ({ page }) => {
  await page.goto(piecePath);

  await expect(variations(page).locator("img")).toHaveCount(0);
});
