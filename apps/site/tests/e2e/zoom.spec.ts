import { expect, test, type CDPSession, type Locator, type Page } from "@playwright/test";
import { carousel, mounted, shown } from "./carousel.js";

/**
 * L'œuvre se regarde de près : loupe à la souris, pincement au doigt (#103).
 *
 * 墨寺㞢文刻 : une version, dix images.
 */
const piecePath = "/pieces/mo-si-wen-ke";

function position(page: Page) {
  return carousel(page).getByTestId("carousel-position");
}

function loupeOf(page: Page) {
  return carousel(page).getByTestId("loupe");
}

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("l'élément n'a pas de surface");
  return found;
}

test.describe("à la souris", () => {
  test("une loupe suit le pointeur au survol de l'œuvre, et s'en va avec lui", async ({ page }) => {
    await page.goto(piecePath);
    await mounted(page);
    const image = await box(shown(page));
    const loupe = loupeOf(page);

    await expect(loupe).toHaveCount(0);

    const x = image.x + image.width * 0.3;
    const y = image.y + image.height * 0.4;
    await page.mouse.move(x, y);
    await expect(loupe).toBeVisible();
    const lens = await box(loupe);
    expect(lens.x + lens.width / 2).toBeCloseTo(x, 0);
    expect(lens.y + lens.height / 2).toBeCloseTo(y, 0);

    await page.mouse.move(image.x + image.width * 0.7, y);
    expect((await box(loupe)).x).toBeGreaterThan(lens.x);

    // Juste à côté de l'image, encore au-dessus de la scène du carrousel.
    await page.mouse.move(image.x + image.width + 4, y);
    await expect(loupe).toHaveCount(0);
  });

  test("la loupe grossit trois fois ce qui est dessous", async ({ page }) => {
    await page.goto(piecePath);
    await mounted(page);
    const image = await box(shown(page));

    await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2);

    const [width, height] = await loupeOf(page).evaluate((loupe) =>
      getComputedStyle(loupe).backgroundSize.split(" ").map(parseFloat),
    );
    expect(width).toBeCloseTo(image.width * 3, 0);
    expect(height).toBeCloseTo(image.height * 3, 0);
  });

  test("la molette au-dessus de l'œuvre fait toujours défiler la page", async ({ page }) => {
    await page.goto(piecePath);
    await mounted(page);
    const image = await box(shown(page));

    await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2);
    await page.mouse.wheel(0, 400);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});

