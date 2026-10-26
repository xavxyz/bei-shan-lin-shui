# 背山臨水

Système de suivi et de publication de calligraphie chinoise. Le dépôt est la source de vérité : le contenu vit sur le disque, le site en est une projection.

Réponds au calligraphe en français.

## Où vivent les choses

- `content/` — le contenu réel. Projets en YAML, pièces en Markdown à frontmatter YAML, images à côté de leur pièce.
- `packages/schema` — **la** définition du format, en Zod. Tout le reste s'y branche ; rien ne redéfinit la forme du contenu ailleurs.
- `packages/content` — le content layer : prend une racine de contenu, retourne projets et pièces validés et typés, ou des erreurs localisées.
- `packages/notion-import` — l'import de l'existant depuis Notion : lit un export, propose un classement, applique le plan arbitré ; ses images passent par la normalisation de `packages/scans`.
- `packages/scans` — l'entrée des scans : registre des scans d'un import en cours (aucun hors import, ADR 0001), normalisation des images (JPEG qualité 92, au plus A4 à 300 dpi), et `attachScan`, qui rattache un scan à une pièce de `content/` (`pnpm attach:scan`).
- `packages/authoring` — les écritures des skills de saisie (`pnpm piece`) : versions, variations, statuts, glose des pièces et des projets, traduction des versions, écrits dans le texte sans resérialiser ce qu'ils ne visent pas. C'est la seule couture d'édition du frontmatter, et la seule écriture de ses nœuds — version, variation, image ; `packages/scans` et `packages/notion-import` s'y branchent.
- `packages/grilles` — les feuilles A4 quadrillées d'une pièce, au format de sa version ou de formats candidats, à imprimer (`pnpm grilles`, skill `grilles`). Lit le contenu, et le plan d'un import en cours s'il y en a un ; n'écrit qu'une page HTML.
- `packages/repo-checks` — les vérifications du dépôt lui-même (`pnpm validate:repo`, en pre-commit) : le YAML ne s'écrit que par `packages/authoring`, un chemin cité existe, un mot que le glossaire dit d'éviter ne s'écrit ni dans les skills, ni dans la doc, ni sur le site.
- `packages/site-font` — les polices du site : TW-Kai, empruntée à `packages/grilles/fonts/` et réduite au build aux caractères que le site montre, et 霞鶩文楷 TC en secours, réduite à ceux que TW-Kai ne dessine pas. Un caractère qu'aucune ne dessine casse le build (ADR 0005, ADR 0006).
- `apps/site` — le site Astro, ses îlots React, et les tests de bout en bout.
- `docs/sources/` — les textes de référence, traduits vers par vers pour choisir l'étendue des pièces. Ils survivent au plan d'import, mais n'arbitrent rien : l'étendue retenue vit dans la pièce (ADR 0002).

## Règles qui tiennent le système

- **Le contenu est append-only.** Une version succède à une autre, elle ne l'écrase pas. Les variations d'une version coexistent.
- **Le traditionnel est la source de vérité.** Le simplifié et le pinyin sont dérivés au build, jamais stockés, jamais l'inverse. La traduction française est écrite à la main.
- **Le content layer lit, il n'écrit jamais.** C'est le seul point d'entrée du site vers le contenu.
- **Un contenu invalide casse le build, pas la production.**
- **Aucune donnée de mémoire.** Un texte, une attribution, une datation s'écrivent avec la source consultée, ou ne s'écrivent pas (ADR 0004).
- Node et TypeScript exclusivement, pnpm en monorepo.

Écrire ou relire du code, une skill ou une doc : `CODING_STANDARDS.md`.

## Écrire du contenu

Le format d'une pièce est décrit par `pieceFrontmatterSchema` (`packages/schema/src/index.ts`) ; les vocabulaires fermés — statuts, styles d'écriture, types d'image — par `packages/schema/src/vocabulary.ts`. Les styles sont stockés en pinyin sans tons et **affichés en français**.

Le format d'une version suit la notation de **Format** (`GLOSSARY.md`), lue par `parseFormat` dans `packages/schema/src/format.ts` ; hors notation, seul `à préciser` s'écrit.

`pnpm validate:content` valide `content/`, et tourne en pre-commit. Un format hors de la notation n'y est qu'un avertissement, le temps de migrer l'existant (#65).

La saisie passe par les skills `nouvelle-piece`, `version-ou-variation`, `veille` et `scans`, en conversation avec le calligraphe. Elles écrivent par `pnpm piece`, qui n'écrase aucune version et refuse ce que le schéma refuse, dont une traduction qui n'a pas une ligne par colonne. Glose et traduction viennent du calligraphe, colonne par colonne pour la traduction : une nouvelle version ne reprend jamais celle de la précédente.

## Git

- Chaque tâche dans son worktree, parti d'un `origin/main` tout juste récupéré ; le checkout principal reste tel que le calligraphe l'a laissé.
- Une branche au nom inédit sur `origin`, créée avec le worktree : `git worktree add -b <branche> .claude/worktrees/<nom> origin/main` (`EnterWorktree` la renomme `worktree-…`).
- Le hook pre-commit n'existe qu'après `pnpm install --frozen-lockfile --prefer-offline` : `.claude/settings.json` le lance au démarrage et après `EnterWorktree` ; dans un worktree de sous-agent, lance-le toi-même. `imports/scans`, gitignoré, reste dans le checkout principal.
- Une préoccupation par branche.
- Chaque compte rendu nomme la branche et le numéro de PR.

## Importer depuis Notion

L'import du 2026-08-23 est appliqué (PR #62) ; la commande reste pour un export à venir, en deux temps arbitrés par le calligraphe : `pnpm import:notion plan <export> --out imports/notion-<date>.plan.yaml`, puis `pnpm import:notion apply <plan>`. Options : `pnpm import:notion --help`. Le détail du plan et de ses deux étapes : `git show 99d356d:CLAUDE.md`.

## Tests

Le prior art est posé : on décrit un comportement observable de l'extérieur.

- **Aucun mock du système de fichiers.** Les tests du content layer écrivent de vraies arborescences dans un répertoire temporaire (`packages/content/src/test-support/fixture-tree.ts`) et observent ce qui est retourné.
- **Les E2E tournent sur un build réel** produit à partir de `apps/site/tests/fixtures/content`. On assère sur ce que le visiteur voit.
- **Les îlots React** sont vérifiés en isolation sous react-cosmos, avec des fixtures typées par le schéma partagé.
- On n'assère jamais sur des props ou de l'état interne.

## Agent skills

### Issue tracker

Les issues vivent dans les GitHub Issues du dépôt, via `gh`. Voir `docs/agents/issue-tracker.md`.

### Triage labels

Les cinq rôles canoniques, sous leurs noms par défaut (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). Voir `docs/agents/triage-labels.md`.

### Domain docs

Un seul contexte : `GLOSSARY.md` à la racine, ADR dans `docs/adr/`. Voir `docs/agents/domain.md`.
