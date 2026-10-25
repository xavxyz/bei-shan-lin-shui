import { expect, test, type Locator, type Page } from "@playwright/test";
import { played, recordAnimations } from "./animations.js";

// La vignette sur laquelle on clique grandit jusqu'à l'œuvre de la page pièce.

type Box = { x: number; y: number; width: number; height: number };
type Gesture = { from: Box; to: Box; duration: number };

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error("aucune boîte");
  return found;
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
 * Guette les gestes de la transition de vue : pour chaque œuvre qui passe d'une
 * page à l'autre, la boîte d'où elle part et celle où elle arrive, à l'écran.
 */
async function watchGestures(page: Page) {
  await page.evaluate(() => {
    const seen = new Map<string, Gesture>();
    (window as Window & { gestes?: Map<string, Gesture> }).gestes = seen;
    const sample = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.pseudoElement;
        if (!effect || !target?.startsWith("::view-transition-group(") || seen.has(target)) {
          continue;
        }
        const frames = effect.getKeyframes();
        const px = (value: unknown) => parseFloat(String(value));
        const at = (frame: ComputedKeyframe | undefined): Box => {
          const { e, f } = new DOMMatrixReadOnly(String(frame?.transform ?? "none"));
          return { x: e, y: f, width: px(frame?.width), height: px(frame?.height) };
        };
        seen.set(target, {
          from: at(frames[0]),
          to: at(frames.at(-1)),
          duration: Number(effect.getTiming().duration),
        });
      }
      requestAnimationFrame(sample);
    };
    sample();
  });
}

async function gestures(page: Page): Promise<Gesture[]> {
  return page.evaluate(() => [
    ...((window as Window & { gestes?: Map<string, Gesture> }).gestes?.values() ?? []),
  ]);
}

const close = (a: Box, b: Box, sides: readonly (keyof Box)[]) =>
  sides.every((side) => Math.abs(a[side] - b[side]) <= 1);

/**
 * Le geste qui mène une œuvre de la boîte `from` à la boîte `to` : ce que le
 * visiteur a vu partir de l'une est ce qu'il voit arriver dans l'autre. Le
 * départ se compare en place et en taille ; l'arrivée en taille seulement, le
 * mur pouvant encore se ranger, ses images chargées, une fois le geste fini.
 */
async function gestureBetween(page: Page, from: Box, to: Box): Promise<Gesture> {
  await page.waitForTimeout(700);
  const seen = await gestures(page);
  const found = seen.find(
    (gesture) =>
      close(gesture.from, from, ["x", "y", "width", "height"]) &&
      close(gesture.to, to, ["width", "height"]),
  );
  expect(
    found,
    `aucun geste de ${JSON.stringify(from)} à ${JSON.stringify(to)} : ${JSON.stringify(seen)}`,
  ).toBeDefined();
  return found!;
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
    const departure = await box(thumbnail);
    await watchGestures(page);

    await thumbnail.click();
    await expect(page).toHaveURL(url);
    await expect(work(page)).toBeVisible();

    const seen = await gestureBetween(page, departure, await box(work(page)));
    // L'œuvre grandit le temps que le contenu s'efface puis revienne.
    expect(seen.duration).toBeGreaterThanOrEqual(400);
  });
}

test("quand seule une version antérieure a une image, la vignette grandit jusqu'à elle", async ({
  page,
}) => {
  // 豎橫 《卓菴》 : la v1 a son scan, la v2, courante, n'en a pas encore.
  await page.goto("/");
  const thumbnail = wallWork(page, "豎橫 《卓菴》");
  await thumbnail.scrollIntoViewIfNeeded();
  const departure = await box(thumbnail);
  await watchGestures(page);

  await thumbnail.click();
  await expect(page).toHaveURL("/zhong-he-ji/shu-heng-zhuo-an");
  const arrival = page.getByTestId("earlier-version").getByTestId("carousel-image");
  await expect(arrival).toBeVisible();

  await gestureBetween(page, departure, await box(arrival));
});

test("au retour, l'œuvre redevient sa vignette dans le mur", async ({ page }) => {
  await page.goto("/pieces/mo-xing-ji");
  const departure = await box(work(page));
  await watchGestures(page);

  await page.getByRole("banner").getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await expect(wallWork(page, "莫性急")).toBeVisible();

  await gestureBetween(page, departure, await box(wallWork(page, "莫性急")));
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
