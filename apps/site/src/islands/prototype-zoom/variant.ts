/*
 * PROTOTYPE — à jeter. Question : « sur la page d'une pièce, comment zoomer
 * une image ? » Trois variantes sur la vraie page pièce, au choix par
 * `?variant=A|B|C`, et une barre flottante pour passer de l'une à l'autre
 * (en dev seulement). Branche : prototype/zoom-image.
 */
import { useEffect, useState } from "react";

export const VARIANTS = [
  { key: "A", name: "Plein écran" },
  { key: "B", name: "Loupe" },
  { key: "C", name: "Zoom en place" },
] as const;

export type VariantKey = (typeof VARIANTS)[number]["key"];

const CHANGE = "prototype-zoom-variant";
const STATE = "prototype-zoom-state";

export function readVariant(): VariantKey {
  const asked = new URLSearchParams(location.search).get("variant");
  return VARIANTS.find((variant) => variant.key === asked)?.key ?? "A";
}

export function setVariant(key: VariantKey) {
  const url = new URL(location.href);
  url.searchParams.set("variant", key);
  history.replaceState(history.state, "", url);
  window.dispatchEvent(new CustomEvent(CHANGE));
  reportState({});
}

/** La variante courante une fois monté ; `null` au rendu serveur et en production. */
export function useZoomVariant(): VariantKey | null {
  const [variant, setShown] = useState<VariantKey | null>(null);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const update = () => setShown(readVariant());
    update();
    window.addEventListener(CHANGE, update);
    return () => window.removeEventListener(CHANGE, update);
  }, []);
  return variant;
}

/** L'état du zoom, affiché dans la barre flottante. */
export function reportState(state: Record<string, string | number | boolean>) {
  window.dispatchEvent(new CustomEvent(STATE, { detail: state }));
}

export function useReportedState() {
  const [state, setState] = useState<Record<string, unknown>>({});
  useEffect(() => {
    const update = (event: Event) => setState((event as CustomEvent).detail);
    window.addEventListener(STATE, update);
    return () => window.removeEventListener(STATE, update);
  }, []);
  return state;
}
