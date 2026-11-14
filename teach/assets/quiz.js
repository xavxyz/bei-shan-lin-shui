// Le quiz commun des leçons : un rappel de mémoire, avec un retour immédiat.
//
// Dans la leçon :
//   <div class="quiz" data-quiz='[{"q":"…","choices":["…","…","…"],"answer":1,"why":"…"}]'></div>
//   <script src="../assets/quiz.js"></script>
//
// `answer` est l'indice du bon choix ; `why` s'affiche après la réponse, juste ou non.
// Les choix ont la même longueur, et la bonne réponse change de place d'une question à l'autre.

(function () {
  const style = document.createElement("style");
  style.textContent = `
    .quiz { margin: 1.5rem 0; }
    .quiz .item { margin: 1.4rem 0; }
    .quiz .q { margin: 0 0 0.5rem; }
    .quiz button {
      display: block; width: 100%; text-align: left; margin: 0.3rem 0; padding: 0.5rem 0.8rem;
      font: inherit; font-size: 0.95rem; color: var(--ink); background: transparent;
      border: 1px solid var(--rule); cursor: pointer;
    }
    .quiz button:hover:not(:disabled) { border-color: var(--accent); }
    .quiz button:disabled { cursor: default; }
    .quiz button.right { border-color: var(--good); color: var(--good); }
    .quiz button.wrong { border-color: var(--accent); color: var(--accent); text-decoration: line-through; }
    .quiz .why { font-size: 0.9rem; color: var(--muted); margin: 0.5rem 0 0; }
    .quiz .score { font-style: italic; color: var(--muted); }
  `;
  document.head.appendChild(style);

  for (const root of document.querySelectorAll(".quiz[data-quiz]")) {
    const items = JSON.parse(root.dataset.quiz);
    let answered = 0;
    let right = 0;
    const score = document.createElement("p");
    score.className = "score";

    items.forEach((item, n) => {
      const box = document.createElement("div");
      box.className = "item";
      const q = document.createElement("p");
      q.className = "q";
      q.innerHTML = `${n + 1}. ${item.q}`;
      box.appendChild(q);

      const buttons = item.choices.map((choice, i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.innerHTML = choice;
        b.addEventListener("click", () => {
          buttons.forEach((other) => (other.disabled = true));
          buttons[item.answer].classList.add("right");
          if (i !== item.answer) b.classList.add("wrong");
          else right++;
          answered++;
          const why = document.createElement("p");
          why.className = "why";
          why.innerHTML = item.why;
          box.appendChild(why);
          if (answered === items.length) score.textContent = `${right} sur ${items.length}.`;
        });
        box.appendChild(b);
        return b;
      });
      root.appendChild(box);
    });
    root.appendChild(score);
  }
})();
