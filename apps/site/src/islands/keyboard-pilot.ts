/**
 * Les flèches ← → pilotent un carrousel sans qu'il ait le focus : le premier
 * de la page qui soit visible dans la fenêtre. Un carrousel caché (version
 * antérieure repliée) ne compte pas. ↑ ↓ ne sont jamais interceptées : elles
 * font défiler la page.
 *
 * Chaque carrousel navigable s'inscrit ici ; un seul écouteur, sur la fenêtre,
 * cherche à chaque touche celui qu'elle pilote.
 */

export type PilotedCarousel = {
  /** La zone dont on vérifie la visibilité : l'image affichée. */
  element: () => HTMLElement | null;
  previous: () => void;
  next: () => void;
};

const carousels = new Set<PilotedCarousel>();

/** Inscrit un carrousel ; retourne de quoi le désinscrire. */
export function pilotWithKeyboard(carousel: PilotedCarousel): () => void {
  if (carousels.size === 0) window.addEventListener("keydown", onKeyDown);
  carousels.add(carousel);
  return () => {
    carousels.delete(carousel);
    if (carousels.size === 0) window.removeEventListener("keydown", onKeyDown);
  };
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    return;
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;

  const piloted = firstVisible();
  if (!piloted) return;
  if (event.key === "ArrowRight") piloted.next();
  else piloted.previous();
  event.preventDefault();
}

/** Le premier carrousel visible, dans l'ordre du document. */
function firstVisible(): PilotedCarousel | undefined {
  let first: { carousel: PilotedCarousel; element: HTMLElement } | undefined;
  for (const carousel of carousels) {
    const element = carousel.element();
    if (!element || !inViewport(element)) continue;
    if (!first || element.compareDocumentPosition(first.element) & Node.DOCUMENT_POSITION_FOLLOWING)
      first = { carousel, element };
  }
  return first?.carousel;
}

function inViewport(element: HTMLElement): boolean {
  // Le contenu d'un <details> replié garde une boîte : seule `checkVisibility` le voit caché.
  if (!element.checkVisibility()) return false;
  const box = element.getBoundingClientRect();
  return (
    box.width > 0 &&
    box.height > 0 &&
    box.bottom > 0 &&
    box.right > 0 &&
    box.top < window.innerHeight &&
    box.left < window.innerWidth
  );
}
