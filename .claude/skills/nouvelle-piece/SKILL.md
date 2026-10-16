---
name: nouvelle-piece
description: Créer une pièce à partir d'une idée du calligraphe, en l'interrogeant sur le texte, la source, le format et l'intention avant de l'écrire au statut idée. À utiliser quand le calligraphe décrit une nouvelle pièce, un texte qu'il veut écrire, ou demande de créer une pièce.
---

# Nouvelle pièce

Le calligraphe décrit une idée ; la pièce naît au statut `idea` avec une
version initiale `v1`. Rien n'est écrit avant l'étape 3. Le vocabulaire est
celui de `GLOSSARY.md`.

## 1. Interroger

Reprendre ce que le calligraphe a déjà dit, puis demander en un seul message
ce qui manque :

- **Texte** : le titre chinois et l'extrait calligraphié, découpé en colonnes,
  en traditionnel. Un texte donné en simplifié se convertit en traditionnel, à
  faire confirmer caractère par caractère.
- **Source** : auteur, œuvre, dynastie, et le texte intégral quand l'extrait
  n'en est qu'une partie. Ces champs forment l'attribution : le calligraphe la
  dicte, la fournit, ou la fait rédiger par l'agent sous sa direction ; elle
  s'écrit telle qu'il l'arrête.
- **Format** envisagé (`A4 vertical`, `2x7`…) et **date** de la version
  (aujourd'hui par défaut).
- **Intention** : ce qu'il cherche à obtenir, dans ses mots.
- **Traduction** française : la sienne, ou rien. L'agent n'en propose aucune.
- **Projet** : la pièce est-elle conçue pour un projet de `content/projects/` ?
  Par défaut, aucun.

Fini quand texte, source, format et intention ont chacun une réponse, même
« rien ».

## 2. Montrer

Lancer `pnpm piece slug '<titre>'` et montrer le brouillon complet, avec le
slug : il devient l'URL de la pièce et ne changera plus. Attendre l'accord du
calligraphe ; chaque correction repasse par cette étape.

## 3. Écrire

Envoyer le brouillon arrêté, en YAML, sur l'entrée standard. Sa forme est
`PieceDraft` dans `packages/authoring/src/create-piece.ts` :

```sh
pnpm piece creer <<'EOF'
title: 山居秋暝
source:
  author: 王維
  work: 山居秋暝
  dynasty: 唐
  full_text: |
    空山新雨後，天氣晚來秋。
    明月松間照，清泉石上流。
version:
  date: 2026-10-16
  format: A4 vertical
  columns: [空山新雨後, 天氣晚來秋]
  intention: |
    Retrouver l'humidité de la montagne après la pluie.
EOF
```

La commande refuse sans rien écrire un brouillon hors schéma ou un projet
inconnu : corriger avec le calligraphe et relancer. Statut, identifiant `v1` et
`published: false` sont fixés par la commande.

## 4. Valider et commiter

1. `pnpm validate:content`.
2. `git add content/pieces/<slug>/` puis commit, message en français au style
   de `git log` : `Nouvelle pièce : <titre> (<slug>)`, avec l'intention en
   corps.

Fini quand le commit est fait. S'il existe déjà des scans ou des photos de la
pièce, dire au calligraphe de lancer `/scans` pour les rattacher.
