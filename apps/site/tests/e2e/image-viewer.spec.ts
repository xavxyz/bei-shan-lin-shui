import { expect, test } from "@playwright/test";

/**
 * Playwright vérifie que l'îlot est monté et fonctionne dans une page réelle.
 * Ses états d'affichage relèvent de react-cosmos, pas d'ici.
 */
test("la visionneuse d'images change de prise de vue au clic", async ({ page }) => {
  await page.goto("/montagnes/shan-ju-qiu-ming");

  const shown = page.getByTestId("featured-work").locator(".viewer__image");
  await expect(shown).toHaveAttribute("src", "/content-images/shan-ju-qiu-ming/v2a-01.jpg");

  await page.getByRole("button", { name: "山居秋暝 — détail" }).click();

  await expect(shown).toHaveAttribute("src", "/content-images/shan-ju-qiu-ming/v2a-02.jpg");
});

test("une pièce à une seule image n'affiche pas de vignettes", async ({ page }) => {
  await page.goto("/montagnes/deng-guan-que-lou");

  await expect(page.getByTestId("featured-work").locator(".viewer__image")).toBeVisible();
  await expect(page.locator(".viewer__thumbnail")).toHaveCount(0);
});
