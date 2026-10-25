import { expect, test, type Page } from "@playwright/test";

// La navigation sans rechargement : l'en-tête reste, le contenu s'efface puis revient.

function banner(page: Page) {
  return page.getByRole("banner");
}

async function titleSize(page: Page): Promise<number> {
  return banner(page)
    .getByRole("heading", { name: "背山臨水" })
    .evaluate((element) => parseFloat(getComputedStyle(element).fontSize));
}

/**
 * Marque la fenêtre et l'en-tête : une page rechargée perd la marque de la
 * fenêtre, un en-tête remplacé perd la sienne.
 */
async function mark(page: Page) {
  await page.evaluate(() => {
    (window as Window & { sansRechargement?: true }).sansRechargement = true;
  });
  await banner(page).evaluate((header) => header.setAttribute("data-marque", ""));
}

async function stillMarked(page: Page) {
  expect(
    await page.evaluate(
      () => (window as Window & { sansRechargement?: true }).sansRechargement ?? false,
    ),
    "la page a été rechargée",
  ).toBe(true);
  await expect(banner(page), "l'en-tête a été remplacé").toHaveAttribute("data-marque", "");
}

test("l'en-tête reste en place d'une page à l'autre, grand sur l'accueil et réduit ailleurs", async ({
  page,
}) => {
  await page.goto("/");
  await mark(page);
  expect(await titleSize(page)).toBeGreaterThanOrEqual(48);

  await page.getByRole("link", { name: "莫性急" }).click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await expect(page.getByRole("heading", { name: "莫性急", level: 2 })).toBeVisible();
  await stillMarked(page);
  await expect.poll(() => titleSize(page)).toBeLessThan(32);

  await banner(page).getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await stillMarked(page);
  await expect.poll(() => titleSize(page)).toBeGreaterThanOrEqual(48);
});
