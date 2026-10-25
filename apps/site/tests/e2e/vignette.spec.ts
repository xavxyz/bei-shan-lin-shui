import { expect, test, type Locator, type Page } from "@playwright/test";
import { played, recordAnimations } from "./animations.js";

// La vignette sur laquelle on clique grandit jusqu'à l'œuvre de la page pièce.

type Size = { width: number; height: number };
type Gesture = { from: Size; to: Size; duration: number };

async function size(locator: Locator): Promise<Size> {
  const box = await locator.boundingBox();
  if (!box) throw new Error("aucune boîte");
  return { width: box.width, height: box.height };
}

/**
 * Le nom de transition de vue que porte une image, quel qu'il soit : deux
 * images de même nom, d'une page à l'autre, sont une seule œuvre qui se déplace.
 */
async function transitionName(locator: Locator): Promise<string> {
  const name = await locator.evaluate((element) => getComputedStyle(element).viewTransitionName);
  expect(name, "l'image ne porte aucun nom de transition").not.toBe("none");
  return name;
}

/**
 * Guette le geste de l'œuvre de nom de transition `name` : la boîte d'où elle
 * part et celle où elle arrive, telles que la transition de vue les fait parcourir.
 */
async function watchGesture(page: Page, name: string) {
  await page.evaluate((name) => {
    const target = `::view-transition-group(${name})`;
    const sample = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        if (effect?.pseudoElement !== target) continue;
        const frames = effect.getKeyframes();
        const px = (value: unknown) => parseFloat(String(value));
        const at = (frame: ComputedKeyframe | undefined) => ({
          width: px(frame?.width),
          height: px(frame?.height),
        });
        (window as Window & { geste?: Gesture }).geste = {
          from: at(frames[0]),
          to: at(frames.at(-1)),
          duration: Number(effect.getTiming().duration),
        };
        return;
      }
      requestAnimationFrame(sample);
    };
    sample();
  }, name);
}

async function gesture(page: Page): Promise<Gesture | undefined> {
  return page.evaluate(() => (window as Window & { geste?: Gesture }).geste);
}

function expectClose(actual: Size, expected: Size) {
  expect(actual.width).toBeCloseTo(expected.width, 0);
  expect(actual.height).toBeCloseTo(expected.height, 0);
}

function wallWork(page: Page, title: string) {
  return page.getByTestId("piece-link").filter({ hasText: title }).locator("img");
}

const work = (page: Page) => page.getByTestId("carousel-image").first();

for (const { from, path, title, url } of [
  { from: "le mur", path: "/", title: "莫性急", url: "/pieces/mo-xing-ji" },
  {
    from: "une page projet",
    path: "/ge-zhi-yan-jiu",
    title: "永草書",
    url: "/ge-zhi-yan-jiu/yong-cao-shu",
  },
]) {
  test(`depuis ${from}, la vignette cliquée grandit jusqu'à l'œuvre de la page pièce`, async ({
    page,
  }) => {
    await page.goto(path);
    const thumbnail = wallWork(page, title);
    await thumbnail.scrollIntoViewIfNeeded();
    const departure = await size(thumbnail);
    const name = await transitionName(thumbnail);
    await watchGesture(page, name);

    await thumbnail.click();
    await expect(page).toHaveURL(url);
    expect(await transitionName(work(page)), "l'œuvre n'est pas la vignette cliquée").toBe(name);
    await expect.poll(() => gesture(page)).toBeDefined();
    await page.waitForTimeout(700);

    const seen = (await gesture(page))!;
    expectClose(seen.from, departure);
    expectClose(seen.to, await size(work(page)));
    // L'œuvre grandit le temps que le contenu s'efface puis revienne.
    expect(seen.duration).toBeGreaterThanOrEqual(400);
  });
}

test("au retour, l'œuvre redevient sa vignette dans le mur", async ({ page }) => {
  await page.goto("/pieces/mo-xing-ji");
  const departure = await size(work(page));
  const name = await transitionName(work(page));
  await watchGesture(page, name);

  await page.getByRole("banner").getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  expect(
    await transitionName(wallWork(page, "莫性急")),
    "la vignette n'est pas l'œuvre quittée",
  ).toBe(name);
  await expect.poll(() => gesture(page)).toBeDefined();
  await page.waitForTimeout(700);

  const seen = (await gesture(page))!;
  expectClose(seen.from, departure);
  expectClose(seen.to, await size(wallWork(page, "莫性急")));
});

test("les autres œuvres du mur s'effacent avec le contenu, et reviennent avec lui", async ({
  page,
}) => {
  await page.goto("/");
  const other = await transitionName(wallWork(page, "永草書"));
  await recordAnimations(page);

  await wallWork(page, "莫性急").click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await page.getByRole("banner").getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await page.waitForTimeout(700);

  const animations = await played(page);
  const leaving = animations.find((a) => a.target === `::view-transition-old(${other})`);
  const entering = animations.find((a) => a.target === `::view-transition-new(${other})`);
  expect(leaving, JSON.stringify(animations)).toMatchObject({ delay: 0, duration: 250 });
  expect(entering, JSON.stringify(animations)).toMatchObject({ delay: 250, duration: 250 });
});

test("après le geste, les flèches pilotent toujours le carrousel", async ({ page }) => {
  await page.goto("/");
  await wallWork(page, "墨寺㞢文刻").click();
  await expect(page).toHaveURL("/pieces/mo-si-wen-ke");

  const carousel = page.getByTestId("carousel").first();
  await expect(carousel.getByRole("button", { name: "Image suivante" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(carousel.getByTestId("carousel-position")).toHaveText("2 / 10");
});

test("sous prefers-reduced-motion, la vignette ne grandit pas : la page change sans mouvement", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await recordAnimations(page);

  await wallWork(page, "莫性急").click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await expect(work(page)).toBeVisible();
  await page.waitForTimeout(700);

  expect(await played(page)).toEqual([]);
});

test("sans View Transitions, la vignette mène à la pièce par un simple changement de page", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (Document.prototype as Partial<Document>).startViewTransition;
  });
  await page.goto("/");

  await wallWork(page, "莫性急").click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await expect(work(page)).toBeVisible();
  await expect(page.getByRole("heading", { name: "莫性急", level: 2 })).toBeVisible();
});
