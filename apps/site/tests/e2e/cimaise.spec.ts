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

test("toutes les pages sont sur le même papier teinté", async ({ page }) => {
  for (const path of ["/", "/ge-zhi-yan-jiu", "/hong-lou-meng", "/ge-zhi-yan-jiu/yong-cao-shu"]) {
    await page.goto(path);
    const paper = await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).backgroundColor);
    expect(paper, path).toBe("rgb(247, 244, 238)");
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
  await expect(wall(page, 8).getByTestId("piece-link").getByRole("heading")).toHaveText(
    [
      "墨寺㞢文刻", // 2026-08-30
      "成人不自在，自在不成人", // 2026-06-21
      "永草書", // 2026-06-21
      "過猶不及，方向堅定不移，方法因地制宜", // 2026-03-10
      "題破山寺後禪院", // 2026-02-25
      "虛心實腹", // 2026-02-25
      "新年快樂，馬到成功", // 2026-02-17
      "莫性急", // 2026-02-11
    ],
    { useInnerText: true },
  );
});

function projectRow(page: Page, title: string) {
  return page
    .getByRole("region", { name: "Projets" })
    .getByTestId("project-row")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

test("une rangée de projet montre sa tête, sa présentation, puis son œuvre de couverture", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const row = projectRow(page, "紅樓夢");
  const head = row.getByRole("heading", { name: "紅樓夢" });
  await expect(head).toHaveAttribute("lang", "zh-Hant");
  const count = row.getByText("1 pièce", { exact: true });
  await expect(count).toBeVisible();
  const presentation = row.getByText(/Le 紅樓夢 par ses vers et ses inscriptions/);
  await expect(presentation).toBeVisible();
  const cover = row.getByRole("img", { name: "成人不自在，自在不成人" });
  await expect(cover).toBeVisible();

  const [headBox, countBox, presentationBox, coverBox] = await Promise.all(
    [head, count, presentation, cover].map(async (element) => (await element.boundingBox())!),
  );
  expect(countBox.y).toBeGreaterThanOrEqual(headBox.y + headBox.height - 1);
  expect(presentationBox.x).toBeGreaterThanOrEqual(
    Math.max(headBox.x + headBox.width, countBox.x + countBox.width),
  );
  expect(coverBox.x).toBeGreaterThanOrEqual(presentationBox.x + presentationBox.width);

  await head.getByRole("link").click();
  await expect(page).toHaveURL("/hong-lou-meng");
});

test("une rangée de projet montre sa glose sous son titre, et rien à la place d'une présentation absente", async ({
  page,
}) => {
  await page.goto("/");

  const row = projectRow(page, "戈之研究");
  await expect(row.getByTestId("gloss")).toHaveText("Explorations personnelles");
  await expect(row.getByText("1 pièce", { exact: true })).toBeVisible();
  await expect(row.getByRole("img", { name: "永草書" })).toBeVisible();
  await expect(row.getByRole("paragraph")).toHaveText(["Explorations personnelles", "1 pièce"]);
});

test("l'œuvre de couverture d'un projet garde ses proportions ; un projet sans pièce visible n'en a pas", async ({
  page,
}) => {
  await page.goto("/");

  const cover = projectRow(page, "中和集").getByRole("img", { name: "虛心實腹" });
  await cover.scrollIntoViewIfNeeded();
  await expect(cover).toHaveJSProperty("complete", true);
  const ratios = await cover.evaluate((image: HTMLImageElement) => {
    const box = image.getBoundingClientRect();
    return { natural: image.naturalWidth / image.naturalHeight, rendered: box.width / box.height };
  });
  expect(ratios.rendered).toBeCloseTo(ratios.natural, 2);

  const empty = projectRow(page, "易筋經");
  await expect(empty.getByText("0 pièce", { exact: true })).toBeVisible();
  await expect(empty.getByRole("img")).toHaveCount(0);
});

/** Chaque œuvre du mur a la hauteur donnée, et la largeur que lui dictent ses proportions. */
async function expectHungUncropped(page: Page, height: number) {
  const works = wall(page, 8).getByTestId("piece-link").locator("img");
  await expect(works).toHaveCount(8);
  for (const work of await works.all()) {
    await work.scrollIntoViewIfNeeded();
    await expect(work).toHaveJSProperty("complete", true);
    const { naturalWidth, naturalHeight, renderedWidth, renderedHeight } = await work.evaluate(
      (image: HTMLImageElement) => {
        const box = image.getBoundingClientRect();
        return {
          naturalWidth: image.naturalWidth,
          naturalHeight: image.naturalHeight,
          renderedWidth: box.width,
          renderedHeight: box.height,
        };
      },
    );
    expect(renderedHeight).toBeCloseTo(height, 0);
    expect(renderedWidth).toBeCloseTo((naturalWidth / naturalHeight) * height, 0);
  }
}

test("les œuvres du mur ont une hauteur fixe et gardent leurs proportions", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expectHungUncropped(page, 18 * 16);

  await page.setViewportSize({ width: 900, height: 900 });
  await expectHungUncropped(page, 13 * 16);
});

test("les œuvres du mur sont accrochées sur leur pied", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const works = await wall(page, 8).getByTestId("piece-link").locator("img").all();
  const first = (await works[0]!.boundingBox())!;
  const second = (await works[1]!.boundingBox())!;
  expect(second.y).toBeCloseTo(first.y, 0);
  expect(second.x).toBeGreaterThan(first.x + first.width);
});

test("sous chaque œuvre du mur, son titre chinois puis sa glose, à la largeur de l'œuvre", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");

  const card = wall(page, 8).getByTestId("piece-link").filter({ hasText: "永草書" });
  // Sans dimensions dans le balisage, l'œuvre n'a de largeur qu'une fois chargée.
  await expect(card.locator("img")).toHaveJSProperty("complete", true);
  const work = (await card.locator("img").boundingBox())!;
  const title = (await card.getByRole("heading", { name: "永草書" }).boundingBox())!;
  const gloss = (await card.getByTestId("gloss").boundingBox())!;

  expect(title.y).toBeGreaterThanOrEqual(work.y + work.height - 1);
  expect(gloss.y).toBeGreaterThanOrEqual(title.y + title.height - 1);
  expect(gloss.width).toBeLessThanOrEqual(work.width + 1);
  expect((await card.boundingBox())!.width).toBeLessThanOrEqual(work.width + 1);
});
