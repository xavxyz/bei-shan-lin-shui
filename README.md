# 背山臨水

Soutenu par le maître, je suis les vagues — carnet de calligraphie chinoise : suivi du
travail sur le disque, site public bâti à partir du même contenu.

## Démarrer

```sh
pnpm install
pnpm --filter @bsls/site dev      # le site sur content/
pnpm cosmos                       # l'atelier des îlots React
```

Vérifications :

```sh
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm validate:content
```

## Structure

```
content/                 le contenu : projets, pièces, images
packages/schema/         le schéma Zod, seule définition du format
packages/content/        le content layer et le validateur
apps/site/               le site Astro, ses îlots React et les tests E2E
```

Le site lit `content/` par défaut ; `CONTENT_ROOT` permet de le pointer
ailleurs, ce dont se servent les tests de bout en bout.

## Déploiement

`netlify.toml` décrit le build. Le branchement du dépôt à Netlify se fait une
fois, à la main :

1. Sur [app.netlify.com](https://app.netlify.com), _Add new site → Import an
   existing project_, choisir ce dépôt GitHub.
2. Laisser Netlify lire `netlify.toml` : commande
   `pnpm --filter @bsls/site build`, publication `apps/site/dist`.
3. Garder le sous-domaine `*.netlify.app` proposé ; aucun domaine personnalisé.
4. Vérifier que _Deploy Previews_ est activé pour les pull requests (c'est le
   réglage par défaut).
