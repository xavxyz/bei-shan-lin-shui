import { MODELS, type Model } from "./models.js";
import { measure, measuresLine, spanLabel, type Measures, type Span } from "./measures.js";
import {
  groupLabel,
  layoutSheet,
  rankSize,
  type PouredText,
  type Sheet,
  type SheetLayout,
} from "./sheets.js";

/** Un format mis en grilles pour être comparé aux autres. */
export type Candidate = {
  /** `A`, `B`… : la clé de `?candidat=`. */
  key: string;
  format: string;
  sheets: Sheet[];
  text: PouredText;
};

type SheetSummary = SheetLayout & { groups: Sheet; characters: number };

export type RenderInput = {
  title: string;
  slug: string;
  version: string;
  origin: string;
  candidates: Candidate[];
  models: Model[];
};

const ORIENTATIONS = { portrait: "portrait", landscape: "paysage" } as const;

/** `A · [(13x7)]` : le nom d'un format candidat, dans la commande et sur la page. */
export const candidateLabel = (candidate: Candidate) => `${candidate.key} · ${candidate.format}`;

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? "s" : ""}`;

/**
 * Les groupes d'une feuille : `10 colonnes` quand tous sont verticaux, sinon
 * chacun avec son orientation, `1x7 vertical, 1x4 horizontal, 1x7 vertical`,
 * et son carreau s'il est plus petit que celui de la feuille,
 * `1x2 vertical, 1x7/2 vertical (38.1 mm)`.
 */
const groupsLine = (groups: Sheet, cell: number) =>
  groups.every((group) => group.orientation === "v" && group.scale === 1)
    ? plural(
        groups.reduce((sum, group) => sum + group.ranks, 0),
        "colonne",
      )
    : groups
        .map((group) =>
          group.scale === 1
            ? groupLabel(group)
            : `${groupLabel(group)} (${(cell / group.scale).toFixed(1)} mm)`,
        )
        .join(", ");

/** La ligne d'une feuille, dans la commande et sous la feuille. */
export const sheetLine = (sheet: SheetSummary, index: number) =>
  `feuille ${index + 1} · ${ORIENTATIONS[sheet.orientation]} · carreau ${sheet.cell.toFixed(1)} mm · ${groupsLine(sheet.groups, sheet.cell)} · ${sheet.characters} caractères`;

/** Ce que la commande dit de chaque format candidat, et ce que la page affiche sous ses feuilles. */
export function describeCandidate(candidate: Candidate): {
  sheets: SheetSummary[];
  notes: string[];
} {
  const sheets = candidate.sheets.map((sheet, index) => ({
    ...layoutSheet(sheet),
    groups: sheet,
    characters: candidate.text.sheets[index]!.flat().join("").length,
  }));
  const { mode, counts, mismatches } = candidate.text;
  const notes: string[] = [];
  if (mode === "columns") {
    notes.push("les colonnes du texte tombent une à une dans celles de la grille");
  } else {
    if (mismatches.length > 0) {
      notes.push(
        `les ${counts.text} colonnes du texte ne tombent pas une à une dans les ${counts.grid} de la grille : réordonner le texte ou le format`,
        ...mismatches.map(
          (m) =>
            `colonne ${m.column} du texte, ${[...m.text].length} caractères (${m.text}), pour une ${m.spec.orientation === "v" ? "colonne" : "ligne"} de ${m.spec.length} cases (feuille ${m.sheet}, groupe ${m.group} · ${groupLabel(m.spec)})`,
        ),
      );
    } else if (counts.text !== counts.grid) {
      notes.push(
        `le texte a ${counts.text} colonnes, la grille ${counts.grid} : elles ne tombent pas une à une, reprendre le texte ou le format`,
      );
    }
    notes.push(
      "le texte coule dans les cases, dans l'ordre des groupes : une colonne peut couper un vers, et le contresens être fructueux ou non",
    );
  }
  if (candidate.text.overflow) {
    notes.push(
      `ne tient pas : ${[...candidate.text.overflow].length} caractères (${candidate.text.overflow})`,
    );
  }
  if (candidate.text.empty > 0) notes.push(`${candidate.text.empty} cases restent vides`);
  return { sheets, notes };
}

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const mm = (value: number) => Number(value.toFixed(2));

const line = (x1: number, y1: number, x2: number, y2: number) =>
  `<line x1="${mm(x1)}" y1="${mm(y1)}" x2="${mm(x2)}" y2="${mm(y2)}"/>`;

/**
 * Les cotes dans les marges : la chaîne du haut, de gauche à droite ; celle de
 * droite, de haut en bas ; et chaque groupe moins haut, le long de son bord gauche.
 */
function renderMeasures({ block, across, down, shorter }: Measures): string {
  const marks: string[] = [];
  const TICK = 1.2;
  const horizontal = (y: number, span: Span) => {
    const { from, to } = span;
    marks.push(
      line(from, y, to, y),
      line(from, y - TICK, from, y + TICK),
      line(to, y - TICK, to, y + TICK),
      `<text x="${mm((from + to) / 2)}" y="${mm(y - 1)}">${escape(spanLabel(span))}</text>`,
    );
  };
  const vertical = (x: number, span: Span) => {
    const { from, to } = span;
    const y = (from + to) / 2;
    marks.push(
      line(x, from, x, to),
      line(x - TICK, from, x + TICK, from),
      line(x - TICK, to, x + TICK, to),
      `<text x="${mm(x - 1)}" y="${mm(y)}" transform="rotate(-90 ${mm(x - 1)} ${mm(y)})">${escape(spanLabel(span))}</text>`,
    );
  };
  for (const span of across) horizontal(block.top - 6, span);
  for (const span of down) vertical(block.right + 6, span);
  for (const { edge, span } of shorter) vertical(edge - 2, span);
  return `<g class="cotes" font-size="2.6">${marks.join("")}</g>`;
}

/**
 * Le 九宮格 : chaque carreau partagé en trois dans les deux sens, pour situer
 * les traits d'un caractère.
 */
function renderNineSquares(layout: SheetSummary): string {
  const strokes: string[] = [];
  for (const box of layout.ranks) {
    const { cell } = box;
    const vertical = box.orientation === "v";
    const { width: w, height: h } = rankSize(box);
    for (let k = 0; k < box.length; k++) {
      for (const third of [1, 2]) {
        const offset = (k + third / 3) * cell;
        strokes.push(
          vertical
            ? line(box.x, box.y + offset, box.x + w, box.y + offset)
            : line(box.x + offset, box.y, box.x + offset, box.y + h),
        );
      }
    }
    for (const third of [1, 2]) {
      const offset = (third / 3) * cell;
      strokes.push(
        vertical
          ? line(box.x + offset, box.y, box.x + offset, box.y + h)
          : line(box.x, box.y + offset, box.x + w, box.y + offset),
      );
    }
  }
  return `<g class="jiugong">${strokes.join("")}</g>`;
}

/**
 * Un rang se lit de haut en bas s'il est une colonne, de droite à gauche s'il
 * est une ligne : la case `k` d'une ligne est la `k`-ième à partir de son
 * bord droit.
 */
function renderSheet(layout: SheetSummary, texts: string[], index: number): string {
  const { width, height } = layout;
  const strokes: string[] = [];
  /** Les caractères du modèle par carreau : chacun à 0,78 du carreau de son rang. */
  const glyphs = new Map<number, string[]>();
  layout.ranks.forEach((box, r) => {
    const { cell } = box;
    const vertical = box.orientation === "v";
    const { width: w, height: h } = rankSize(box);
    strokes.push(`<rect x="${mm(box.x)}" y="${mm(box.y)}" width="${mm(w)}" height="${mm(h)}"/>`);
    for (let k = 1; k < box.length; k++) {
      if (vertical) {
        const y = box.y + k * cell;
        strokes.push(line(box.x, y, box.x + cell, y));
      } else {
        const x = box.x + k * cell;
        strokes.push(line(x, box.y, x, box.y + cell));
      }
    }
    [...(texts[r] ?? "")].forEach((character, k) => {
      const [x, y] = vertical
        ? [box.x + cell / 2, box.y + (k + 0.5) * cell]
        : [box.x + w - (k + 0.5) * cell, box.y + cell / 2];
      const text = `<text x="${mm(x)}" y="${mm(y)}">${escape(character)}</text>`;
      glyphs.set(cell, [...(glyphs.get(cell) ?? []), text]);
    });
  });
  const characters = [...glyphs]
    .map(
      ([rankCell, glyphsOfCell]) =>
        `<g class="characters" font-size="${mm(rankCell * 0.78)}">${glyphsOfCell.join("")}</g>`,
    )
    .join("");
  const band = layout.inscription;
  const measures = measure(layout);
  return `
    <figure class="sheet ${layout.orientation}">
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">
        <text class="inscription" x="${mm(band.x + band.width / 2)}" y="${mm(band.y + 4)}" font-size="5">落款</text>
        ${renderNineSquares(layout)}
        <g class="grid">${strokes.join("")}</g>
        ${renderMeasures(measures)}
        ${characters}
      </svg>
      <figcaption>${sheetLine(layout, index)}<br><span class="measures">${escape(measuresLine(layout, measures))}</span></figcaption>
    </figure>`;
}

/**
 * Une page HTML autonome : chaque format candidat est une suite de feuilles
 * A4 à l'échelle réelle, et seul celui qui est affiché s'imprime, une feuille
 * par page.
 */
export function renderPage(input: RenderInput): string {
  const sections = input.candidates.map((candidate) => {
    const { sheets, notes } = describeCandidate(candidate);
    const columns = candidate.text.sheets.map((sheet) => sheet.flat());
    const label = escape(candidateLabel(candidate));
    return `
  <section class="candidate" data-candidate="${candidate.key}" data-label="${label}" hidden>
    <div class="sheets">${sheets.map((sheet, i) => renderSheet(sheet, columns[i]!, i)).join("")}
    </div>
    <aside class="state">
      <strong>${label}</strong> — ${sheets.length} feuille${sheets.length > 1 ? "s" : ""}
      <ul>${notes.map((note) => `<li>${escape(note)}</li>`).join("")}</ul>
    </aside>
  </section>`;
  });

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(`${input.title} — Grilles`)}</title>
<style>${modelStyle(input.models)}${STYLE}</style>
</head>
<body data-characters="affiches" data-model="${MODELS[0].key}">
  <header class="controls">
    <h1>${escape(input.title)}</h1>
    <p>${escape(`${input.slug} · version ${input.version} · ${input.origin}`)}</p>
    <fieldset>
      <legend>Caractères</legend>
      <label><input type="radio" name="characters" value="affiches" checked> affichés</label>
      <label><input type="radio" name="characters" value="calque"> en calque</label>
      <label><input type="radio" name="characters" value="masques"> masqués</label>
    </fieldset>
    <fieldset>
      <legend>Modèle</legend>${input.models
        .map(
          (model, i) =>
            `\n      <label><input type="radio" name="model" value="${model.key}"${i === 0 ? " checked" : ""}> ${escape(model.label)}</label>`,
        )
        .join("")}
    </fieldset>${input.models
      .map(
        (model) =>
          `\n    <ul class="model-notes" data-model="${model.key}">${model.notes.map((note) => `<li>${escape(note)}</li>`).join("")}</ul>`,
      )
      .join("")}
    <fieldset>
      <legend>Repères</legend>
      <label><input type="checkbox" name="marks" value="jiugong"> 九宮格</label>
      <label><input type="checkbox" name="marks" value="cotes"> cotes</label>
    </fieldset>
    <p class="hint">Imprimer : une feuille par page, A4, échelle 100 %, marges « aucune ». Les caractères et les repères s'impriment comme ils sont affichés.</p>
  </header>
  <main>${sections.join("")}
  </main>
  <nav class="switcher" aria-label="Formats candidats">
    <button type="button" data-step="-1" aria-label="Format candidat précédent">←</button>
    <span class="switcher__label"></span>
    <button type="button" data-step="1" aria-label="Format candidat suivant">→</button>
  </nav>
<script>${SCRIPT}</script>
</body>
</html>
`;
}

