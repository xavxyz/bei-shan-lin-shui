import { expect, test, type Page } from "@playwright/test";

/** Les faces de police que la page a chargées, par famille. */
async function loadedFamilies(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts]
      .filter((face) => face.status === "loaded")
      .map((face) => face.family.replace(/^"|"$/g, ""));
  });
}

test("le site ne charge rien d'ailleurs que de lui-même : ni Google Fonts, ni autre police", async ({
  page,
  baseURL,
}) => {
  const elsewhere: string[] = [];
  page.on("request", (request) => {
    if (!request.url().startsWith(baseURL!)) elsewhere.push(request.url());
  });

  for (const path of [
    "/",
    "/hong-lou-meng",
    "/hong-lou-meng/cheng-ren-bu-zi-zai-zi-zai-bu-cheng-ren",
  ]) {
    await page.goto(path);
    await loadedFamilies(page);
  }

  expect(elsewhere).toEqual([]);
});

test("le chinois s'écrit en TW-Kai, servie par le site", async ({ page }) => {
  const fonts: { url: string; status: number; type: string | undefined }[] = [];
  page.on("response", (response) => {
    if (response.request().resourceType() === "font") {
      fonts.push({
        url: new URL(response.url()).pathname,
        status: response.status(),
        type: response.headers()["content-type"],
      });
    }
  });

  await page.goto("/hong-lou-meng/cheng-ren-bu-zi-zai-zi-zai-bu-cheng-ren");

  expect(await loadedFamilies(page)).toContain("TW-Kai");
  expect(fonts).toEqual([{ url: "/fonts/tw-kai.woff2", status: 200, type: "font/woff2" }]);

  const title = page.getByRole("heading", { name: "成人不自在，自在不成人" });
  await expect(title).toHaveCSS("font-family", /^"?TW-Kai"?/);
  const simplified = page.locator('[lang="zh-Hans"]').first();
  await expect(simplified).toHaveCSS("font-family", /^"?TW-Kai"?/);
});
