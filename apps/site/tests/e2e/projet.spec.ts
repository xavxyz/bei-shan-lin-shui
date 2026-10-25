import { expect, test, type Locator, type Page } from "@playwright/test";

// La page projet : l'introduction (titre, glose, présentation) garde le propos sous
// les yeux, à côté des œuvres.

function introduction(page: Page, title: string) {
  return page.getByRole("heading", { level: 2, name: title, exact: true });
}

function works(page: Page) {
  return page.getByRole("region", { name: /^Pièces · \d+$/ });
}

async function box(locator: Locator) {
  return (await locator.boundingBox())!;
}

test("la page projet montre son titre, sa glose et sa présentation à gauche de ses œuvres", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/ge-zhi-yan-jiu");
  const gloss = page.getByTestId("gloss").filter({ hasText: "Explorations personnelles" });
  await expect(introduction(page, "戈之研究")).toHaveAttribute("lang", "zh-Hant");
  const yongWork = works(page).getByTestId("piece-link").filter({ hasText: "永草書" });
  await expect(yongWork).toBeVisible();
  for (const element of [introduction(page, "戈之研究"), gloss]) {
    const right = await box(element);
    expect(right.x + right.width).toBeLessThan((await box(yongWork)).x);
  }

  await page.goto("/hong-lou-meng");
  const title = introduction(page, "紅樓夢");
  const presentation = page.getByText(/Le 紅樓夢 par ses vers et ses inscriptions/);
  await expect(presentation).toBeVisible();
  const [titleBox, presentationBox, worksBox] = await Promise.all(
    [title, presentation, works(page)].map(box),
  );
  expect(presentationBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
  expect(presentationBox.x + presentationBox.width).toBeLessThan(worksBox.x);
  // Côte à côte : les œuvres commencent à la hauteur de l'introduction.
  expect(worksBox.y).toBeLessThan(presentationBox.y + presentationBox.height);
});

test("l'introduction reste à l'écran quand on fait défiler les œuvres", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto("/hong-lou-meng");

  // Aucun projet des fixtures n'a assez d'œuvres pour défiler : on allonge le mur.
  await works(page).evaluate((section) => {
    section.style.minHeight = "300vh";
  });
  const title = introduction(page, "紅樓夢");
  await page.mouse.wheel(0, 1200);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(1000);

  await expect(title).toBeInViewport();
  await expect(page.getByText(/Le 紅樓夢 par ses vers et ses inscriptions/)).toBeInViewport();
});

test("sous 64 rem, la page projet s'empile : l'introduction, puis les œuvres", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await page.goto("/hong-lou-meng");

  const presentation = page.getByText(/Le 紅樓夢 par ses vers et ses inscriptions/);
  const [titleBox, presentationBox, worksBox] = await Promise.all(
    [introduction(page, "紅樓夢"), presentation, works(page)].map(box),
  );
  expect(worksBox.y).toBeGreaterThanOrEqual(presentationBox.y + presentationBox.height);
  expect(worksBox.x).toBeCloseTo(titleBox.x, 0);
});