/**
 * Chaque 體 embarque sa police réduite aux caractères de la pièce ; un
 * caractère qui lui manque retombe sur le premier 體, puis sur les polices du
 * système.
 */
const modelStyle = (models: Model[]) =>
  models
    .map(
      (model) =>
        `\n@font-face { font-family: "modele-${model.key}"; src: url(data:font/woff2;base64,${model.font}) format("woff2"); }` +
        `\nbody[data-model="${model.key}"] .characters text, body[data-model="${model.key}"] .inscription { font-family: "modele-${model.key}", "modele-${MODELS[0].key}", "Kaiti TC", "Songti TC", serif; }`,
    )
    .join("");

const STYLE = `
@page { size: A4 portrait; margin: 0; }
@page landscape { size: A4 landscape; margin: 0; }
body { margin: 0; padding: 24px 24px 120px; background: #e8e4dc; color: #23201c;
  font-family: "Iowan Old Style", Palatino, Georgia, serif; }
.controls { max-width: 900px; margin: 0 auto 24px; }
.controls h1 { margin: 0; font-family: "modele-kai", serif; font-weight: 400; }
.controls p { margin: 4px 0; color: #6d675e; font-size: 14px; }
.controls fieldset { display: inline-flex; gap: 16px; border: 1px solid #c9c2b4; border-radius: 6px; margin: 8px 0; }
.sheets { display: flex; flex-direction: row-reverse; flex-wrap: wrap; justify-content: center; gap: 24px; align-items: flex-start; }
.sheet { margin: 0; }
.sheet svg { display: block; background: #fff; box-shadow: 0 2px 10px rgb(0 0 0 / 0.18); }
.grid { fill: none; stroke: #b9b2a4; stroke-width: 0.3; }
.characters text, .inscription { text-anchor: middle; dominant-baseline: central; fill: #23201c; }
.inscription { fill: #8a2c2c; opacity: 0.5; writing-mode: vertical-rl; dominant-baseline: auto; }
body[data-characters="calque"] .characters { opacity: 0.12; }
body[data-characters="masques"] .characters { display: none; }
.jiugong { fill: none; stroke: #c98f8f; stroke-width: 0.2; stroke-dasharray: 1 1; }
.cotes { stroke: #2c5d8a; stroke-width: 0.2; }
.cotes text { stroke: none; fill: #2c5d8a; text-anchor: middle; font-family: system-ui, sans-serif; }
body:not([data-jiugong]) .jiugong, body:not([data-cotes]) .cotes, body:not([data-cotes]) .measures { display: none; }
.measures { color: #2c5d8a; }
.model-notes { margin: 4px 0; color: #8a2c2c; font-size: 14px; }
.model-notes:empty { display: none; }
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
  .sheet.landscape { page: landscape; }
  .sheet svg { box-shadow: none; }
}
`;

