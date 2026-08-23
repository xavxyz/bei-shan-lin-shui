# 背山臨水

Système de suivi et de publication de calligraphie chinoise. Le dépôt est la
source de vérité : le contenu vit sur le disque, le site en est une projection.

## Où vivent les choses

- `content/` — le contenu réel. Projets en YAML, pièces en Markdown à
  frontmatter YAML, images à côté de leur pièce.
- `packages/schema` — **la** définition du format, en Zod. Tout le reste s'y
  branche ; rien ne redéfinit la forme du contenu ailleurs.
- `packages/content` — le content layer : prend une racine de contenu, retourne
  projets et pièces validés et typés, ou des erreurs localisées.
- `apps/site` — le site Astro, ses îlots React, et les tests de bout en bout.

## Règles qui tiennent le système

- **Le contenu est append-only.** Une version succède à une autre, elle ne
  l'écrase pas. Les variations d'une version coexistent.
- **Le traditionnel est la source de vérité.** Le simplifié et le pinyin sont
  dérivés au build, jamais stockés, jamais l'inverse. La traduction française
  est écrite à la main.
- **Le content layer lit, il n'écrit jamais.** C'est le seul point d'entrée du
  site vers le contenu.
- **Un contenu invalide casse le build, pas la production.**
- Node et TypeScript exclusivement, pnpm en monorepo.

## Écrire du contenu

Le format d'une pièce est décrit par `pieceFrontmatterSchema`
(`packages/schema/src/index.ts`) ; les vocabulaires fermés — statuts, styles
d'écriture, thèmes — par `packages/schema/src/vocabulary.ts`. Les styles sont
stockés en pinyin sans tons et **affichés en français**.

`pnpm validate:content` valide `content/`, et tourne en pre-commit.

## Tests

Le prior art est posé : on décrit un comportement observable de l'extérieur.

- **Aucun mock du système de fichiers.** Les tests du content layer écrivent de
  vraies arborescences dans un répertoire temporaire
  (`packages/content/src/test-support/fixture-tree.ts`) et observent ce qui est
  retourné.
- **Les E2E tournent sur un build réel** produit à partir de
  `apps/site/tests/fixtures/content`. On assère sur ce que le visiteur voit.
- **Les îlots React** sont vérifiés en isolation sous react-cosmos, avec des
  fixtures typées par le schéma partagé.
- On n'assère jamais sur des props ou de l'état interne.
