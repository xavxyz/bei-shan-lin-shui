---
name: nouvelle-piece
description: Créer une pièce à partir d'une idée du calligraphe, en l'interrogeant sur le texte, la source, le format, l'intention, la glose et la traduction avant de l'écrire au statut idée. À utiliser quand le calligraphe décrit une nouvelle pièce, un texte qu'il veut écrire, ou demande de créer une pièce.
---

# Nouvelle pièce

Le calligraphe décrit une idée ; la pièce naît au statut `idea` avec une version initiale `v1`. Rien n'est écrit avant l'étape 3. Le vocabulaire est celui de `GLOSSARY.md`. Chaque proposition au calligraphe — conversion, attribution, colonnes, brouillon — suit `docs/agents/propositions.md`.

## 1. Interroger

Reprendre ce que le calligraphe a déjà dit, puis demander en un seul message ce qui manque :

- **Texte** : le titre chinois et l'extrait calligraphié, découpé en colonnes, en traditionnel. Un texte donné en simplifié se convertit en traditionnel, à faire confirmer caractère par caractère.
- **Source** : auteur, œuvre, dynastie, et le texte intégral quand l'extrait n'en est qu'une partie. Ces champs forment l'attribution : le calligraphe la dicte, la fournit, ou la fait rédiger par l'agent sous sa direction ; elle s'écrit telle qu'il l'arrête. Rédigée par l'agent, elle part d'une source primaire, cherchée selon `docs/sources/README.md` et citée en commentaire.
- **Format** envisagé, dans la notation de **Format** (`GLOSSARY.md`) : `[(2x5)]`, `[(1x2, 1x7/2)]`… ; `à préciser` tant que le calligraphe ne le sait pas. `pnpm piece` refuse tout autre format et dit où il bute : le réécrire avec lui. **Date** de la version : aujourd'hui par défaut.
- **Intention** : ce qu'il cherche à obtenir, dans ses mots.
- **Glose** : la courte phrase française qui dit de quoi parle la pièce (**Glose**, `GLOSSARY.md`), dans ses mots, ou rien pour l'instant.
- **Traduction**, une fois les colonnes arrêtées : une ligne française par colonne, 款 compris (**Traduction**, `GLOSSARY.md`), ou rien pour l'instant. La demander colonne par colonne, chaque colonne en regard de sa ligne :

  ```
  空山新雨後 → ?
  天氣晚來秋 → ?
  ```

  Glose et traduction sont celles du calligraphe : l'agent n'en propose aucune de mémoire (ADR 0004). La traduction du texte de référence (`docs/sources/`) peut se montrer en regard, comme toute proposition ; la ligne écrite est celle que le calligraphe arrête.

- **Projet** : la pièce est-elle conçue pour un projet de `content/projects/` ? Par défaut, aucun.
- **Publication** : « Publier la pièce : oui / non ? ». Pas de réponse par défaut : sans un oui ou un non explicite, redemander.

Fini quand texte, source, format, intention, glose et traduction ont chacun une réponse, même « rien », et que la publication a reçu un oui ou un non.

## 2. Montrer

Lancer `pnpm piece slug '<titre>'` et montrer le brouillon complet, avec le slug : il devient l'URL de la pièce et ne changera plus. Attendre l'accord du calligraphe ; chaque correction repasse par cette étape.

## 3. Écrire

Envoyer le brouillon arrêté, en YAML, sur l'entrée standard. Sa forme est `PieceDraft` dans `packages/authoring/src/drafts.ts`, où `published` porte la réponse du calligraphe :

```sh
pnpm piece creer <<'EOF'
title: 山居秋暝
gloss: <glose du calligraphe>
source:
  author: 王維
  work: 山居秋暝
  dynasty: 唐
  full_text: |
    空山新雨後，天氣晚來秋。
    明月松間照，清泉石上流。
version:
  date: 2026-10-16
  format: "[(2x5)]" # entre guillemets : sans eux, YAML y lit une liste
  columns: [空山新雨後, 天氣晚來秋]
  intention: |
    Retrouver l'humidité de la montagne après la pluie.
  translation: # une ligne par colonne, dans l'ordre des colonnes
    - <ligne du calligraphe pour 空山新雨後>
    - <ligne du calligraphe pour 天氣晚來秋>
published: false
EOF
```

`gloss` et `translation` s'omettent quand la réponse est « rien ». La commande refuse sans rien écrire un brouillon hors schéma, un projet inconnu, une traduction qui n'a pas une ligne par colonne, ou un brouillon qui ne dit pas si la pièce est publiée : corriger avec le calligraphe et relancer. Statut `idea` et identifiant `v1` sont fixés par la commande ; `published` s'écrit tel que le brouillon le donne.

## 4. Valider et commiter

1. `pnpm validate:content`.
2. `git add content/pieces/<slug>/` puis commit, message en français au style de `git log` : `Nouvelle pièce : <titre> (<slug>), publiée` ou `Nouvelle pièce : <titre> (<slug>), non publiée`, avec l'intention en corps.

Fini quand le commit est fait. Une glose ou une traduction restée « rien » s'ajoutera plus tard par la skill `version-ou-variation`. S'il existe déjà des scans ou des photos de la pièce, dire au calligraphe de lancer `/scans` pour les rattacher.