test.describe("au doigt", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  type Finger = { x: number; y: number };

  /** Les doigts posés, déplacés puis levés, par le protocole du navigateur. */
  async function touch(
    cdp: CDPSession,
    type: "touchStart" | "touchMove" | "touchEnd",
    fingers: Finger[],
  ) {
    await cdp.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: fingers.map((finger, id) => ({ ...finger, id })),
    });
  }

  async function pinch(cdp: CDPSession, center: Finger, from: number, to: number) {
    const spread = (half: number) => [
      { x: center.x - half, y: center.y },
      { x: center.x + half, y: center.y },
    ];
    await touch(cdp, "touchStart", spread(from));
    for (let step = 1; step <= 8; step++)
      await touch(cdp, "touchMove", spread(from + ((to - from) * step) / 8));
    await touch(cdp, "touchEnd", []);
  }

  async function drag(cdp: CDPSession, from: Finger, to: Finger) {
    await touch(cdp, "touchStart", [from]);
    for (let step = 1; step <= 8; step++)
      await touch(cdp, "touchMove", [
        { x: from.x + ((to.x - from.x) * step) / 8, y: from.y + ((to.y - from.y) * step) / 8 },
      ]);
    await touch(cdp, "touchEnd", []);
  }

  async function tap(cdp: CDPSession, at: Finger) {
    await touch(cdp, "touchStart", [at]);
    await touch(cdp, "touchEnd", []);
  }

  async function setUp(page: Page) {
    await page.goto(piecePath);
    await mounted(page);
    await shown(page).scrollIntoViewIfNeeded();
    const whole = await box(shown(page));
    const center = { x: whole.x + whole.width / 2, y: whole.y + whole.height / 2 };
    return { cdp: await page.context().newCDPSession(page), whole, center };
  }

  test("pincer agrandit l'œuvre en place, sans changer d'image", async ({ page }) => {
    const { cdp, whole, center } = await setUp(page);

    await pinch(cdp, center, 20, 100);

    await expect
      .poll(async () => (await box(shown(page))).width)
      .toBeGreaterThan(whole.width * 1.5);
    await expect(position(page)).toHaveText("1 / 10");
    await expect(loupeOf(page)).toHaveCount(0);
  });

  test("zoomée, l'œuvre se parcourt d'un doigt au lieu de changer d'image", async ({ page }) => {
    const { cdp, center } = await setUp(page);
    await pinch(cdp, center, 20, 100);
    await expect.poll(async () => (await box(shown(page))).x).toBeLessThan(0);
    const before = await box(shown(page));

    await drag(cdp, { x: center.x + 80, y: center.y }, { x: center.x - 80, y: center.y });

    await expect.poll(async () => (await box(shown(page))).x).toBeLessThan(before.x);
    await expect(position(page)).toHaveText("1 / 10");
  });

  test("un double tap zoome, un second rend l'œuvre entière", async ({ page }) => {
    const { cdp, whole, center } = await setUp(page);

    await tap(cdp, center);
    await tap(cdp, center);
    await expect
      .poll(async () => (await box(shown(page))).width)
      .toBeGreaterThan(whole.width * 1.5);
    await expect(loupeOf(page)).toHaveCount(0);

    await tap(cdp, center);
    await tap(cdp, center);
    await expect.poll(async () => (await box(shown(page))).width).toBeCloseTo(whole.width, 0);
  });

  // Chrome tait les mouvements d'un doigt sous une quinzaine de pixels ; Safari
  // les transmet. Les taps sont donc envoyés tels que Safari les livre à la page.
  test("un doigt qui bouge de quelques pixels tape encore : le double tap zoome", async ({
    page,
  }) => {
    const { whole, center } = await setUp(page);

    await shown(page).evaluate(async (image, at) => {
      const touchAt = (x: number, y: number) =>
        new Touch({ identifier: 0, target: image, clientX: x, clientY: y });
      const send = (type: string, touches: Touch[], changed: Touch[]) =>
        image.dispatchEvent(
          new TouchEvent(type, {
            bubbles: true,
            cancelable: true,
            touches,
            targetTouches: touches,
            changedTouches: changed,
          }),
        );
      for (let twice = 0; twice < 2; twice++) {
        send("touchstart", [touchAt(at.x, at.y)], [touchAt(at.x, at.y)]);
        send("touchmove", [touchAt(at.x + 3, at.y + 2)], [touchAt(at.x + 3, at.y + 2)]);
        send("touchend", [], [touchAt(at.x + 3, at.y + 2)]);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }, center);

    await expect
      .poll(async () => (await box(shown(page))).width)
      .toBeGreaterThan(whole.width * 1.5);
  });

  test("non zoomée, glisser change toujours d'image", async ({ page }) => {
    const { cdp, whole, center } = await setUp(page);

    await drag(
      cdp,
      { x: whole.x + whole.width * 0.8, y: center.y },
      { x: whole.x + whole.width * 0.2, y: center.y },
    );

    await expect(position(page)).toHaveText("2 / 10");
  });

  test("non zoomée, l'œuvre laisse le doigt faire défiler la page", async ({ page }) => {
    const { cdp, whole, center } = await setUp(page);
    const before = await page.evaluate(() => window.scrollY);

    await drag(
      cdp,
      { x: center.x, y: whole.y + whole.height * 0.8 },
      { x: center.x, y: whole.y + whole.height * 0.2 },
    );

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
    await expect(position(page)).toHaveText("1 / 10");
  });

  const otherImage: Record<string, (page: Page) => Promise<void>> = {
    "un point": (page) =>
      carousel(page).getByTestId("carousel-dots").getByRole("button").nth(1).click(),
    "la flèche": (page) => carousel(page).getByRole("button", { name: "Image suivante" }).click(),
    "le clavier": (page) => page.keyboard.press("ArrowRight"),
  };

  for (const [by, open] of Object.entries(otherImage)) {
    test(`l'image suivante s'ouvre entière, par ${by}`, async ({ page }) => {
      const { cdp, whole, center } = await setUp(page);
      await pinch(cdp, center, 20, 100);
      await expect
        .poll(async () => (await box(shown(page))).width)
        .toBeGreaterThan(whole.width * 1.5);

      await open(page);

      await expect(position(page)).toHaveText("2 / 10");
      await expect
        .poll(async () => (await box(shown(page))).width)
        .toBeLessThanOrEqual(whole.width + 1);
    });
  }
});

test.describe("sans JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("l'œuvre s'affiche entière, sans loupe au survol", async ({ page }) => {
    await page.goto(piecePath);
    const image = await box(shown(page));

    await page.mouse.move(image.x + image.width / 2, image.y + image.height / 2);

    await expect(shown(page)).toBeVisible();
    await expect(loupeOf(page)).toHaveCount(0);
  });
});
