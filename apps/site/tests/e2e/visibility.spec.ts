import { expect, test } from "@playwright/test";

// Le site public ne montre que les pièces publiées qui ont une image : jamais une case vide.

test("une pièce publiée sans image est absente du site public", async ({ page, request }) => {
  expect((await request.get("/hong-lou-meng/shuo-dao-xin-suan-chu")).status()).toBe(404);
  expect((await request.get("/yi-jin-jing/yi-jin-jing")).status()).toBe(404);

  for (const path of ["/", "/hong-lou-meng", "/yi-jin-jing"]) {
    await page.goto(path);
    await expect(page.getByText("說到辛酸處")).toHaveCount(0);
    await expect(page.getByTestId("piece-link").filter({ hasText: "易筋經" })).toHaveCount(0);
  }
});

test("les comptes de pièces ne comptent que les pièces visibles", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pièces · 8" })).toBeVisible();
  await expect(page.getByRole("link", { name: /紅樓夢/ })).toContainText("1 pièce");
  await expect(page.getByRole("link", { name: /易筋經/ })).toContainText("0 pièce");

  await page.goto("/hong-lou-meng");
  await expect(page.getByRole("heading", { name: "Pièces · 1" })).toBeVisible();
});

test("la section « Sans scan » est absente en public", async ({ page }) => {
  for (const path of ["/", "/hong-lou-meng"]) {
    await page.goto(path);
    await expect(page.getByText(/Sans scan/)).toHaveCount(0);
  }
});
