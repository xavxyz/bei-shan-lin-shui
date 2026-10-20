# Les polices du modèle vivent dans le dépôt

Le modèle d'une grille s'écrit dans l'un de trois 體 : 楷 standard
(全字庫正楷體 TW-Kai, OFL), 顏體 (王漢宗顏楷體, GPL v2) et 文楷
(霞鶩文楷 TC, OFL). Leurs fichiers d'origine sont versionnés tels quels, avec
leurs licences et leur provenance, dans `packages/grilles/fonts/` (61 Mo,
environ 34 Mo compressés par git). Chaque grille n'en embarque que les
caractères de sa pièce. La page reste ainsi autonome et s'imprime hors ligne,
et elle ne dépend pas de sources fragiles : le 顏楷 ne vit plus que dans
l'archive de Google Code, TW-Kai dans un ZIP d'un site gouvernemental. Le
dépôt archive déjà les scans (ADR 0001), il est lourd par nature.

Aucune police libre ne reproduit fidèlement un 體 de maître (歐, 柳, 褚, 趙,
小楷) en traditionnel. D'où ce choix d'un 顏 redessiné pour l'imprimerie et de
deux 楷 sans maître.

## Options écartées

- **Télécharger les polices à la première génération**, dans un cache ignoré
  de git, avec une URL et une empreinte figées : environ 250 Mo bruts, et des
  grilles à la merci de liens qui peuvent disparaître.
- **Les polices du système** (Kaiti TC, BiauKai…) : absentes d'un Mac par
  défaut, elles laissaient le modèle retomber sur une police d'imprimerie
  (Noto Serif TC).
- **Les polices pinceau de Google Fonts et les polices japonaises** :
  simplifiées ou en formes japonaises, avec une couverture du traditionnel
  trop courte.

## Conséquences

Les polices restent en TTF plutôt qu'en woff2 : décompresser un woff2 de
plusieurs mégaoctets à chaque grille la ralentit, et la police d'origine se
vérifie à son empreinte.

Une fois un fichier de police versionné, il reste dans l'historique de git. 文楷
dessine certains caractères sous leur forme héritée (真 en 眞) : la grille le
signale, puisque le traditionnel stocké fait foi.
