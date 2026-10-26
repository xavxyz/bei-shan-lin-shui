import { expect, test, type Page } from "@playwright/test";

/** La version courante a trois variations, dont la dernière n'a pas encore d'image. */
const piecePath = "/pieces/xin-nian-kuai-le-ma-dao-cheng-gong";

/** Les variations de la version courante : celles de son carrousel, le premier de la page. */
function variations(page: Page) {
  return page.getByTestId("carousel").first().getByTestId("variation");
}

test("toutes les variations de la version courante sont listées, dans l'ordre du fichier", async ({
  page,
}) => {
  await page.goto(piecePath);

  await expect(variations(page)).toHaveCount(3);
  await expect(variations(page).getByTestId("variation-script")).toHaveText([
    "régulier",
    "régulier",
    "libre",
  ]);
  await expect(variations(page).getByTestId("variation-status")).toHaveText([
    "retenue",
    "retenue",
    "retenue",
  ]);
});

test("une variation est listée avec son commentaire", async ({ page }) => {
  await page.goto("/hong-lou-meng/cheng-ren-bu-zi-zai-zi-zai-bu-cheng-ren");

  const kept = variations(page).filter({ hasText: "retenue" });
  await expect(kept).toBeVisible();
  await expect(kept.getByTestId("variation-note")).toContainText(
    "Exécution innocente et bien réalisée en plein orage le premier jour de l'été",
  );
});

test("une variation sans image est listée, mais absente du carrousel", async ({ page }) => {
  await page.goto(piecePath);
  await expect(page.getByRole("button", { name: "Image suivante" }).first()).toBeVisible();

  const withoutImage = variations(page).filter({ hasText: "libre" });
  await expect(withoutImage).toBeVisible();
  await expect(withoutImage.getByTestId("variation-status")).toHaveText("retenue");
  await expect(withoutImage.getByRole("button")).toHaveCount(0);

  const thumbnailGroups = page
    .getByTestId("carousel-thumbnails")
    .filter({ visible: true })
    .getByRole("list");
  await expect(thumbnailGroups).toHaveCount(2);
  await expect(page.getByRole("list", { name: "v2c · libre" })).toHaveCount(0);
});

test("la liste des variations ne contient aucune image", async ({ page }) => {
  await page.goto(piecePath);

  await expect(variations(page).locator("img")).toHaveCount(0);
});
