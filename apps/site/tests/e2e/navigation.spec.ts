import { expect, test } from "@playwright/test";

test("la page d'accueil liste les projets et permet d'entrer dans l'un d'eux", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("project-link")).toHaveCount(5);
  await page.getByRole("link", { name: "戈之研究" }).click();

  await expect(page).toHaveURL("/ge-zhi-yan-jiu");
  await expect(page.getByRole("heading", { name: "戈之研究" })).toHaveAttribute("lang", "zh-Hant");
});

test("une page de projet liste ses pièces", async ({ page }) => {
  await page.goto("/hong-lou-meng");

  await expect(page.getByRole("heading", { name: "紅樓夢" })).toBeVisible();
  await expect(page.getByTestId("piece-link")).toHaveCount(2);
});

test("le fil d'Ariane d'une pièce nomme son projet par son titre chinois", async ({ page }) => {
  await page.goto("/ge-zhi-yan-jiu/yong-cao-shu");

  const crumb = page.getByRole("navigation").getByRole("link", { name: "戈之研究" });
  await expect(crumb).toHaveAttribute("lang", "zh-Hant");
  await crumb.click();
  await expect(page).toHaveURL("/ge-zhi-yan-jiu");
});

test("une pièce de deux projets est accessible depuis l'un et l'autre", async ({ page }) => {
  for (const project of ["zhong-he-ji", "xiu-zhu-can-cha"]) {
    await page.goto(`/${project}`);
    await page.getByRole("link", { name: "虛心實腹" }).click();

    await expect(page).toHaveURL(`/${project}/xu-xin-shi-fu`);
    await expect(page.getByRole("heading", { name: "虛心實腹" })).toBeVisible();
  }
});

test("une pièce sans projet reste accessible depuis l'accueil", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "莫性急" }).click();

  await expect(page).toHaveURL("/pieces/mo-xing-ji");
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