const SCRIPT = `
const sections = [...document.querySelectorAll(".candidate")];
const keys = sections.map((s) => s.dataset.candidate);
const label = document.querySelector(".switcher__label");
const params = new URLSearchParams(location.search);
let current = keys.includes(params.get("candidat")) ? params.get("candidat") : keys[0];

function sync() {
  for (const s of sections) s.hidden = s.dataset.candidate !== current;
  label.textContent = sections.find((s) => s.dataset.candidate === current).dataset.label;
  const url = new URL(location.href);
  url.searchParams.set("candidat", current);
  url.searchParams.set("caracteres", document.body.dataset.characters);
  url.searchParams.set("modele", document.body.dataset.model);
  for (const mark of marks) {
    if (mark in document.body.dataset) url.searchParams.set(mark, "1");
    else url.searchParams.delete(mark);
  }
  history.replaceState(null, "", url);
}
function step(d) {
  current = keys[(keys.indexOf(current) + d + keys.length) % keys.length];
  sync();
}
const modes = ["affiches", "calque", "masques"];
const models = [...document.querySelectorAll('input[name="model"]')].map((input) => input.value);
const notes = [...document.querySelectorAll(".model-notes")];
function setModel(model) {
  document.body.dataset.model = model;
  document.querySelector('input[name="model"][value="' + model + '"]').checked = true;
  for (const list of notes) list.hidden = list.dataset.model !== model;
}
setModel(models.includes(params.get("modele")) ? params.get("modele") : models[0]);
document.querySelectorAll('input[name="model"]').forEach((input) =>
  input.addEventListener("change", () => { setModel(input.value); sync(); }));
function setCharacters(mode) {
  document.body.dataset.characters = mode;
  document.querySelector('input[name="characters"][value="' + mode + '"]').checked = true;
}
setCharacters(modes.includes(params.get("caracteres")) ? params.get("caracteres") : "affiches");
document.querySelectorAll('input[name="characters"]').forEach((input) =>
  input.addEventListener("change", () => { setCharacters(input.value); sync(); }));
const marks = ["jiugong", "cotes"];
function setMark(mark, on) {
  if (on) document.body.dataset[mark] = "";
  else delete document.body.dataset[mark];
  document.querySelector('input[name="marks"][value="' + mark + '"]').checked = on;
}
for (const mark of marks) setMark(mark, params.get(mark) === "1");
document.querySelectorAll('input[name="marks"]').forEach((input) =>
  input.addEventListener("change", () => { setMark(input.value, input.checked); sync(); }));
document.querySelectorAll(".switcher button").forEach((b) =>
  b.addEventListener("click", () => step(Number(b.dataset.step))));
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea, [contenteditable]")) return;
  if (e.key === "ArrowLeft") step(-1);
  if (e.key === "ArrowRight") step(1);
});
sync();
`;
