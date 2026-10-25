import { expect, test, type Page } from "@playwright/test";

const piecePath = "/pieces/mo-xing-ji";

function showEvolution(page: Page) {
  return page.getByText("voir l'évolution", { exact: true });
}

function earlierVersions(page: Page) {
  return page.getByTestId("earlier-version");
}

test("les versions antérieures sont repliées au chargement", async ({ page }) => {
  await page.goto(piecePath);

  await expect(showEvolution(page)).toBeVisible();
  await expect(earlierVersions(page)).toBeHidden();
});

test("voir l'évolution montre chaque version antérieure en entier", async ({ page }) => {
  await page.goto(piecePath);
  await showEvolution(page).click();

  const version = earlierVersions(page);
  await expect(version).toHaveCount(1);
  const date = version.getByTestId("earlier-version-date");
  await expect(date).toContainText("3 janvier 2026");
  await expect(date).toContainText("乙巳冬至");
  await expect(version.getByTestId("earlier-version-format")).toHaveText("2x7");
  await expect(version.getByTestId("earlier-version-columns")).toHaveText(
    "莫性急平流緩進 / 墨行機兔起鶻落",
  );
});

test("toutes les variations d'une version antérieure sont listées", async ({ page }) => {
  await page.goto(piecePath);
  await showEvolution(page).click();

  const variations = earlierVersions(page).getByTestId("variation");
  await expect(variations).toHaveCount(1);
  await expect(variations.getByTestId("variation-script")).toHaveText(["régulier"]);
  await expect(variations.getByTestId("variation-status")).toHaveText(["essayée"]);
});

test("une pièce à version unique n'affiche pas « voir l'évolution »", async ({ page }) => {
  await page.goto("/pieces/ti-po-shan-si-hou-shan-yuan");

  await expect(page.getByRole("heading", { name: "題破山寺後禪院" })).toBeVisible();
  await expect(showEvolution(page)).toHaveCount(0);
});
