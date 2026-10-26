import { expect, test, type Page } from "@playwright/test";

const piecePath = "/pieces/mo-xing-ji";

function earlierVersions(page: Page) {
  return page.getByTestId("earlier-version");
}

test("les versions antérieures suivent la version courante, sans repli", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByRole("region", { name: "Versions antérieures" })).toBeVisible();
  await expect(earlierVersions(page)).toHaveCount(1);
  await earlierVersions(page).scrollIntoViewIfNeeded();
  await expect(earlierVersions(page)).toBeVisible();
});

test("chaque version antérieure montre ses faits et son texte en simplifié", async ({ page }) => {
  await page.goto(piecePath);

  const version = earlierVersions(page);
  await expect(version.getByTestId("earlier-version-date")).toHaveText("3 janvier 2026");
  await expect(version.getByTestId("earlier-version-chinese-date")).toHaveText("乙巳冬至");
  await expect(version.getByTestId("earlier-version-format")).toHaveText("2x7");
  await expect(version.getByTestId("version-text").getByRole("listitem")).toHaveText(
    ["莫性急平流缓进", "墨行机兔起鹘落"],
    { useInnerText: true },
  );
});

test("toutes les variations d'une version antérieure sont listées", async ({ page }) => {
  await page.goto(piecePath);

  const variations = earlierVersions(page).getByTestId("variation");
  await expect(variations).toHaveCount(1);
  await expect(variations.getByTestId("variation-script")).toHaveText(["régulier"]);
  await expect(variations.getByTestId("variation-status")).toHaveText(["essayée"]);
});

test("une pièce à version unique n'a pas de versions antérieures", async ({ page }) => {
  await page.goto("/pieces/ti-po-shan-si-hou-shan-yuan");

  await expect(page.getByRole("heading", { name: "題破山寺後禪院" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Versions antérieures" })).toHaveCount(0);
  await expect(earlierVersions(page)).toHaveCount(0);
});
