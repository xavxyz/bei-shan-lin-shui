import { expect, test, type Page } from "@playwright/test";

const piecePath = "/montagnes/shan-ju-qiu-ming";

function showEvolution(page: Page) {
  return page.getByText("voir l'évolution", { exact: true });
}

function earlierVersions(page: Page) {
  return page.getByTestId("earlier-version");
}

test("les versions antérieures sont repliées au chargement", async ({ page }) => {
  await page.goto(piecePath);

  await expect(showEvolution(page)).toBeVisible();
  await expect(
    page.getByText("Deux colonnes, encre grasse, beaucoup de blanc en bas."),
  ).toBeHidden();
  await expect(page.getByText("Trop sage, les liaisons manquent de tension.")).toBeHidden();
});

test("voir l'évolution montre chaque version antérieure en entier", async ({ page }) => {
  await page.goto(piecePath);
  await showEvolution(page).click();

  const version = earlierVersions(page);
  await expect(version).toHaveCount(1);
  const date = version.getByTestId("earlier-version-date");
  await expect(date).toContainText("4 mars 2026");
  await expect(date).toContainText("丙午雨水");
  await expect(version.getByTestId("earlier-version-format")).toHaveText("A4 vertical");
  await expect(version.getByTestId("earlier-version-columns")).toHaveText(
    "空山新雨後 / 天氣晚來秋",
  );
  await expect(version.getByTestId("earlier-version-intention")).toHaveText(
    "Deux colonnes, encre grasse, beaucoup de blanc en bas.",
  );
});

test("toutes les variations d'une version antérieure sont listées, avec leur commentaire", async ({
  page,
}) => {
  await page.goto(piecePath);
  await showEvolution(page).click();

  const variations = earlierVersions(page).getByTestId("variation");
  await expect(variations).toHaveCount(2);
  await expect(variations.getByTestId("variation-script")).toHaveText(["courant", "régulier"]);
  await expect(variations.getByTestId("variation-status")).toHaveText(["écartée", "essayée"]);

  const setAside = variations.filter({ hasText: "écartée" });
  await expect(setAside.getByTestId("variation-note")).toHaveText(
    "Trop sage, les liaisons manquent de tension.",
  );

  const tried = variations.filter({ hasText: "essayée" });
  await expect(tried.getByTestId("variation-note")).toHaveText(
    "En régulier, pour poser la structure de 雨.",
  );
});

test("cliquer une variation d'une version antérieure amène son carrousel sur sa première image", async ({
  page,
}) => {
  await page.goto(piecePath);
  await showEvolution(page).click();

  const carousel = earlierVersions(page).getByTestId("carousel");
  await expect(carousel.getByRole("button", { name: "Image suivante" })).toBeVisible();
  await carousel
    .getByTestId("variation")
    .filter({ hasText: "essayée" })
    .getByRole("button")
    .click();

  await expect(carousel.getByTestId("carousel-image")).toHaveAttribute(
    "src",
    "/content-images/shan-ju-qiu-ming/v1b-01.jpg",
  );
});

test("les versions antérieures vont de la plus ancienne à la plus récente", async ({ page }) => {
  await page.goto("/pieces/xing-xing-zhong-xing-xing");
  await showEvolution(page).click();

  await expect(
    earlierVersions(page).getByTestId("earlier-version-date").locator("time"),
  ).toHaveText(["9 avril 2026", "23 avril 2026"]);
});

test("une pièce à version unique n'affiche pas « voir l'évolution »", async ({ page }) => {
  await page.goto("/montagnes/deng-guan-que-lou");

  await expect(page.getByRole("heading", { name: "登鸛雀樓" })).toBeVisible();
  await expect(showEvolution(page)).toHaveCount(0);
});
