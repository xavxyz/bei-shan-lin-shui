/* PROTOTYPE — à jeter. Barre flottante qui passe d'une variante de zoom à l'autre. */
import { useEffect, useState } from "react";
import { VARIANTS, readVariant, setVariant, useReportedState, type VariantKey } from "./variant.js";
import "./prototype-zoom.css";

export function PrototypeSwitcher() {
  const [current, setCurrent] = useState<VariantKey>("A");
  const state = useReportedState();
  useEffect(() => setCurrent(readVariant()), []);

  function cycle(by: number) {
    const index = VARIANTS.findIndex((variant) => variant.key === current);
    const next = VARIANTS[(index + by + VARIANTS.length) % VARIANTS.length]!.key;
    setVariant(next);
    setCurrent(next);
  }

  // ← → pilotent déjà le carrousel : la barre prend [ et ].
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "[") cycle(-1);
      else if (event.key === "]") cycle(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const name = VARIANTS.find((variant) => variant.key === current)?.name;
  const entries = Object.entries(state);

  return (
    <div className="prototype-switcher" role="toolbar" aria-label="Variantes du prototype">
      <button type="button" onClick={() => cycle(-1)} aria-label="Variante précédente">
        ‹
      </button>
      <span className="prototype-switcher__label">
        {current} ({name})
        <span className="prototype-switcher__state">
          {entries.length > 0
            ? entries.map(([key, value]) => `${key} ${String(value)}`).join(" · ")
            : "au repos"}
        </span>
      </span>
      <button type="button" onClick={() => cycle(1)} aria-label="Variante suivante">
        ›
      </button>
    </div>
  );
}

export default PrototypeSwitcher;
