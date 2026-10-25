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

type Played = { target: string; name: string; delay: number; duration: number };

/**
 * Relève, image par image, les animations que joue le document : celles des
 * éléments comme celles des transitions de vue (`::view-transition-old(…)`).
 */
async function recordAnimations(page: Page) {
  await page.evaluate(() => {
    const played = new Map<string, Played>();
    (window as Window & { played?: Map<string, Played> }).played = played;
    const sample = () => {
      for (const animation of document.getAnimations()) {
        const effect = animation.effect as KeyframeEffect | null;
        const timing = effect?.getTiming();
        const target = effect?.pseudoElement ?? effect?.target?.nodeName ?? "?";
        const name =
          animation instanceof CSSAnimation
            ? animation.animationName
            : animation instanceof CSSTransition
              ? `transition ${animation.transitionProperty}`
              : "animation";
        played.set(`${target} ${name}`, {
          target,
          name,
          delay: Number(timing?.delay ?? 0),
          duration: Number(timing?.duration ?? 0),
        });
      }
      requestAnimationFrame(sample);
    };
    sample();
  });
}

async function played(page: Page): Promise<Played[]> {
  return page.evaluate(() => [
    ...(window as Window & { played?: Map<string, Played> }).played!.values(),
  ]);
}

test("le contenu s'efface en 250 ms, puis le nouveau apparaît en 250 ms, sans chevauchement", async ({
  page,
}) => {
  await page.goto("/");
  await recordAnimations(page);

  await page.getByRole("link", { name: "莫性急" }).click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await page.waitForTimeout(700);

  const animations = await played(page);
  const leaving = animations.find((a) => a.target === "::view-transition-old(contenu)");
  const entering = animations.find((a) => a.target === "::view-transition-new(contenu)");
  expect(leaving, JSON.stringify(animations)).toMatchObject({ delay: 0, duration: 250 });
  expect(entering, JSON.stringify(animations)).toMatchObject({ delay: 250, duration: 250 });
});

test("sans View Transitions, on passe d'une page à l'autre, l'en-tête et le carrousel en place", async ({
  page,
}) => {
  await page.addInitScript(() => {
    delete (Document.prototype as Partial<Document>).startViewTransition;
  });
  await page.goto("/");
  expect(await page.evaluate(() => "startViewTransition" in document)).toBe(false);
  await mark(page);

  await page.getByRole("link", { name: "墨寺㞢文刻" }).click();
  await expect(page).toHaveURL("/pieces/mo-si-wen-ke");
  await expect(page.getByRole("heading", { name: "墨寺㞢文刻", level: 2 })).toBeVisible();
  await expect.poll(() => titleSize(page)).toBeLessThan(32);
  await expect(page.getByRole("main")).toBeFocused();

  const carousel = page.getByTestId("carousel").first();
  await expect(carousel.getByRole("button", { name: "Image suivante" })).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(carousel.getByTestId("carousel-position")).toHaveText("2 / 10");

  await banner(page).getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await expect.poll(() => titleSize(page)).toBeGreaterThanOrEqual(48);
});

test("sous prefers-reduced-motion, aucune animation ne joue d'une page à l'autre", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await mark(page);
  await recordAnimations(page);

  await page.getByRole("link", { name: "莫性急" }).click();
  await expect(page).toHaveURL("/pieces/mo-xing-ji");
  await banner(page).getByRole("link", { name: "背山臨水" }).click();
  await expect(page).toHaveURL("/");
  await page.waitForTimeout(700);

  await stillMarked(page);
  expect(await played(page)).toEqual([]);
});

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

test("après une navigation sans rechargement, les flèches pilotent le carrousel de la nouvelle page", async ({
  page,
}) => {
  const carousel = page.getByTestId("carousel").first();
  const position = carousel.getByTestId("carousel-position");
  const mounted = carousel.getByRole("button", { name: "Image suivante" });

  await page.goto("/");
  await mark(page);
  await page.getByRole("link", { name: "墨寺㞢文刻" }).click();
  await expect(page).toHaveURL("/pieces/mo-si-wen-ke");
  await expect(mounted).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(position).toHaveText("2 / 10");

  // D'une pièce à l'autre : le carrousel quitté ne capte plus rien.
  await banner(page).getByRole("link", { name: "背山臨水" }).click();
  await page.getByRole("link", { name: "新年快樂，馬到成功" }).click();
  await expect(page).toHaveURL("/pieces/xin-nian-kuai-le-ma-dao-cheng-gong");
  await expect(mounted).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(position).toHaveText("2 / 2");
  await stillMarked(page);
});

test("après une navigation au clavier, le focus est au début du nouveau contenu", async ({
  page,
}) => {
  await page.goto("/");
  await mark(page);

  await page.getByRole("link", { name: "永草書" }).first().focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/ge-zhi-yan-jiu/yong-cao-shu");
  await stillMarked(page);
  await expect(page.getByRole("main")).toBeFocused();

  // Tab mène au premier lien du contenu, pas à l'en-tête ni au bas de la page.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("main").getByRole("link").first()).toBeFocused();

  // Revenir par l'en-tête, qui reste en place, ramène aussi le focus au contenu.
  await banner(page).getByRole("link", { name: "背山臨水" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("main")).toBeFocused();
});
