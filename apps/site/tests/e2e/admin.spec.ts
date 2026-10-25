import { expect, test } from "@playwright/test";

// Ces parcours tournent sur le build des fixtures en mode admin.

test("en mode admin, une pièce non publiée a sa page, marquée non publiée", async ({ page }) => {
  await page.goto("/zhong-he-ji/gui-she-xiang-jiao-shui-huo-ji-ji-zhen-yi-nai-ding-zhong-he");

  await expect(
    page.getByRole("heading", { name: "龜蛇相交，水火既濟，眞一乃定，中和乃成" }),
  ).toBeVisible();
  await expect(page.getByTestId("unpublished")).toHaveText("non publiée");
});

test("en mode admin, une pièce non publiée figure dans son projet et dans son décompte", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /中和集/ })).toContainText("2 pièces");

  await page.goto("/zhong-he-ji");
  const card = page.getByTestId("piece-link").filter({ hasText: "龜蛇相交" });
  await expect(card).toContainText("non publiée");
  await expect(
    page.getByTestId("piece-link").filter({ hasText: "虛心實腹" }).getByText("non publiée"),
  ).toHaveCount(0);

  await card.click();
  await expect(page).toHaveURL(
    "/zhong-he-ji/gui-she-xiang-jiao-shui-huo-ji-ji-zhen-yi-nai-ding-zhong-he",
  );
});

test("en mode admin, une pièce non publiée sans projet figure dans les pièces isolées", async ({
  page,
}) => {
  await page.goto("/");

  const card = page.getByTestId("piece-link").filter({ hasText: "篤志力行" });
  await expect(card).toContainText("non publiée");

  await card.click();
  await expect(page).toHaveURL("/pieces/du-zhi-li-xing-zhuan-xin-jing-xing");
  await expect(page.getByTestId("unpublished")).toHaveText("non publiée");
});
