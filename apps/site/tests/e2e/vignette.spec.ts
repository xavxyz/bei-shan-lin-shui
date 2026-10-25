import { expect, test, type Locator, type Page } from "@playwright/test";
import { played, recordAnimations } from "./animations.js";

// La vignette sur laquelle on clique grandit jusqu'à l'œuvre de la page pièce.

type Box = { x: number; y: number; width: number; height: number };
/** Une œuvre qui passe d'une page à l'autre : d'où elle part, où elle arrive. */
type Gesture = { from: Box; to: Box; duration: number };
/** Une œuvre qui s'efface ou apparaît sur place, sans partenaire sur l'autre page. */
type Fade = { box: Box; from: number; to: number; delay: number; duration: number };
type Watched = { gestures: Map<string, Gesture>; fades: Map<string, Fade> };

const ALL_SIDES = ["x", "y", "width", "height"] as const;
const SIZE = ["width", "height"] as const;

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  if (!found) throw new Error("aucune boîte");
  return found;
}

/**
 * Guette, image par image, ce que la transition de vue fait voir des œuvres :
 * celles qui passent d'une page à l'autre (leur boîte de départ et d'arrivée, à
 * l'écran), et celles qui s'effacent ou apparaissent sur place (leur boîte et
 * leur opacité). Le relevé couvre toutes les navigations qui suivent.
 */
async function watchTransitions(page: Page) {
  await page.evaluate(() => {
    const watched: Watched = { gestures: new Map(), fades: new Map() };
    (window as Window & { vu?: Watched }).vu = watched;
    const px = (value: unknown) => parseFloat(String(value));
    const boxOf = (style: ComputedKeyframe | CSSStyleDeclaration | undefined): Box => {
      const { e, f } = new DOMMatrixReadOnly(String(style?.transform ?? "none"));
      return { x: e, y: f, width: px(style?.width), height: px(style?.height) };
    };
    const sample = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        const target = effect?.pseudoElement;
        if (!effect || !target) continue;
        const frames = effect.getKeyframes();
        const timing = effect.getTiming();
        if (target.startsWith("::view-transition-group(") && !watched.gestures.has(target)) {
          watched.gestures.set(target, {
            from: boxOf(frames[0]),
            to: boxOf(frames.at(-1)),
            duration: Number(timing.duration),
          });
        }
        const image = /^::view-transition-(old|new)\((.+)\)$/.exec(target);
        const opacities = frames.map((frame) => frame.opacity);
        if (image && opacities.every((opacity) => opacity !== undefined)) {
          const key = `${target} ${String(timing.delay)}`;
          if (watched.fades.has(key)) continue;
          const around = getComputedStyle(
            document.documentElement,
            `::view-transition-group(${image[2]})`,
          );
          watched.fades.set(key, {
            box: boxOf(around),
            from: Number(opacities[0]),
            to: Number(opacities.at(-1)),
            delay: Number(timing.delay),
            duration: Number(timing.duration),
          });
        }
      }
      requestAnimationFrame(sample);
    };
    sample();
  });
}

async function watched(page: Page) {
  return page.evaluate(() => {
    const seen = (window as Window & { vu?: Watched }).vu;
    return {
      gestures: [...(seen?.gestures.values() ?? [])],
      fades: [...(seen?.fades.values() ?? [])],
    };
  });
}

const close = (a: Box, b: Box, sides: readonly (keyof Box)[]) =>
  sides.every((side) => Math.abs(a[side] - b[side]) <= 1);

/**
 * Attend le geste qui mène une œuvre de la boîte `from` à la boîte `to` : ce
 * que le visiteur a vu partir de l'une est ce qu'il voit arriver dans l'autre.
 * Le départ se compare en place et en taille ; l'arrivée en taille seulement,
 * le mur pouvant encore se ranger, ses images chargées, une fois le geste fini.
 */
async function expectGesture(page: Page, from: Box, to: Box, minDuration = 0) {
  await expect
    .poll(
      async () => {
        const { gestures } = await watched(page);
        const found = gestures.some(
          (gesture) =>
            close(gesture.from, from, ALL_SIDES) &&
            close(gesture.to, to, SIZE) &&
            gesture.duration >= minDuration,
        );
        return found ? "geste vu" : gestures;
      },
      { message: `geste de ${JSON.stringify(from)} à ${JSON.stringify(to)}`, timeout: 3000 },
    )
    .toBe("geste vu");
}

/** Attend qu'une œuvre, à la boîte `at`, s'efface ou apparaisse comme `fade` le dit. */
async function expectFade(
  page: Page,
  at: Box,
  sides: readonly (keyof Box)[],
  fade: Omit<Fade, "box">,
) {
  await expect
    .poll(
      async () => {
        const { fades } = await watched(page);
        const found = fades.some(
          (seen) =>
            close(seen.box, at, sides) &&
            seen.from === fade.from &&
            seen.to === fade.to &&
            seen.delay === fade.delay &&
            seen.duration === fade.duration,
        );
        return found ? "fondu vu" : fades;
      },
      { message: `fondu ${JSON.stringify(fade)} en ${JSON.stringify(at)}`, timeout: 3000 },
    )
    .toBe("fondu vu");
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
    await watchTransitions(page);

    await thumbnail.click();
    await expect(page).toHaveURL(url);
    await expect(work(page)).toBeVisible();

    // L'œuvre grandit le temps que le contenu s'efface puis revienne.
    await expectGesture(page, departure, await box(work(page)), 400);
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
  await watchTransitions(page);

  await thumbnail.click();
  await expect(page).toHaveURL("/zhong-he-ji/shu-heng-zhuo-an");
  const arrival = page.getByTestId("earlier-version").getByTestId("carousel-image");
  await expect(arrival).toBeVisible();

  await expectGesture(page, departure, await box(arrival));
});

test("au retour, l'œuvre redevient sa vignette dans le mur", async ({ page }) => {
  await page.goto("/pieces/mo-xing-ji");
  const departure = await box(work(page));
  await watchTransitions(page);

  await page.getByRole("banner").getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await expect(wallWork(page, "莫性急")).toBeVisible();

  await expectGesture(page, departure, await box(wallWork(page, "莫性急")));
});

test("les autres pièces du mur s'effacent avec le contenu, et reviennent avec lui", async ({
  page,
}) => {
  await page.goto("/");
  const other = wallWork(page, "永草書");
  await expect(other).toBeVisible();
  // Le clic amène la vignette cliquée à l'écran : l'autre se mesure ensuite.
  await wallWork(page, "莫性急").scrollIntoViewIfNeeded();
  const before = await box(other);
  await watchTransitions(page);

  await wallWork(page, "莫性急").click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  // Elle s'efface sur place, pendant que le contenu s'efface.
  await expectFade(page, before, ALL_SIDES, { from: 1, to: 0, delay: 0, duration: 250 });

  await page.getByRole("banner").getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await expect(other).toBeVisible();
  // Elle revient, à sa taille, une fois le contenu revenu.
  await expectFade(page, await box(other), SIZE, { from: 0, to: 1, delay: 250, duration: 250 });
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
