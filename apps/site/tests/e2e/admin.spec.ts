import { expect, test } from "@playwright/test";
import { expectInReadingOrder } from "./reading-order.js";

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
  await expect(
    page
      .getByTestId("project-row")
      .filter({ has: page.getByRole("heading", { name: "中和集", exact: true }) }),
  ).toContainText("3 pièces");

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

test("en mode admin, une pièce scannée non publiée paraît dans le mur, marquée non publiée", async ({
  page,
}) => {
  await page.goto("/");

  const wall = page.getByRole("region", { name: "Pièces · 11" });
  const card = wall.getByTestId("piece-link").filter({ hasText: "篤志力行" });
  await expect(card).toContainText("non publiée");
  await expect(wall.getByTestId("piece-link").filter({ hasText: "龜蛇相交" })).toContainText(
    "non publiée",
  );
  await expect(wall.getByText("non publiée")).toHaveCount(2);

  await card.click();
  await expect(page).toHaveURL("/pieces/du-zhi-li-xing-zhuan-xin-jing-xing");
  await expect(page.getByTestId("unpublished")).toHaveText("non publiée");
});

test("en mode admin, l'accueil range entre le mur et les projets les pièces sans scan", async ({
  page,
}) => {
  await page.goto("/");

  const unscanned = page.getByRole("region", { name: "Sans scan · 3" });
  await expect(unscanned.getByRole("row")).toHaveCount(3);
  const row = unscanned.getByRole("row").filter({ hasText: "說到辛酸處" });
  await expect(row).toContainText("idée");
  await expect(row).toContainText("20 octobre 2026");
  await expect(unscanned.getByRole("row").filter({ hasText: "易筋經" })).toContainText("en cours");
  await expect(
    page.getByRole("region", { name: "Pièces · 11" }).getByText("說到辛酸處"),
  ).toHaveCount(0);

  const sections = await page.getByRole("heading", { level: 2 }).allTextContents();
  expect(sections).toEqual(["Pièces · 11", "Sans scan · 3", "Projets"]);

  await row.getByRole("link", { name: "說到辛酸處" }).click();
  await expect(page).toHaveURL("/hong-lou-meng/shuo-dao-xin-suan-chu");
});

test("en mode admin, une rangée de projet ne compte que les pièces de son mur", async ({
  page,
}) => {
  await page.goto("/");
  const row = page
    .getByTestId("project-row")
    .filter({ has: page.getByRole("heading", { name: "紅樓夢", exact: true }) });
  await expect(row.getByText("1 pièce", { exact: true })).toBeVisible();

  await row.getByRole("link", { name: "紅樓夢" }).click();
  await expect(page.getByRole("heading", { name: "Pièces · 1" })).toBeVisible();
});

test("en mode admin, la page projet range ses pièces sans scan sous son mur", async ({ page }) => {
  await page.goto("/hong-lou-meng");

  const wall = page.getByRole("region", { name: "Pièces · 1" });
  await expect(wall.getByTestId("piece-link")).toHaveCount(1);
  const unscanned = page.getByRole("region", { name: "Sans scan · 1" });
  await expect(unscanned.getByRole("row").filter({ hasText: "說到辛酸處" })).toContainText("idée");

  const wallBox = (await wall.boundingBox())!;
  const unscannedBox = (await unscanned.boundingBox())!;
  expect(unscannedBox.y).toBeGreaterThanOrEqual(wallBox.y + wallBox.height);
  // Dans la colonne du mur, à droite de l'introduction.
  expect(unscannedBox.x).toBeCloseTo(wallBox.x, 0);
  const title = (await page.getByRole("heading", { level: 2, name: "紅樓夢" }).boundingBox())!;
  expect(unscannedBox.x).toBeGreaterThan(title.x + title.width);
});

// 易筋經 est la seule pièce des fixtures à trois versions ; sans image, seul le
// mode admin la montre.
test("les versions antérieures vont de la plus ancienne à la plus récente", async ({ page }) => {
  await page.goto("/yi-jin-jing/yi-jin-jing");

  const earlier = page.getByTestId("earlier-version");
  await expect(earlier.getByTestId("earlier-version-date").locator("time")).toHaveText([
    "23 mars 2026",
    "20 octobre 2026",
  ]);
  await expect(
    earlier.getByTestId("earlier-version-format").getByTestId("format-notation"),
  ).toHaveText(["[(1x3), (2x5)]", "[(3x5)]"]);
  await expect(
    earlier.getByTestId("earlier-version-format").getByTestId("format-label"),
  ).toHaveText([
    "2 feuilles : 1 colonne de 3 caractères ; 2 colonnes de 5 caractères",
    "3 colonnes de 5 caractères",
  ]);
});

// 《龍虎歌》勉旃勉旃 : sans image, la seule pièce des fixtures qui porte le texte
// intégral de sa source.
const withFullText = "/zhong-he-ji/long-hu-ge-mian-zhan-mian-zhan";

test.describe("une pièce sans image", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("centre son texte sur la page", async ({ page }) => {
    await page.goto(withFullText);

    await expect(page.getByTestId("carousel-image")).toHaveCount(0);
    const main = (await page.locator("main").boundingBox())!;
    const title = (await page.getByRole("heading", { name: "《龍虎歌》勉旃勉旃" }).boundingBox())!;
    const left = title.x - main.x;
    const right = main.x + main.width - (title.x + title.width);
    expect(left).toBeGreaterThan(main.width / 8);
    expect(Math.abs(left - right)).toBeLessThan(2);
  });

  test("finit sur l'intention puis le texte intégral de la source, en traditionnel", async ({
    page,
  }) => {
    await page.goto(withFullText);

    await expectInReadingOrder({
      "fil d'Ariane": page.getByRole("navigation", { name: "Fil d'Ariane" }),
      titre: page.getByRole("heading", { name: "《龍虎歌》勉旃勉旃" }),
      texte: page.getByTestId("version-text"),
      faits: page.getByRole("term").first(),
      intention: page.getByText("Une seconde version en 13x7", { exact: false }),
      "texte intégral": page.getByText("紫陽云：收拾身心，謂之降伏龍虎。"),
    });
    await expect(page.getByText("紫陽云：收拾身心，謂之降伏龍虎。")).toHaveAttribute(
      "lang",
      "zh-Hant",
    );
  });
});
