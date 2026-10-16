import { expect, test } from "@playwright/test";

// Ces parcours tournent sur le build des fixtures en mode admin.

test("en mode admin, une pièce non publiée a sa page, marquée non publiée", async ({ page }) => {
  await page.goto("/four-seasons/jing-ye-si");

  await expect(page.getByRole("heading", { name: "靜夜思" })).toBeVisible();
  await expect(page.getByTestId("unpublished")).toHaveText("non publiée");
});

test("en mode admin, une pièce non publiée figure dans son projet et dans son décompte", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Quatre saisons/ })).toContainText("2 pièces");

  await page.goto("/four-seasons");
  const card = page.getByTestId("piece-link").filter({ hasText: "靜夜思" });
  await expect(card).toContainText("non publiée");
  await expect(
    page.getByTestId("piece-link").filter({ hasText: "山居秋暝" }).getByText("non publiée"),
  ).toHaveCount(0);

  await card.click();
  await expect(page).toHaveURL("/four-seasons/jing-ye-si");
});

test("en mode admin, une pièce non publiée sans projet figure dans les pièces isolées", async ({
  page,
}) => {
  await page.goto("/");

  const card = page.getByTestId("piece-link").filter({ hasText: "春曉" });
  await expect(card).toContainText("non publiée");

  await card.click();
  await expect(page).toHaveURL("/pieces/chun-xiao");
  await expect(page.getByTestId("unpublished")).toHaveText("non publiée");
});
