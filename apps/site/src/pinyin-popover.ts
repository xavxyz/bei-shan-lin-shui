/*
 * Le pilotage des popovers pinyin (`components/Pinyin.astro`).
 *
 * Un déclencheur `[data-pinyin]` montre son popover au survol de la souris, au
 * focus et au toucher. Dans un lien, c'est le lien qui prend le focus, et le
 * premier toucher montre le pinyin au lieu de suivre le lien : le second le suit.
 * Échap, ou un toucher hors de tout déclencheur, ferme le popover.
 *
 * Les écouteurs du document sont posés une fois ; ceux des déclencheurs le sont
 * à chaque page (`astro:page-load`), le routeur client remplaçant le contenu.
 */

const TRIGGER = "[data-pinyin]";

function popoverOf(trigger: Element): HTMLElement | null {
  return trigger.querySelector<HTMLElement>(":scope > [role='tooltip']");
}

function isOpen(trigger: Element): boolean {
  return popoverOf(trigger)?.hidden === false;
}

/** Ouvert, le popover reçoit le pinyin de son déclencheur ; fermé, il est vide. */
function show(trigger: HTMLElement, visible: boolean): void {
  const popover = popoverOf(trigger);
  if (!popover) return;
  popover.textContent = visible ? (trigger.dataset.pinyin ?? "") : "";
  popover.hidden = !visible;
}

function closeAll(except?: Element): void {
  for (const trigger of document.querySelectorAll<HTMLElement>(TRIGGER)) {
    if (trigger !== except) show(trigger, false);
  }
}

function open(trigger: HTMLElement): void {
  closeAll(trigger);
  show(trigger, true);
}

/** Le lien qui enveloppe le déclencheur, s'il y en a un. */
function linkAround(trigger: Element): HTMLElement | null {
  return trigger.parentElement?.closest<HTMLElement>("a[href]") ?? null;
}

function wire(trigger: HTMLElement): void {
  // Dans un lien, c'est le lien qui prend le focus : pas d'arrêt de plus au clavier.
  const focusTarget = linkAround(trigger) ?? trigger;
  if (focusTarget === trigger) trigger.tabIndex = 0;

  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") open(trigger);
  });
  trigger.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && document.activeElement !== focusTarget) {
      show(trigger, false);
    }
  });
  // Le focus du clavier seul : un clic sur l'œuvre du mur ne doit pas ouvrir le pinyin de son titre.
  focusTarget.addEventListener("focus", () => {
    if (focusTarget.matches(":focus-visible")) open(trigger);
  });
  focusTarget.addEventListener("blur", () => show(trigger, false));
}

let watching = false;

export function watchPinyinPopovers(): void {
  if (watching) return;
  watching = true;

  // Au toucher, l'état d'avant le geste : le focus, qui suit, ouvre déjà le popover.
  let touched: { trigger: HTMLElement; wasOpen: boolean } | null = null;

  document.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest<HTMLElement>(TRIGGER) ?? null;
    touched =
      trigger && event.pointerType !== "mouse" ? { trigger, wasOpen: isOpen(trigger) } : null;
    if (!trigger) closeAll();
  });

  // En capture : avant que le routeur client ne suive le lien.
  document.addEventListener(
    "click",
    (event) => {
      const gesture = touched;
      touched = null;
      if (!gesture) return;
      if (linkAround(gesture.trigger) && !gesture.wasOpen) event.preventDefault();
      open(gesture.trigger);
    },
    { capture: true },
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAll();
  });

  document.addEventListener("astro:page-load", () => {
    for (const trigger of document.querySelectorAll<HTMLElement>(TRIGGER)) wire(trigger);
  });
}
