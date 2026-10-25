/*
 * Le pilotage des popovers pinyin (`components/Pinyin.astro`).
 *
 * Un déclencheur `[data-pinyin]` montre son popover au survol de la souris, au
 * focus du clavier et au toucher. Dans un lien, c'est le lien qui prend le focus,
 * et il est décrit, comme son déclencheur, par le pinyin ; le toucher y suit le
 * lien, sans ouvrir le popover. Échap, ou un toucher hors de tout déclencheur,
 * ferme le popover.
 *
 * Les écouteurs du document sont posés une fois ; ceux des déclencheurs le sont
 * à chaque page (`astro:page-load`), le routeur client remplaçant le contenu.
 */

const TRIGGER = "[data-pinyin]";

function popoverOf(trigger: Element): HTMLElement | null {
  return trigger.querySelector<HTMLElement>(":scope > [role='tooltip']");
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

/** Le lien reprend la description du déclencheur, sans doublon d'une page à l'autre. */
function describeLink(link: HTMLElement, trigger: HTMLElement): void {
  const id = trigger.getAttribute("aria-describedby");
  if (!id) return;
  const ids = (link.getAttribute("aria-describedby") ?? "").split(" ").filter(Boolean);
  if (!ids.includes(id)) link.setAttribute("aria-describedby", [...ids, id].join(" "));
}

function wire(trigger: HTMLElement): void {
  // Dans un lien, c'est le lien qui prend le focus : pas d'arrêt de plus au clavier.
  const focusTarget = linkAround(trigger) ?? trigger;
  if (focusTarget === trigger) trigger.tabIndex = 0;
  else describeLink(focusTarget, trigger);

  trigger.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") open(trigger);
  });
  trigger.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse" && document.activeElement !== focusTarget) {
      show(trigger, false);
    }
  });
  // Le focus du clavier seul : un clic ou un toucher sur la pièce du mur la suit sans ouvrir le pinyin de son titre.
  focusTarget.addEventListener("focus", () => {
    if (focusTarget.matches(":focus-visible")) open(trigger);
  });
  focusTarget.addEventListener("blur", () => show(trigger, false));
}

let watching = false;

export function watchPinyinPopovers(): void {
  if (watching) return;
  watching = true;

  // Le déclencheur touché hors de tout lien : dans un lien, le toucher suit le lien.
  let touched: HTMLElement | null = null;

  document.addEventListener("pointerdown", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const trigger = target?.closest<HTMLElement>(TRIGGER) ?? null;
    touched = trigger && event.pointerType !== "mouse" && !linkAround(trigger) ? trigger : null;
    if (!trigger) closeAll();
  });

  document.addEventListener("click", () => {
    const trigger = touched;
    touched = null;
    if (trigger) open(trigger);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAll();
  });

  document.addEventListener("astro:page-load", () => {
    for (const trigger of document.querySelectorAll<HTMLElement>(TRIGGER)) wire(trigger);
  });
}
