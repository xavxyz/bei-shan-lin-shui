---
name: version-ou-variation
description: Ajouter à une pièce existante une nouvelle version (la pièce a été refaite) ou une variation (écrite dans un autre style), en demandant toujours laquelle. À utiliser quand le calligraphe a refait une pièce, l'a écrite dans un autre style, ou veut reprendre une pièce en veille.
---

# Version ou variation

Le contenu est append-only : on ajoute une version ou une variation, rien n'est écrasé. Lire **Version** et **Variation** dans `GLOSSARY.md`.

## 1. Retrouver la pièce

Chercher la pièce dans `content/pieces/` (slug, titre, ou deux ou trois caractères avec `grep`) et lire son `piece.md`. Résumer au calligraphe son statut, ses versions et leurs variations, avec styles et statuts en français (`SCRIPT_LABELS`, `PIECE_STATUS_LABELS`, `VARIATION_STATUS_LABELS` de `packages/schema/src/vocabulary.ts`).

Fini quand le calligraphe a confirmé la pièce.

## 2. Demander : refaite, ou autre style ?

Poser la question telle quelle, même quand la réponse semble évidente :

> As-tu refait la pièce, ou l'as-tu écrite dans un autre style ?

- **Refaite** : une nouvelle réalisation, c'est une nouvelle **version**. Demander sa date, son format (dans la notation de **Format**, `GLOSSARY.md`, ou `à préciser`), ses colonnes et son intention, et les styles dans lesquels elle est écrite : chacun en est une variation.
- **Autre style** : une **variation** d'une version existante. Demander laquelle (la dernière par défaut), le style, le statut de la variation et le commentaire personnel.

Des colonnes prises ailleurs dans le texte de la pièce se lisent dans son texte de référence (`docs/sources/`), sinon se cherchent dans une source primaire selon `docs/sources/README.md`. Chaque proposition au calligraphe suit `docs/agents/propositions.md`.

Styles et statuts de variation : `SCRIPTS` et `VARIATION_STATUSES` de `packages/schema/src/vocabulary.ts`. Les identifiants (`v2`, `v1b`…) sont attribués par la commande.

**Projet** : si la pièce est reprise pour un projet auquel elle n'appartient pas, demander : « La reprends-tu pour ce projet ? ». Seul un oui la rattache ; rapprocher après coup une pièce écrite sans lui n'est pas un rattachement (**Projet** dans `GLOSSARY.md`).

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

Les formes sont `NewVersion` et `VariationDraft` dans `packages/authoring/src/add-version.ts`. Une commande refusée n'a rien écrit : corriger avec le calligraphe et relancer.

## 4. Statuts

Ajouter une version ou une variation ne change aucun statut, et une variation `kept` n'en entraîne aucun autre. Si l'ajout laisse penser que le statut de la pièce ou d'une autre variation devrait bouger, le proposer et n'écrire que sur un oui explicite :

```sh
pnpm piece statut <slug> <statut>                        # PIECE_STATUSES
pnpm piece statut-variation <slug> <variation> <statut>  # VARIATION_STATUSES
```

Sans réponse, rien ne bouge.

## 5. Valider et commiter

1. `pnpm validate:content`.
2. `git add content/pieces/<slug>/` puis commit, message en français au style de `git log`, qui dit ce qui a été ajouté et chaque statut changé : `<titre> : version v2, en courant` ou `<titre> : variation v1b en régulier`.

Fini quand le commit est fait. S'il y a des scans ou des photos de la nouvelle réalisation, dire au calligraphe de lancer `/scans`.
