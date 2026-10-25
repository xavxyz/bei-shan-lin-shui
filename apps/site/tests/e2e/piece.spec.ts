import { expect, test } from "@playwright/test";
import { SCRIPTS } from "@bsls/schema";

const piecePath = "/pieces/mo-xing-ji";

test("la page de pièce affiche l'œuvre mise en avant en grand", async ({ page }) => {
  await page.goto(piecePath);

  const work = page.getByTestId("carousel-image").first();
  await expect(work).toBeVisible();
  await expect(work).toHaveAttribute("src", "/content-images/mo-xing-ji/v2a.jpg");

  const width = await work.evaluate((image) => image.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(300);
});

test("le pinyin est en regard du texte chinois", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByTestId("version-text").first()).toContainText("莫性急平流缓进");
  await expect(page.getByTestId("pinyin")).toContainText("mò xìng jí píng liú huǎn jìn");
});

test("la date chinoise de la version est affichée à la suite de sa date", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByTestId("version-date")).toHaveText("11 février 2026");
  await expect(page.getByTestId("version-chinese-date")).toHaveText("丙午立春");
});

test("le format est dit en français, avec sa notation brute en petit", async ({ page }) => {
  await page.goto("/zhong-he-ji/xu-xin-shi-fu");

  const format = page.getByTestId("version-format");
  await expect(format.getByTestId("format-label")).toHaveText("3 colonnes de 7 caractères");
  const notation = format.getByTestId("format-notation");
  await expect(notation).toHaveText("[(3x7)]");
  const size = (locator: typeof format) =>
    locator.evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
  expect(await size(notation)).toBeLessThan(await size(format.getByTestId("format-label")));
});

test("un format que la notation ne lit pas s'affiche tel quel", async ({ page }) => {
  await page.goto(piecePath);

  const format = page.getByTestId("version-format");
  await expect(format).toHaveText("2x7 + 蘇東坡");
  await expect(format.getByTestId("format-notation")).toHaveCount(0);
});

test("une pièce en expérimentation l'affiche en français", async ({ page }) => {
  await page.goto("/pieces/mo-si-wen-ke");

  await expect(page.getByTestId("piece-status")).toHaveText("expérimentation");
});

test("les styles d'écriture sont affichés en français, jamais en pinyin", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByTestId("script-label")).toHaveText("régulier");

  const visibleText = await page.locator("body").innerText();
  for (const script of SCRIPTS) {
    expect(visibleText, `le pinyin du style ${script} ne doit pas être affiché`).not.toContain(
      script,
    );
  }
});

test("une pièce non publiée n'a aucune page et n'apparaît dans aucune liste", async ({
  page,
  request,
}) => {
  const unpublished = "gui-she-xiang-jiao-shui-huo-ji-ji-zhen-yi-nai-ding-zhong-he";
  expect((await request.get(`/zhong-he-ji/${unpublished}`)).status()).toBe(404);
  expect((await request.get(`/pieces/${unpublished}`)).status()).toBe(404);
  expect((await request.get("/pieces/du-zhi-li-xing-zhuan-xin-jing-xing")).status()).toBe(404);

  await page.goto("/zhong-he-ji");
  await expect(page.getByText("龜蛇相交")).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText("龜蛇相交")).toHaveCount(0);
  await expect(page.getByText("篤志力行")).toHaveCount(0);
  await expect(page.getByText("non publiée")).toHaveCount(0);
  // Le décompte du projet ne compte que ses pièces publiées.
  await expect(
    page
      .getByTestId("project-row")
      .filter({ has: page.getByRole("heading", { name: "中和集", exact: true }) }),
  ).toContainText("1 pièce");
});
