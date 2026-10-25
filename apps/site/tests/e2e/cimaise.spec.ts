import { expect, test, type Locator, type Page } from "@playwright/test";

// La Cimaise : l'accueil sur papier teinté, son en-tête, son mur et ses rangées de projets.

const motto = "Soutenu par le maître, je suis les vagues";

async function fontSize(locator: Locator): Promise<number> {
  return locator.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
}

function siteHeader(page: Page) {
  const banner = page.getByRole("banner");
  return {
    banner,
    title: banner.getByRole("heading", { name: "背山臨水" }),
    motto: banner.getByText(motto),
  };
}

test("l'accueil montre 背山臨水 et sa devise en grand, centrés, sur une grande hauteur", async ({
  page,
}) => {
  await page.goto("/");
  const { banner, title, motto } = siteHeader(page);

  expect(await fontSize(title)).toBeGreaterThanOrEqual(48);
  await expect(motto).toBeVisible();

  const viewport = page.viewportSize()!;
  const bannerBox = (await banner.boundingBox())!;
  expect(bannerBox.height).toBeGreaterThanOrEqual(viewport.height * 0.4);

  for (const element of [title, motto]) {
    const box = (await element.boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - viewport.width / 2)).toBeLessThan(4);
  }
  const titleBox = (await title.boundingBox())!;
  const mottoBox = (await motto.boundingBox())!;
  expect(mottoBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
});

test("ailleurs, l'en-tête tient sur une ligne : le titre, puis la devise en italique", async ({
  page,
}) => {
  for (const path of ["/hong-lou-meng", "/pieces/mo-xing-ji"]) {
    await page.goto(path);
    const { banner, title, motto } = siteHeader(page);

    expect(await fontSize(title)).toBeLessThan(32);
    expect((await banner.boundingBox())!.height).toBeLessThan(120);

    const titleBox = (await title.boundingBox())!;
    const mottoBox = (await motto.boundingBox())!;
    expect(mottoBox.x).toBeGreaterThanOrEqual(titleBox.x + titleBox.width);
    expect(mottoBox.y).toBeLessThan(titleBox.y + titleBox.height);
    expect(await motto.evaluate((element) => getComputedStyle(element).fontStyle)).toBe("italic");

    await title.getByRole("link").click();
    await expect(page).toHaveURL("/");
  }
});

function wall(page: Page, count: number) {
  return page.getByRole("region", { name: `Pièces · ${count}` });
}

test("le mur montre toutes les pièces visibles, de la plus récente à la plus ancienne", async ({
  page,
}) => {
  await page.goto("/");

  // À date égale, l'ordre des slugs départage.
  await expect(wall(page, 8).getByTestId("piece-link").getByRole("heading")).toHaveText([
    "墨寺㞢文刻", // 2026-08-30
    "成人不自在，自在不成人", // 2026-06-21
    "永草書", // 2026-06-21
    "過猶不及，方向堅定不移，方法因地制宜", // 2026-03-10
    "題破山寺後禪院", // 2026-02-25
    "虛心實腹", // 2026-02-25
    "新年快樂，馬到成功", // 2026-02-17
    "莫性急", // 2026-02-11
  ]);
});
