// Le rapporteur : mesure l'inclinaison des traits sur la photo ou le scan d'une séance.
//
// Dans la leçon :
//   <div class="rapporteur" data-axis="vertical" data-key="verticaux"></div>
//   <script src="../assets/rapporteur.js"></script>
//
// data-axis : "vertical" (écart à la verticale, positif si le bas part vers la droite)
//             ou "horizontal" (montée, positive si le trait monte vers la droite).
// data-key  : le nom du carnet où chaque séance enregistrée est gardée (localStorage du navigateur),
//             partagé par toutes les leçons qui mesurent la même chose.
//
// On clique le départ puis l'arrivée de l'axe de chaque trait. Si la photo est de travers,
// cocher « référence » et mesurer d'abord une ligne de la grille ou le bord du papier :
// son inclinaison est retranchée de toutes les autres.

(function () {
  const style = document.createElement("style");
  style.textContent = `
    .rapporteur { margin: 1.5rem 0; font-size: 0.95rem; }
    .rapporteur .bar { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; align-items: center; margin-bottom: 0.6rem; }
    .rapporteur button { font: inherit; font-size: 0.9rem; padding: 0.3rem 0.7rem; background: transparent; color: var(--ink); border: 1px solid var(--rule); cursor: pointer; }
    .rapporteur button:hover { border-color: var(--accent); }
    .rapporteur canvas { display: block; max-width: 100%; border: 1px solid var(--rule); cursor: crosshair; background: white; }
    .rapporteur .result { font-style: italic; margin: 0.6rem 0; }
    .rapporteur .result strong { font-style: normal; color: var(--accent); font-weight: normal; }
    .rapporteur table { font-size: 0.85rem; }
    .rapporteur .hint { color: var(--muted); font-size: 0.85rem; }
  `;
  document.head.appendChild(style);

  const deg = (r) => (r * 180) / Math.PI;
  const fmt = (a) => `${a >= 0 ? "+" : "−"}${Math.abs(a).toFixed(1)}°`;

  // L'inclinaison d'un segment selon l'axe mesuré, indépendante du sens du clic.
  function angle(axis, [a, b]) {
    if (axis === "vertical") {
      const [top, bottom] = a.y <= b.y ? [a, b] : [b, a];
      return deg(Math.atan2(bottom.x - top.x, bottom.y - top.y));
    }
    const [left, right] = a.x <= b.x ? [a, b] : [b, a];
    return deg(Math.atan2(left.y - right.y, right.x - left.x));
  }

  for (const root of document.querySelectorAll(".rapporteur")) {
    const axis = root.dataset.axis === "horizontal" ? "horizontal" : "vertical";
    const key = `teach-rapporteur-${root.dataset.key || axis}`;
    const sense = axis === "vertical" ? "écart à la verticale" : "montée vers la droite";

    root.innerHTML = `
      <div class="bar">
        <label><input type="file" accept="image/*"> Photo ou scan de la séance</label>
        <label><input type="checkbox" class="ref"> Le premier segment est une référence (grille, bord du papier)</label>
      </div>
      <canvas width="600" height="300"></canvas>
      <p class="hint">Clique le départ puis l'arrivée de l'axe de chaque trait.</p>
      <div class="bar">
        <button type="button" class="undo">Annuler le dernier</button>
        <button type="button" class="clear">Tout effacer</button>
        <button type="button" class="save">Enregistrer la séance</button>
      </div>
      <p class="result"></p>
      <table class="log"></table>
    `;

    const canvas = root.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const result = root.querySelector(".result");
    const log = root.querySelector(".log");
    const refBox = root.querySelector(".ref");
    let image = null;
    let segments = [];
    let pending = null;

    function corrected() {
      const raw = segments.map((s) => angle(axis, s));
      if (!refBox.checked || raw.length === 0) return { ref: null, values: raw };
      const [ref, ...rest] = raw;
      return { ref, values: rest.map((a) => a - ref) };
    }

    function stats(values) {
      const n = values.length;
      const mean = values.reduce((s, a) => s + a, 0) / n;
      const meanAbs = values.reduce((s, a) => s + Math.abs(a), 0) / n;
      const worst = values.reduce((w, a) => (Math.abs(a) > Math.abs(w) ? a : w), 0);
      return { n, mean, meanAbs, worst };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (image) ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const { values } = corrected();
      const offset = refBox.checked ? 1 : 0;
      segments.forEach((s, i) => {
        const isRef = refBox.checked && i === 0;
        ctx.strokeStyle = isRef ? "#6d675e" : "#8a2c2c";
        ctx.lineWidth = 2;
        ctx.setLineDash(isRef ? [6, 4] : []);
        ctx.beginPath();
        ctx.moveTo(s[0].x, s[0].y);
        ctx.lineTo(s[1].x, s[1].y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "14px Georgia, serif";
        const label = isRef ? "réf." : fmt(values[i - offset]);
        ctx.fillText(label, Math.max(s[0].x, s[1].x) + 6, (s[0].y + s[1].y) / 2);
      });
      if (pending) {
        ctx.fillStyle = "#8a2c2c";
        ctx.beginPath();
        ctx.arc(pending.x, pending.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      }
      if (values.length === 0) {
        result.textContent = "";
        return;
      }
      const s = stats(values);
      result.innerHTML = `${s.n} trait${s.n > 1 ? "s" : ""} — ${sense} : moyenne <strong>${fmt(s.mean)}</strong>, écart moyen <strong>${s.meanAbs.toFixed(1)}°</strong>, le plus éloigné <strong>${fmt(s.worst)}</strong>.`;
    }

    function renderLog() {
      const sessions = JSON.parse(localStorage.getItem(key) || "[]");
      if (sessions.length === 0) {
        log.innerHTML = "";
        return;
      }
      log.innerHTML =
        `<tr><th>Séance</th><th>Traits</th><th>Moyenne</th><th>Écart moyen</th><th>Le plus éloigné</th></tr>` +
        sessions
          .slice(-14)
          .map(
            (s) =>
              `<tr><td>${s.date}</td><td>${s.n}</td><td>${fmt(s.mean)}</td><td>${s.meanAbs.toFixed(1)}°</td><td>${fmt(s.worst)}</td></tr>`,
          )
          .join("");
    }

    root.querySelector("input[type=file]").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const width = Math.min(root.clientWidth || 600, 900);
        canvas.width = width;
        canvas.height = Math.round((img.height / img.width) * width);
        image = img;
        segments = [];
        pending = null;
        draw();
      };
      img.src = URL.createObjectURL(file);
    });

    canvas.addEventListener("click", (e) => {
      const box = canvas.getBoundingClientRect();
      const point = {
        x: ((e.clientX - box.left) * canvas.width) / box.width,
        y: ((e.clientY - box.top) * canvas.height) / box.height,
      };
      if (pending) {
        segments.push([pending, point]);
        pending = null;
      } else pending = point;
      draw();
    });

    refBox.addEventListener("change", draw);
    root.querySelector(".undo").addEventListener("click", () => {
      if (pending) pending = null;
      else segments.pop();
      draw();
    });
    root.querySelector(".clear").addEventListener("click", () => {
      segments = [];
      pending = null;
      draw();
    });
    root.querySelector(".save").addEventListener("click", () => {
      const { values } = corrected();
      if (values.length === 0) return;
      const sessions = JSON.parse(localStorage.getItem(key) || "[]");
      sessions.push({ date: new Date().toISOString().slice(0, 10), ...stats(values) });
      localStorage.setItem(key, JSON.stringify(sessions));
      renderLog();
    });

    renderLog();
    draw();
  }
})();
