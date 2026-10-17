/**
 * Les flèches du clavier pilotent le carrousel visible, sans focus préalable.
 *
 * Chaque carrousel navigable s'inscrit ici ; un seul écouteur, sur la fenêtre,
 * choisit à chaque touche celui qu'elle pilote :
 *
 * - ← → font défiler le carrousel choisi par ↑ ↓, tant qu'il reste visible ;
 *   à défaut, le plus visible dans la fenêtre, et à égalité le plus haut ;
 * - ↑ ↓ passent d'un carrousel visible au suivant, en boucle, seulement s'il
 *   y en a plusieurs à l'écran ; sinon elles font défiler la page.
 *
 * Un carrousel caché (version antérieure repliée) ne compte pas. Faire défiler la page rend la main au plus visible.
 */

export type PilotedCarousel = {
  /** La zone dont on mesure la visibilité : l'image affichée. */
  element: () => HTMLElement | null;
  previous: () => void;
  next: () => void;
};

const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];

const carousels = new Set<PilotedCarousel>();
let chosen: PilotedCarousel | null = null;

/** Inscrit un carrousel ; retourne de quoi le désinscrire. */
export function pilotWithKeyboard(carousel: PilotedCarousel): () => void {
  if (carousels.size === 0) listen();
  carousels.add(carousel);
  return () => {
    carousels.delete(carousel);
    if (chosen === carousel) chosen = null;
    if (carousels.size === 0) stopListening();
  };
}

function listen() {
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("wheel", forgetChoice, { passive: true });
  window.addEventListener("touchstart", forgetChoice, { passive: true });
}

function stopListening() {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("wheel", forgetChoice);
  window.removeEventListener("touchstart", forgetChoice);
}

function forgetChoice() {
  chosen = null;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
    return;
  if (!ARROWS.includes(event.key)) {
    forgetChoice();
    return;
  }

  const visible = visibleCarousels();
  if (visible.length === 0) return;

  const piloted = visible.find((entry) => entry.carousel === chosen) ?? mostVisible(visible);

  if (event.key === "ArrowRight") piloted.carousel.next();
  else if (event.key === "ArrowLeft") piloted.carousel.previous();
  else {
    if (visible.length < 2) return;
    const step = event.key === "ArrowDown" ? 1 : -1;
    const from = visible.indexOf(piloted);
    chosen = visible[(from + step + visible.length) % visible.length]!.carousel;
  }
  event.preventDefault();
}

type Visible = { carousel: PilotedCarousel; share: number; top: number };

/** Les carrousels qui ont une part dans la fenêtre, de haut en bas. */
function visibleCarousels(): Visible[] {
  const visible: Visible[] = [];
  for (const carousel of carousels) {
    const element = carousel.element();
    // Le contenu d'un <details> replié garde une boîte : seule `checkVisibility` le voit caché.
    if (!element?.checkVisibility()) continue;
    const box = element.getBoundingClientRect();
    const area = box.width * box.height;
    if (area === 0) continue;
    const width = Math.min(box.right, window.innerWidth) - Math.max(box.left, 0);
    const height = Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0);
    if (width <= 0 || height <= 0) continue;
    visible.push({ carousel, share: (width * height) / area, top: box.top });
  }
  return visible.sort((a, b) => a.top - b.top);
}

/** Le plus visible ; à égalité, le plus haut (la liste va de haut en bas). */
function mostVisible(visible: Visible[]): Visible {
  return visible.reduce((best, entry) => (entry.share > best.share ? entry : best));
}
