import { expect, test } from "@playwright/test";
import { SCRIPTS } from "@bsls/schema";

const piecePath = "/montagnes/shan-ju-qiu-ming";

test("la page de pièce affiche l'œuvre mise en avant en grand", async ({ page }) => {
  await page.goto(piecePath);

  const work = page.getByTestId("featured-work").locator("img").first();
  await expect(work).toBeVisible();
  await expect(work).toHaveAttribute("src", "/content-images/shan-ju-qiu-ming/v2a-01.jpg");

  const width = await work.evaluate((image) => image.getBoundingClientRect().width);
  expect(width).toBeGreaterThan(300);
});

test("la traduction française et le pinyin sont en regard du texte chinois", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByTestId("chinese-text")).toContainText("明月松間照");
  await expect(page.getByTestId("translation")).toContainText(
    "La lune claire brille entre les pins",
  );
  await expect(page.getByTestId("pinyin")).toContainText("míng yuè sōng jiān zhào");
  await expect(page.getByTestId("simplified")).toContainText("明月松间照");
});

test("une surcharge manuelle de pinyin prime sur la valeur générée", async ({ page }) => {
  await page.goto("/pieces/xing-xing-zhong-xing-xing");

  await expect(page.getByTestId("pinyin")).toContainText("háng háng chóng háng háng");
});

test("les styles d'écriture sont affichés en français, jamais en pinyin", async ({ page }) => {
  await page.goto(piecePath);

  await expect(page.getByTestId("script-label")).toHaveText("cursif");

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
  expect((await request.get("/four-seasons/jing-ye-si")).status()).toBe(404);
  expect((await request.get("/pieces/jing-ye-si")).status()).toBe(404);

  await page.goto("/four-seasons");
  await expect(page.getByText("靜夜思")).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByText("靜夜思")).toHaveCount(0);
});
