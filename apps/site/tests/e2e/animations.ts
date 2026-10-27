import type { Page } from "@playwright/test";

export type Played = { target: string; name: string; delay: number; duration: number };

/**
 * Relève, image par image, les animations que joue le document : celles des
 * éléments comme celles des transitions de vue (`::view-transition-old(…)`).
 */
export async function recordAnimations(page: Page) {
  await page.evaluate(() => {
    const recorded = new Map<string, Played>();
    (window as Window & { played?: Map<string, Played> }).played = recorded;
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
        recorded.set(`${target} ${name}`, {
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

export async function played(page: Page): Promise<Played[]> {
  return page.evaluate(() => [
    ...(window as Window & { played?: Map<string, Played> }).played!.values(),
  ]);
}
