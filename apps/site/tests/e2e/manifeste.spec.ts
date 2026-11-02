import { expect, test, type Page } from "@playwright/test";
import { box, expectInReadingOrder } from "./reading-order.js";

// Le manifeste de 山山, en tête de l'accueil, avant les pièces et les projets.

function manifesto(page: Page) {
  return page.getByRole("region", { name: /自由书法/ });
}

test("l'accueil s'ouvre sur le titre du manifeste et son premier paragraphe, en regard de sa traduction, avant les pièces", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const title = manifesto(page).getByRole("heading", { name: /自由书法/ });
  await expect(title.getByText("自由书法")).toHaveAttribute("lang", "zh-Hans");
  await expect(title.getByText("La calligraphie libre", { exact: true })).toBeVisible();
  const first = manifesto(page).getByText("书法是写作的艺术。");
  const translation = manifesto(page).getByText("La calligraphie est l'art d'écrire.");
  await expect(first).toBeVisible();
  await expect(translation).toBeVisible();

  const [firstBox, translationBox] = await Promise.all([box(first), box(translation)]);
  expect(translationBox.left).toBeGreaterThanOrEqual(firstBox.right);

  await expectInReadingOrder({
    "le titre du manifeste": title,
    "son premier paragraphe": first,
    "la section « Pièces »": page.getByRole("heading", { name: /^Pièces · / }),
  });
});

test("la suite du manifeste reste cachée jusqu'à ce que le visiteur l'ouvre", async ({ page }) => {
  await page.goto("/");

  const third = manifesto(page).getByText("古典书法只有一个形象。");
  const fourth = manifesto(page).getByText("自由的书法是针尖上的舞蹈。");
  await expect(third).toBeVisible();
  await expect(fourth).toBeHidden();

  await manifesto(page).getByText("La suite du manifeste").click();

  await expect(fourth).toBeVisible();
  await expect(
    manifesto(page).getByText("La calligraphie libre est une danse sur la pointe d'une aiguille."),
  ).toBeVisible();
});

test("le manifeste finit sur sa signature, et dit qui l'a traduit", async ({ page }) => {
  await page.goto("/");

  await expect(manifesto(page).getByText("孙山山 · 于巴黎 · 2004 年 7 月")).toBeVisible();
  await expect(manifesto(page).getByText("Traduction de 山山")).toBeVisible();
});

test("l'épigraphe, en traditionnel, se tient en colonne verticale à côté du texte", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const epigraph = manifesto(page).getByText("針尖上的舞蹈");
  await expect(epigraph).toBeVisible();
  await expect(epigraph).toHaveAttribute("lang", "zh-Hant");

  const epigraphBox = await box(epigraph);
  const textBox = await box(manifesto(page).getByText("书法是写作的艺术。"));
  expect(epigraphBox.height).toBeGreaterThan(epigraphBox.width * 3);
  expect(epigraphBox.left).toBeGreaterThan(textBox.right);
});

test("un lecteur d'écran entre dans le manifeste par son titre, sans l'épigraphe qui redit le texte", async ({
  page,
}) => {
  await page.goto("/");

  const heard = await manifesto(page).ariaSnapshot();
  expect(heard).not.toContain("針尖上的舞蹈");
  // La région s'annonce, puis son premier contenu : le titre.
  expect(heard).toMatch(/^- region .*\n\s+- heading .*自由书法/);
});

test("sur téléphone, l'épigraphe passe en ligne au-dessus du texte, et la traduction suit son paragraphe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const epigraph = manifesto(page).getByText("針尖上的舞蹈");
  const first = manifesto(page).getByText("书法是写作的艺术。");
  const translation = manifesto(page).getByText("La calligraphie est l'art d'écrire.");

  const epigraphBox = await box(epigraph);
  expect(epigraphBox.width).toBeGreaterThan(epigraphBox.height);
  await expectInReadingOrder({
    "l'épigraphe": epigraph,
    "le titre du manifeste": manifesto(page).getByRole("heading", { name: /自由书法/ }),
    "le premier paragraphe": first,
    "sa traduction": translation,
  });
});
