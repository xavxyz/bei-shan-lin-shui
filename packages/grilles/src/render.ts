import { layoutSheet, type PouredText, type Sheet, type SheetLayout } from "./sheets.js";

export type Variant = {
  /** `A`, `B`… : la clé de `?variant=`. */
  key: string;
  format: string;
  sheets: Sheet[];
  text: PouredText;
};

export type SheetSummary = SheetLayout & { characters: number };

export type RenderInput = {
  title: string;
  slug: string;
  version: string;
  origin: string;
  variants: Variant[];
};

/** Ce que la commande dit de chaque variante, et ce que la page affiche sous les feuilles. */
export function describeVariant(variant: Variant): { sheets: SheetSummary[]; notes: string[] } {
  const sheets = variant.sheets.map((sheet, index) => ({
    ...layoutSheet(sheet),
    characters: variant.text.sheets[index]!.flat().join("").length,
  }));
  const notes = [
    variant.text.mode === "colonnes"
      ? "les colonnes du texte tombent une à une dans celles de la grille"
      : "le texte coule dans les cases, dans l'ordre de lecture",
  ];
  if (variant.text.overflow) {
    notes.push(`ne tient pas : ${[...variant.text.overflow].length} caractères (${variant.text.overflow})`);
  }
  if (variant.text.empty > 0) notes.push(`${variant.text.empty} cases restent vides`);
  return { sheets, notes };
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const mm = (value: number) => Number(value.toFixed(2));

function renderSheet(layout: SheetSummary, columns: string[], index: number): string {
  const { width, height, cell } = layout;
  const lines: string[] = [];
  const glyphs: string[] = [];
  layout.columns.forEach((box, c) => {
    lines.push(`<rect x="${mm(box.x)}" y="${mm(box.y)}" width="${mm(cell)}" height="${mm(cell * box.rows)}"/>`);
    for (let r = 1; r < box.rows; r++) {
      const y = mm(box.y + r * cell);
      lines.push(`<line x1="${mm(box.x)}" y1="${y}" x2="${mm(box.x + cell)}" y2="${y}"/>`);
    }
    [...(columns[c] ?? "")].forEach((character, r) => {
      glyphs.push(
        `<text x="${mm(box.x + cell / 2)}" y="${mm(box.y + (r + 0.5) * cell)}">${escape(character)}</text>`,
      );
    });
  });
  const band = layout.inscription;
  return `
    <figure class="sheet ${layout.orientation}">
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
        <text class="inscription" x="${mm(band.x + band.width / 2)}" y="${mm(band.y + 4)}" font-size="5">落款</text>
        <g class="grid">${lines.join("")}</g>
        <g class="characters" font-size="${mm(cell * 0.78)}">${glyphs.join("")}</g>
      </svg>
      <figcaption>feuille ${index + 1} · ${layout.orientation} · carreau ${layout.cell.toFixed(1)} mm · ${layout.columns.length} colonnes · ${layout.characters} caractères</figcaption>
    </figure>`;
}

/**
 * Une page HTML autonome : chaque variante est une suite de feuilles A4 à
 * l'échelle réelle, et seule la variante affichée s'imprime, une feuille par page.
 */
export function renderPage(input: RenderInput): string {
  const sections = input.variants.map((variant) => {
    const { sheets, notes } = describeVariant(variant);
    const columns = variant.text.sheets.map((sheet) => sheet.flat());
    return `
  <section class="variant" data-variant="${variant.key}" data-label="${escape(`${variant.key} · ${variant.format}`)}" hidden>
    <div class="sheets">${sheets.map((sheet, i) => renderSheet(sheet, columns[i]!, i)).join("")}
    </div>
    <aside class="state">
      <strong>${escape(`${variant.key} · ${variant.format}`)}</strong> — ${sheets.length} feuille${sheets.length > 1 ? "s" : ""}
      <ul>${notes.map((note) => `<li>${escape(note)}</li>`).join("")}</ul>
    </aside>
  </section>`;
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(`Grilles — ${input.title}`)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC&display=swap">
<style>${STYLE}</style>
</head>
<body data-characters="shown">
  <header class="controls">
    <h1>${escape(input.title)}</h1>
    <p>${escape(`${input.slug} · version ${input.version} · ${input.origin}`)}</p>
    <fieldset>
      <legend>Caractères</legend>
      <label><input type="radio" name="characters" value="shown" checked> affichés</label>
      <label><input type="radio" name="characters" value="tracing"> en calque</label>
      <label><input type="radio" name="characters" value="hidden"> masqués</label>
    </fieldset>
    <p class="hint">Imprimer : une feuille par page, A4, échelle 100 %, marges « aucune ». Les caractères s'impriment comme ils sont affichés.</p>
  </header>
  <main>${sections.join("")}
  </main>
  <nav class="switcher" aria-label="Variantes">
    <button type="button" data-step="-1" aria-label="Variante précédente">←</button>
    <span class="switcher__label"></span>
    <button type="button" data-step="1" aria-label="Variante suivante">→</button>
  </nav>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

const STYLE = `
@page { size: A4 portrait; margin: 0; }
@page paysage { size: A4 landscape; margin: 0; }
body { margin: 0; padding: 24px 24px 120px; background: #e8e4dc; color: #23201c;
  font-family: "Iowan Old Style", Palatino, Georgia, serif; }
.controls { max-width: 900px; margin: 0 auto 24px; }
.controls h1 { margin: 0; font-family: "Noto Serif TC", "Songti TC", serif; font-weight: 400; }
.controls p { margin: 4px 0; color: #6d675e; font-size: 14px; }
.controls fieldset { display: inline-flex; gap: 16px; border: 1px solid #c9c2b4; border-radius: 6px; margin: 8px 0; }
.sheets { display: flex; flex-direction: row-reverse; flex-wrap: wrap; justify-content: center; gap: 24px; align-items: flex-start; }
.sheet { margin: 0; }
.sheet svg { display: block; background: #fff; box-shadow: 0 2px 10px rgb(0 0 0 / 0.18); }
.grid { fill: none; stroke: #b9b2a4; stroke-width: 0.3; }
.characters text, .inscription { font-family: "Kaiti TC", "BiauKai", "DFKai-SB", "STKaiti", "Noto Serif TC", "Songti TC", serif;
  text-anchor: middle; dominant-baseline: central; fill: #23201c; }
.inscription { fill: #8a2c2c; opacity: 0.5; writing-mode: vertical-rl; dominant-baseline: auto; }
body[data-characters="tracing"] .characters { opacity: 0.12; }
body[data-characters="hidden"] .characters { display: none; }
figcaption { margin-top: 8px; font-size: 13px; text-align: center; color: #6d675e; }
.state { max-width: 900px; margin: 20px auto 0; font-size: 15px; line-height: 1.5; }
.switcher { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center;
  gap: 12px; padding: 8px 14px; border-radius: 999px; background: #111; color: #fff; font: 14px system-ui, sans-serif;
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.35); }
.switcher button { all: unset; cursor: pointer; padding: 2px 8px; font-size: 18px; }
@media print {
  body { padding: 0; background: none; }
  .controls, .state, .switcher, figcaption, .inscription { display: none; }
  .sheets { display: block; }
  .sheet { break-after: page; }
  .sheet:last-child { break-after: auto; }
  .sheet.paysage { page: paysage; }
  .sheet svg { box-shadow: none; }
}
`;

const SCRIPT = `
const sections = [...document.querySelectorAll(".variant")];
const keys = sections.map((s) => s.dataset.variant);
const label = document.querySelector(".switcher__label");
const params = new URLSearchParams(location.search);
let current = keys.includes(params.get("variant")) ? params.get("variant") : keys[0];

function sync() {
  for (const s of sections) s.hidden = s.dataset.variant !== current;
  label.textContent = sections.find((s) => s.dataset.variant === current).dataset.label;
  const url = new URL(location.href);
  url.searchParams.set("variant", current);
  url.searchParams.set("caracteres", names[document.body.dataset.characters]);
  history.replaceState(null, "", url);
}
function step(d) {
  current = keys[(keys.indexOf(current) + d + keys.length) % keys.length];
  sync();
}
const modes = { affiches: "shown", calque: "tracing", masques: "hidden" };
const names = Object.fromEntries(Object.entries(modes).map(([k, v]) => [v, k]));
function setCharacters(mode) {
  document.body.dataset.characters = mode;
  document.querySelector('input[value="' + mode + '"]').checked = true;
}
setCharacters(modes[params.get("caracteres")] ?? "shown");
document.querySelectorAll('input[name="characters"]').forEach((input) =>
  input.addEventListener("change", () => { setCharacters(input.value); sync(); }));
document.querySelectorAll(".switcher button").forEach((b) =>
  b.addEventListener("click", () => step(Number(b.dataset.step))));
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, [contenteditable]")) return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});
sync();
`;
