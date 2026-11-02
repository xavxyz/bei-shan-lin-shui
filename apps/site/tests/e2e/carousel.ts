import { expect, type Page } from "@playwright/test";

/** Le carrousel de la version courante : le premier de la page, avant l'évolution. */
export function carousel(page: Page) {
  return page.getByTestId("carousel").first();
}

/** L'image qu'il affiche. */
export function shown(page: Page) {
  return carousel(page).getByTestId("carousel-image");
}

/** Les flèches n'apparaissent qu'une fois l'îlot monté. */
export async function mounted(page: Page) {
  await expect(carousel(page).getByRole("button", { name: "Image suivante" })).toBeVisible();
}
