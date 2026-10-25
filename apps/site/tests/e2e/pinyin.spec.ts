import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Le pinyin en popover : il se lit sans encombrer la page. On le cherche comme
 * le visiteur : en survolant, en touchant ou en atteignant au clavier un titre
 * ou une ligne du texte, puis en le refermant.
 */

/** 成人不自在 : une version traduite, donc un tableau. */
const translated = "/hong-lou-meng/cheng-ren-bu-zi-zai-zi-zai-bu-cheng-ren";

function pinyin(page: Page) {
  return page.getByRole("tooltip");
}

/** Le texte d'un titre : c'est lui que le visiteur survole, pas toute la largeur du titre. */
function title(page: Page, text: string) {
  return page.getByRole("heading", { name: text, exact: true }).getByText(text);
}

/** Avance au clavier, de Tab en Tab, jusqu'à ce que `target` ait le focus. */
async function tabTo(page: Page, target: Locator) {
  for (let presses = 0; presses < 40; presses += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error("le clavier n'atteint pas l'élément");
}

function line(page: Page, text: string) {
  return page.getByTestId("version-text").first().getByText(text);
}

test("survoler une ligne du tableau montre son pinyin", async ({ page }) => {
  await page.goto(translated);
  await expect(pinyin(page)).toHaveCount(0);

  await line(page, "成人不自在").hover();

  await expect(pinyin(page)).toBeVisible();
  await expect(pinyin(page)).toHaveText("chéng rén bú zì zài");
  await expect(pinyin(page)).toHaveAttribute("lang", "zh-Latn-pinyin");
});

test("survoler un titre, au mur, aux projets, sur la page projet ou pièce, montre son pinyin", async ({
  page,
}) => {
  await page.goto("/");
  await title(page, "永草書").hover();
  await expect(pinyin(page)).toHaveText("yǒng cǎo shū");

  await title(page, "紅樓夢").hover();
  await expect(pinyin(page)).toHaveText("hóng lóu mèng");

  await page.goto("/zhong-he-ji");
  await title(page, "中和集").hover();
  await expect(pinyin(page)).toHaveText("zhōng hé jí");

  await page.goto("/pieces/mo-xing-ji");
  await title(page, "莫性急").hover();
  await expect(pinyin(page)).toHaveText("mò xìng jí");
});

test("au clavier, une ligne et un titre prennent le focus et montrent leur pinyin ; Échap le referme", async ({
  page,
}) => {
  await page.goto(translated);

  await tabTo(page, line(page, "成人不自在"));
  await expect(pinyin(page)).toHaveText("chéng rén bú zì zài");

  await page.keyboard.press("Escape");
  await expect(pinyin(page)).toHaveCount(0);

  await page.keyboard.press("Tab");
  await expect(pinyin(page)).toHaveText("zì zài bù chéng rén");

  // Au mur, le titre est dans le lien de la pièce : c'est le lien qui prend le focus.
  await page.goto("/");
  await tabTo(page, page.getByTestId("piece-link").filter({ hasText: "永草書" }));
  await expect(pinyin(page)).toHaveText("yǒng cǎo shū");
});

test("popover fermé, une ligne et un titre se décrivent par leur pinyin au lecteur d'écran", async ({
  page,
}) => {
  await page.goto(translated);
  await expect(pinyin(page)).toHaveCount(0);

  await expect(line(page, "成人不自在")).toHaveAccessibleDescription("chéng rén bú zì zài");
  await expect(title(page, "成人不自在，自在不成人")).toHaveAccessibleDescription(
    /chéng rén bú zì zài/,
  );

  // Au mur, c'est le lien de l'œuvre qui prend le focus : il porte le pinyin de son titre.
  await page.goto("/");
  await expect(title(page, "永草書")).toHaveAccessibleDescription("yǒng cǎo shū");
  await expect(
    page.getByTestId("piece-link").filter({ hasText: "永草書" }),
  ).toHaveAccessibleDescription("yǒng cǎo shū");
  await expect(pinyin(page)).toHaveCount(0);
});

test("le pinyin ne s'écrit à l'écran que dans le popover ouvert", async ({ page }) => {
  const onScreen = page.getByText("chéng rén bú zì zài", { exact: true }).filter({ visible: true });
  await page.goto(translated);
  await expect(onScreen).toHaveCount(0);

  await line(page, "成人不自在").hover();
  await expect(onScreen).toHaveCount(1);
  await expect(onScreen).toHaveRole("tooltip");
});

test("le popover se referme quand le pointeur quitte le texte", async ({ page }) => {
  await page.goto(translated);

  await line(page, "成人不自在").hover();
  await expect(pinyin(page)).toBeVisible();

  await page.getByRole("columnheader", { name: "Français" }).hover();
  await expect(pinyin(page)).toHaveCount(0);
});

test("après une navigation sans rechargement, les popovers s'ouvrent encore", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    (window as Window & { sansRechargement?: true }).sansRechargement = true;
  });

  await page.getByRole("link", { name: "莫性急" }).click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await line(page, "莫性急平流缓进").hover();
  await expect(pinyin(page)).toHaveText("mò xìng jí píng liú huǎn jìn");
  await page.keyboard.press("Escape");
  await expect(pinyin(page)).toHaveCount(0);

  await page.getByRole("banner").getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await title(page, "永草書").hover();
  await expect(pinyin(page)).toHaveText("yǒng cǎo shū");

  expect(
    await page.evaluate(
      () => (window as Window & { sansRechargement?: true }).sansRechargement ?? false,
    ),
    "la page a été rechargée",
  ).toBe(true);
});

test.describe("sur un téléphone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("toucher une ligne montre son pinyin, entier à l'écran ; toucher ailleurs le referme", async ({
    page,
  }) => {
    await page.goto(translated);

    await line(page, "自在不成人").tap();
    await expect(pinyin(page)).toHaveText("zì zài bù chéng rén");
    const shown = await pinyin(page).boundingBox();
    expect(shown).not.toBeNull();
    expect(shown!.x).toBeGreaterThanOrEqual(0);
    expect(shown!.x + shown!.width).toBeLessThanOrEqual(390);

    await page.getByRole("columnheader", { name: "Français" }).tap();
    await expect(pinyin(page)).toHaveCount(0);
  });

  test("Échap referme le popover ouvert au toucher", async ({ page }) => {
    await page.goto(translated);

    await title(page, "成人不自在，自在不成人").tap();
    await expect(pinyin(page)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(pinyin(page)).toHaveCount(0);
  });

  test("au mur, toucher le titre d'une pièce mène à la pièce, sans ouvrir son pinyin", async ({
    page,
  }) => {
    await page.goto("/");

    await page
      .getByTestId("piece-link")
      .filter({ hasText: "永草書" })
      .getByRole("heading")
      .getByText("永草書")
      .tap();

    await expect(page).toHaveURL(/\/yong-cao-shu$/);
    await expect(pinyin(page)).toHaveCount(0);
  });

  test("dans les rangées, toucher le titre d'un projet mène au projet", async ({ page }) => {
    await page.goto("/");

    await page.getByTestId("project-row").getByRole("link", { name: "紅樓夢" }).tap();

    await expect(page).toHaveURL(/\/hong-lou-meng$/);
  });
});
