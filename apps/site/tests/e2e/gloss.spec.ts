import { expect, test, type Locator } from "@playwright/test";

const yongGloss = "Les 8 mouvements fondamentaux de l'éternité, exécutés au solstice d'été 2026.";
const projectGloss = "Explorations personnelles";

/** La glose se lit sous le titre : son haut est sous le bas du titre. */
async function expectBelow(gloss: Locator, title: Locator) {
  const [glossBox, titleBox] = [await gloss.boundingBox(), await title.boundingBox()];
  expect(glossBox!.y).toBeGreaterThanOrEqual(titleBox!.y + titleBox!.height - 1);
}

test("la glose d'une pièce paraît sous son titre, sur sa page", async ({ page }) => {
  await page.goto("/ge-zhi-yan-jiu/yong-cao-shu");

  const title = page.getByRole("heading", { name: "永草書" });
  const gloss = page.getByTestId("gloss");
  await expect(gloss).toHaveText(yongGloss);
  await expectBelow(gloss, title);
});

test("la glose d'une pièce paraît sous son titre, dans la liste du projet", async ({ page }) => {
  await page.goto("/ge-zhi-yan-jiu");

  const card = page.getByTestId("piece-link").filter({ hasText: "永草書" });
  const gloss = card.getByTestId("gloss");
  await expect(gloss).toHaveText(yongGloss);
  await expectBelow(gloss, card.getByRole("heading", { name: "永草書" }));
});

test("la glose d'un projet paraît sous son titre, sur l'accueil et sur sa page", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByTestId("project-row").filter({ has: page.getByTestId("gloss") });
  await expect(card).toHaveCount(1);
  await expect(card.getByTestId("gloss")).toHaveText(projectGloss);
  await expectBelow(card.getByTestId("gloss"), card.getByRole("heading"));

  await card.getByRole("link", { name: "戈之研究" }).click();
  await expect(page).toHaveURL("/ge-zhi-yan-jiu");
  const gloss = page.getByTestId("gloss").filter({ hasText: projectGloss });
  await expect(gloss).toBeVisible();
  await expectBelow(gloss, page.getByRole("heading", { level: 2 }));
});

test("sans glose, rien ne paraît à sa place", async ({ page }) => {
  await page.goto("/");
  const card = page.getByTestId("piece-link").filter({ hasText: "莫性急" });
  await expect(card).toBeVisible();
  await expect(card.getByTestId("gloss")).toHaveCount(0);
  await expect(
    page
      .getByTestId("project-row")
      .filter({ has: page.getByRole("heading", { name: "紅樓夢", exact: true }) })
      .getByTestId("gloss"),
  ).toHaveCount(0);

  await page.goto("/pieces/mo-xing-ji");
  await expect(page.getByRole("heading", { name: "莫性急" })).toBeVisible();
  await expect(page.getByTestId("gloss")).toHaveCount(0);

  await page.goto("/hong-lou-meng");
  await expect(page.getByTestId("gloss")).toHaveCount(0);
});
