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

test("la traduction française et le pinyin sont en regard du texte chinois", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByTestId("chinese-text")).toContainText("莫性急平流緩進");
  await expect(page.getByTestId("translation")).toContainText(
    "La patience et la constance dans la progression.",
  );
  await expect(page.getByTestId("pinyin")).toContainText("mò xìng jí píng liú huǎn jìn");
  await expect(page.getByTestId("simplified")).toContainText("莫性急平流缓进");
});

test("la date chinoise de la version est affichée à côté de sa date", async ({ page }) => {
  await page.goto(piecePath);

  const date = page.getByTestId("version-date");
  await expect(date).toContainText("11 février 2026");
  await expect(date).toContainText("丙午立春");
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

test("le texte chinois est vertical sur écran large et horizontal sous 768 px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(piecePath);
  await expect(page.getByTestId("chinese-text")).toHaveCSS("writing-mode", "vertical-rl");

  await page.setViewportSize({ width: 375, height: 800 });
  await expect(page.getByTestId("chinese-text")).toHaveCSS("writing-mode", "horizontal-tb");
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
  await expect(page.getByRole("link", { name: /中和集/ })).toContainText("1 pièce");
});
