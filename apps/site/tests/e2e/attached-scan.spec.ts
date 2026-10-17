import { expect, test } from "@playwright/test";

/**
 * Un scan rattaché par `attachScan` apparaît sur la page de sa pièce. La
 * fixture de `行行重行行` v3a est produite par le rattachement lui-même (cf.
 * `packages/scans/src/site-fixture.test.ts`).
 */
test("un scan rattaché apparaît sur la page de sa pièce", async ({ page }) => {
  await page.goto("/pieces/xing-xing-zhong-xing-xing");

  const scan = page.locator('img[src="/content-images/xing-xing-zhong-xing-xing/v3a.jpg"]').first();
  await expect(scan).toBeVisible();
  await expect
    .poll(() => scan.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth))
    .toBeGreaterThan(0);
});
