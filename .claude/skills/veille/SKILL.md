---
name: veille
description: Repasser une à une avec le calligraphe les pièces en veille, pour l'y remettre face sans en conclure aucune d'office. À utiliser quand le calligraphe veut revoir ses pièces en veille, demande ce qui attend, ou envisage de reprendre ou d'abandonner une pièce mise de côté.
---

# Revue des pièces en veille

Une pièce en veille est mise de côté sans être abandonnée (**En veille** dans `GLOSSARY.md`). La revue la remet sous les yeux du calligraphe ; c'est lui qui décide de son sort. Par défaut, elle reste en veille.

## 1. Lister

Lancer `pnpm piece veille` et annoncer le nombre de pièces en veille. S'il n'y en a aucune, le dire : la revue est finie.

## 2. Une pièce par message

Présenter la pièce suivante, dans l'ordre de la commande : son bloc tel quel, et sa traduction lue dans `content/pieces/<slug>/piece.md`. Demander ce qu'il en fait :

- **La laisser en veille** : rien à écrire.
- **La reprendre** : la pièce a été ou va être refaite, ou écrite dans un autre style. Suivre la skill `version-ou-variation` pour cette pièce, puis revenir à la suivante.
- **Changer son statut** (`PIECE_STATUSES` de `packages/schema/src/vocabulary.ts`, nommés en français par `PIECE_STATUS_LABELS`) : sur son choix explicite, et seulement alors, `pnpm piece statut <slug> <statut>`.

Une réponse floue, un silence ou « on verra » laissent la pièce en veille. Fini pour une pièce quand le calligraphe a répondu ; passer à la suivante.

## 3. Commiter

Quand toutes les pièces sont passées, ou que le calligraphe arrête :

1. S'il a changé des statuts, `pnpm validate:content`, puis `git add content/pieces/` et un commit en français au style de `git log` qui nomme chaque pièce et son nouveau statut : `Revue de la veille : 永草書 abandonnée, 山居秋暝 en cours`.
2. Sinon, rien à commiter : dire combien de pièces restent en veille.

Fini quand le commit est fait ou que le calligraphe sait qu'aucun statut n'a bougé.
