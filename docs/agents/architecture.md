# Revue d'architecture

`improve-codebase-architecture` confie l'exploration du code à un sous-agent, sans borne. Le 2026-11-07, un seul sous-agent lancé sur `apps/site` et ce qui l'alimente a dépassé 200k tokens en six minutes, et il a été arrêté avant d'avoir livré un seul constat. Le cadrage qui suit remplace cette exploration unique.

## Avant de lancer un sous-agent

- **Une friction observée** sert de point de départ : un diff, des fichiers qui changent ensemble dans `git log`, un ticket. Une direction vague, comme « une nouvelle UI », se précise d'abord avec le calligraphe.
- **Un concept du glossaire par sous-agent** : le Mur, le Vis-à-vis, ce que voit le public par rapport au mode admin. Les sous-agents partent en parallèle, avec `effort: "lower"`.
- **Lecture seule dans le checkout principal**, sans worktree : le sous-agent n'écrit rien dans le dépôt.

## Le brief d'un sous-agent

- Il nomme le concept, ses fichiers d'entrée et la question posée.
- Il nomme aussi le fichier sous `$TMPDIR` où chaque constat s'ajoute dès qu'il est établi.
- Les comptes se font avec `git grep`, sans ouvrir les fichiers comptés.
- Le sous-agent rend au plus trois constats, chacun prouvé par `fichier:ligne`, en 400 mots au plus. « Aucune friction sur ce concept » est une réponse complète.
