---
name: version-ou-variation
description: Ajouter à une pièce existante une nouvelle version (la pièce a été refaite) ou une variation (écrite dans un autre style), en demandant toujours laquelle. À utiliser quand le calligraphe a refait une pièce, l'a écrite dans un autre style, veut reprendre une pièce en veille, ou compléter la glose ou la traduction d'une pièce.
---

# Version ou variation

Le contenu est append-only : on ajoute une version ou une variation, rien n'est écrasé. La glose d'une pièce et la traduction d'une version se complètent à part, et ne se corrigent que sur demande du calligraphe. Lire **Version**, **Variation**, **Glose** et **Traduction** dans `GLOSSARY.md`.

Glose et traduction sont celles du calligraphe : l'agent n'en propose aucune de mémoire (ADR 0004). La traduction du texte de référence (`docs/sources/`) peut se montrer en regard, comme toute proposition ; la ligne écrite est celle que le calligraphe arrête.

## 1. Retrouver la pièce

Chercher la pièce dans `content/pieces/` (slug, titre, ou deux ou trois caractères avec `grep`) et lire son `piece.md`. Résumer au calligraphe son statut, sa glose, ses versions avec leur traduction, et leurs variations, en disant ce qui manque ; styles et statuts en français (`SCRIPT_LABELS`, `PIECE_STATUS_LABELS`, `VARIATION_STATUS_LABELS` de `packages/schema/src/vocabulary.ts`).

Fini quand le calligraphe a confirmé la pièce. S'il vient seulement compléter la glose ou une traduction, passer à l'étape 3, cas **Compléter**.

## 2. Demander : refaite, ou autre style ?

Poser la question telle quelle, même quand la réponse semble évidente :

> As-tu refait la pièce, ou l'as-tu écrite dans un autre style ?

- **Refaite** : une nouvelle réalisation, c'est une nouvelle **version**. Demander sa date, son format (dans la notation de **Format**, `GLOSSARY.md`, ou `à préciser`), ses colonnes et son intention, et les styles dans lesquels elle est écrite : chacun en est une variation. Puis sa **traduction**, colonne par colonne, 款 compris, ou rien pour l'instant : la nouvelle version a la sienne, redemandée à chaque fois. Quand ses colonnes sont celles de la version précédente, montrer l'ancienne traduction ligne par ligne en regard, que le calligraphe reprend ou corrige :

  ```
  空山新雨後 → ?   (v1 : <ligne de v1>)
  天氣晚來秋 → ?   (v1 : <ligne de v1>)
  ```

- **Autre style** : une **variation** d'une version existante. Demander laquelle (la dernière par défaut), le style, le statut de la variation et le commentaire personnel.

Des colonnes prises ailleurs dans le texte de la pièce se lisent dans son texte de référence (`docs/sources/`), sinon se cherchent dans une source primaire selon `docs/sources/README.md`. Chaque proposition au calligraphe suit `docs/agents/propositions.md`.

Styles et statuts de variation : `SCRIPTS` et `VARIATION_STATUSES` de `packages/schema/src/vocabulary.ts`. Les identifiants (`v2`, `v1b`…) sont attribués par la commande.

**Projet** : si la pièce est reprise pour un projet auquel elle n'appartient pas, demander : « La reprends-tu pour ce projet ? ». Seul un oui la rattache ; rapprocher après coup une pièce écrite sans lui n'est pas un rattachement (**Projet** dans `GLOSSARY.md`).

Si la pièce n'a pas encore de glose, la demander aussi, ou rien pour l'instant.

Fini quand le calligraphe a choisi version ou variation et que chaque champ a une réponse.

## 3. Montrer, puis écrire

Montrer le YAML qui sera ajouté et attendre l'accord. Puis, selon le cas :

```sh
pnpm piece version <slug> <<'EOF'
date: 2026-10-16
format: "[(2x5)]" # entre guillemets : sans eux, YAML y lit une liste
columns: [空山新雨後, 天氣晚來秋]
intention: |
  Plus grand, sur papier de riz.
translation: # une ligne par colonne ; omise si « rien »
  - <ligne du calligraphe pour 空山新雨後>
  - <ligne du calligraphe pour 天氣晚來秋>
variations:
  - script: xingshu
    status: kept
EOF

pnpm piece variation <slug> <version> <<'EOF'
script: kaishu
status: tried
personal_note: |
  Le même texte, posé, pour comparer.
EOF

pnpm piece rattacher <slug> <projet>    # après le oui du calligraphe
```

**Compléter** : la glose de la pièce ou d'un de ses projets, ou la traduction d'une version existante, demandée colonne par colonne comme ci-dessus. Chaque commande ajoute le champ s'il manque, le remplace sinon, sans toucher au reste du fichier :

```sh
pnpm piece glose <slug> <<'EOF'
gloss: <glose du calligraphe>
EOF

pnpm piece traduction <slug> <version> <<'EOF'
translation:
  - <ligne du calligraphe pour la colonne 1>
  - <ligne du calligraphe pour la colonne 2>
EOF

pnpm piece glose-projet <projet> <<'EOF'
gloss: <glose du calligraphe>
EOF
```

Les formes sont `NewVersion` et `VariationDraft` dans `packages/authoring/src/drafts.ts`. Une traduction qui n'a pas une ligne par colonne est refusée. Une commande refusée n'a rien écrit : corriger avec le calligraphe et relancer.

## 4. Statuts

Ajouter une version ou une variation ne change aucun statut, et une variation `kept` n'en entraîne aucun autre. Si l'ajout laisse penser que le statut de la pièce ou d'une autre variation devrait bouger, le proposer et n'écrire que sur un oui explicite :

```sh
pnpm piece statut <slug> <statut>                        # PIECE_STATUSES
pnpm piece statut-variation <slug> <variation> <statut>  # VARIATION_STATUSES
```

Sans réponse, rien ne bouge.

## 5. Valider et commiter

1. `pnpm validate:content`.
2. `git add content/pieces/<slug>/` puis commit, message en français au style de `git log`, qui dit ce qui a été ajouté et chaque statut changé : `<titre> : version v2, en courant`, `<titre> : variation v1b en régulier` ou `<titre> : glose, traduction de v1`. Une glose de projet s'ajoute avec `git add content/projects/<projet>.yaml`.

Fini quand le commit est fait. S'il y a des scans ou des photos de la nouvelle réalisation, dire au calligraphe de lancer `/scans`.
