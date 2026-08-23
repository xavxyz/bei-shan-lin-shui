import { expect, test } from "@playwright/test";

test("la page d'accueil liste les projets et permet d'entrer dans l'un d'eux", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("project-link")).toHaveCount(2);
  await page.getByRole("link", { name: "Quatre saisons" }).click();

  await expect(page).toHaveURL("/four-seasons");
  await expect(page.getByRole("heading", { name: "Quatre saisons" })).toBeVisible();
});

test("une page de projet liste ses pièces et rend son thème visuel propre", async ({ page }) => {
  await page.goto("/montagnes");

  await expect(page.locator("html")).toHaveAttribute("data-theme", "cinnabar");
  await expect(page.getByTestId("piece-link")).toHaveCount(2);

  await page.goto("/four-seasons");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "jade");
});

test("une pièce de deux projets est accessible depuis l'un et l'autre", async ({ page }) => {
  for (const project of ["four-seasons", "montagnes"]) {
    await page.goto(`/${project}`);
    await page.getByRole("link", { name: "山居秋暝" }).click();

    await expect(page).toHaveURL(`/${project}/shan-ju-qiu-ming`);
    await expect(page.getByRole("heading", { name: "山居秋暝" })).toBeVisible();
  }
});

test("une pièce sans projet reste accessible depuis l'accueil", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "行行重行行" }).click();

  await expect(page).toHaveURL("/pieces/xing-xing-zhong-xing-xing");
});

test("aucun lien interne ne casse", async ({ page, request }) => {
  const visited = new Set<string>();
  const queue = ["/"];

  while (queue.length > 0) {
    const path = queue.shift()!;
    if (visited.has(path)) continue;
    visited.add(path);

    const response = await request.get(path);
    expect(response.status(), `lien cassé : ${path}`).toBe(200);

    await page.goto(path);
    const links = await page
      .locator("a[href^='/']")
      .evaluateAll((anchors) =>
        anchors.map((anchor) => new URL((anchor as HTMLAnchorElement).href).pathname),
      );
    queue.push(...links);
  }

  expect(visited.size).toBeGreaterThan(4);
});
