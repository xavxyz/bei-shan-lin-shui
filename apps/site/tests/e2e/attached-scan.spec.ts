import { expect, test } from "@playwright/test";

/**
 * Un scan rattaché par `attachScan` apparaît sur la page de sa pièce. La
 * fixture de `莫性急` v2a est produite par le rattachement lui-même (cf.
 * `packages/scans/src/site-fixture.test.ts`).
 */
test("un scan rattaché apparaît sur la page de sa pièce", async ({ page }) => {
  await page.goto("/pieces/mo-xing-ji");

  const scan = page.locator('img[src="/content-images/mo-xing-ji/v2a.jpg"]').first();
  await expect(scan).toBeVisible();
  await expect
    .poll(() => scan.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth))
    .toBeGreaterThan(0);
});
