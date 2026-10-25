import { expect, type Locator } from "@playwright/test";

export type Box = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
};

/** Où le visiteur voit un élément, dans la fenêtre. */
export function box(locator: Locator): Promise<Box> {
  return locator.evaluate((element) => {
    const { top, bottom, left, right, width, height } = element.getBoundingClientRect();
    return { top, bottom, left, right, width, height };
  });
}

/**
 * Les éléments paraissent de haut en bas dans l'ordre donné : chacun commence
 * sous la fin du précédent, sans se tenir à côté de lui.
 */
export async function expectInReadingOrder(named: Record<string, Locator>) {
  let previous: { name: string; bottom: number } | undefined;
  for (const [name, locator] of Object.entries(named)) {
    const { top, bottom } = await box(locator.first());
    if (previous) {
      expect(top, `« ${name} » doit venir sous « ${previous.name} »`).toBeGreaterThanOrEqual(
        previous.bottom - 1,
      );
    }
    previous = { name, bottom };
  }
}
