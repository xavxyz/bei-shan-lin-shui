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

test("en mode admin, une pièce scannée non publiée paraît dans le mur, marquée non publiée", async ({
  page,
}) => {
  await page.goto("/");

  const wall = page.getByRole("region", { name: "Pièces · 10" });
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

  const unscanned = page.getByRole("region", { name: "Sans scan · 2" });
  await expect(unscanned.getByRole("row")).toHaveCount(2);
  const row = unscanned.getByRole("row").filter({ hasText: "說到辛酸處" });
  await expect(row).toContainText("idée");
  await expect(row).toContainText("20 octobre 2026");
  await expect(unscanned.getByRole("row").filter({ hasText: "易筋經" })).toContainText("en cours");
  await expect(
    page.getByRole("region", { name: "Pièces · 10" }).getByText("說到辛酸處"),
  ).toHaveCount(0);

  const sections = await page.getByRole("heading", { level: 2 }).allTextContents();
  expect(sections).toEqual(["Pièces · 10", "Sans scan · 2", "Projets"]);

  await row.getByRole("link", { name: "說到辛酸處" }).click();
  await expect(page).toHaveURL("/hong-lou-meng/shuo-dao-xin-suan-chu");
});

test("en mode admin, la page projet range ses pièces sans scan sous ses œuvres", async ({
  page,
}) => {
  await page.goto("/hong-lou-meng");

  const works = page.getByRole("region", { name: "Pièces · 1" });
  await expect(works.getByTestId("piece-link")).toHaveCount(1);
  const unscanned = page.getByRole("region", { name: "Sans scan · 1" });
  await expect(unscanned.getByRole("row").filter({ hasText: "說到辛酸處" })).toContainText("idée");

  const worksBox = (await works.boundingBox())!;
  const unscannedBox = (await unscanned.boundingBox())!;
  expect(unscannedBox.y).toBeGreaterThanOrEqual(worksBox.y + worksBox.height);
});

// 易筋經 est la seule pièce des fixtures à trois versions ; sans image, seul le
// mode admin la montre.
test("les versions antérieures vont de la plus ancienne à la plus récente", async ({ page }) => {
  await page.goto("/yi-jin-jing/yi-jin-jing");
  await page.getByText("voir l'évolution", { exact: true }).click();

  const earlier = page.getByTestId("earlier-version");
  await expect(earlier.getByTestId("earlier-version-date").locator("time")).toHaveText([
    "23 mars 2026",
    "20 octobre 2026",
  ]);
  await expect(earlier.getByTestId("earlier-version-format")).toHaveText([
    "[(1x3), (2x5)]",
    "[(3x5)]",
  ]);
});
