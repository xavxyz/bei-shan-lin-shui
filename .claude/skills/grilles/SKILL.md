---
name: grilles
description: Générer pour une pièce des feuilles A4 quadrillées à imprimer, une grille par format candidat, comparables côte à côte. À utiliser quand le calligraphe veut une grille à imprimer pour écrire une pièce, un calque de ses caractères, ou hésite entre plusieurs formats.
argument-hint: "[slug] [format candidat…]"
---

# Grilles

Les feuilles sont la **grille imprimée** : le calligraphe les imprime et écrit
dessus au pinceau, sur la grille seule ou par-dessus ses caractères en
**calque**. `pnpm grilles` les écrit dans une page HTML autonome, une
série de feuilles par format candidat, basculées par `?candidat=` comme un
prototype. La skill lit la pièce et n'écrit rien dans `content/` ni dans le
plan.

## 1. Retrouver la pièce

Appelée par `/grilles`, la skill reçoit dans `$ARGUMENTS` le slug, puis
d'éventuels formats candidats à reprendre à l'étape 2 ; sans slug, demander la
pièce au calligraphe.

La commande cherche le slug dans `content/`, puis dans `imports/*.plan.yaml`
tant que le plan n'est pas appliqué. Lire la pièce et résumer au calligraphe
la version visée (la dernière par défaut) : son format et ses colonnes.

Fini quand le calligraphe a confirmé la pièce et la version.

## 2. Arrêter le texte et les formats candidats

- **Texte** : les colonnes de la version, en traditionnel. Une version sans
  colonnes reçoit son texte du calligraphe, ou d'un extrait de
  `source.full_text` qu'il confirme caractère par caractère. Il se passe par
  `--texte`, colonnes séparées par `/`. La ponctuation tombe d'elle-même.
- **Formats candidats** : celui de la version, plus ceux que le calligraphe
  veut comparer. Proposer des candidats qui coupent le texte autrement (une
  colonne courte pour une incise, une feuille de plus), jusqu'à cinq.

La notation, lue de droite à gauche :

| Format                     | Sens                                                           |
| -------------------------- | -------------------------------------------------------------- |
| `NxM`                      | un groupe de N colonnes de M caractères, lues de haut en bas   |
| `NxMh`                     | un groupe de N lignes de M caractères, lues de droite à gauche |
| `NxMv`                     | `NxM` : un groupe sans suffixe est vertical                    |
| `[(13x7)]`                 | une feuille, un groupe                                         |
| `[(1x3, 9x7)]`             | deux groupes sur une feuille, un demi-carreau entre eux        |
| `[(1x3, 9x7), (1x4, 3x7)]` | deux feuilles : une parenthèse par feuille, entre crochets     |
| `[(1x7, 1x4h, 1x7)]`       | un 牌樓聯 : colonne de droite, 橫批 en haut, colonne de gauche |

Sur une feuille, chaque groupe est un bloc : un groupe vertical a N carreaux
de large et M de haut, un groupe `h` M de large et N de haut. Les blocs se
suivent de droite à gauche, un demi-carreau entre deux. Les groupes `h` sont
en haut ; dès qu'il y en a un, tous les groupes verticaux de la feuille
commencent sous le plus haut d'entre eux, un demi-carreau plus bas. Entre deux
colonnes, le 橫批 est ainsi sur le linteau, et les colonnes pendent sous lui
de part et d'autre du passage vide ; il n'est centré au-dessus du passage que
si les groupes qui l'encadrent sont symétriques, comme dans
`[(1x7, 1x4h, 1x7)]`. La règle vaut aussi pour un groupe `h` en premier ou en
dernier, et pour plusieurs groupes `h`. Le carreau reste commun à la feuille.

Le texte tombe dans l'ordre des groupes, de droite à gauche : pour
`[(1x7, 1x4h, 1x7)]`, le 上聯 (colonne de droite), le 橫批, le 下聯 (colonne
de gauche). Si les colonnes de la version sont dans un autre ordre, le 橫批 en
premier par exemple, les réordonner dans la version, ou passer le texte
réordonné par `--texte`.

Un format qui n'est pas une grille (`A4 vertical`), ou encore écrit dans
l'ancienne notation (`1x3 + 2*(4x5) + 1x3`), se réécrit avec le calligraphe
dans celle-ci : la commande le refuse et dit où elle bute.

Fini quand chaque format candidat est dans la notation et que le texte est
arrêté.

## 3. Générer

```sh
pnpm grilles long-hu-ge-mian-zhan-mian-zhan \
  --format '[(1x3, 9x7), (1x4, 3x7)]' \
  --format '[(13x7)]'
```

Sans `--format`, la page prend le format de la version ; avec, les formats
candidats donnés le remplacent : le redonner pour le comparer. `--texte`
remplace les colonnes de la version : pour une version sans colonnes, ou pour
les réordonner. `--version vN` vise une autre version que
la dernière ; `--out` déplace la page, écrite par défaut dans
`grilles/<slug>.html`, que git ignore.

La commande résume chaque format candidat : orientation, taille du carreau,
groupes (chacun avec son orientation dès qu'un groupe est horizontal),
caractères par feuille, et comment le texte est tombé. Quand le texte a
autant de colonnes que la grille de colonnes et de lignes, et que chacune
tient dans la sienne, elles y tombent une à une ; sinon il coule dans l'ordre
des groupes et peut couper un vers. Si les nombres sont égaux mais qu'une
colonne ne tient pas, le résumé le signale et liste, pour chaque colonne du
texte dont la longueur diffère, sa longueur et le groupe où elle devait
tomber : c'est souvent un ordre à reprendre (le 橫批 en premier), à corriger
avant de relancer. Ce hasard de la coulée, lui, est voulu :
le dire au calligraphe, la coupure peut faire un contresens, fructueux ou
non. Lire ce résumé avec lui : un débordement, des cases vides, ou une coupure
qu'il ne veut pas se corrigent au texte ou au format, puis on relance.

Avant de lancer, regarder si la page existe déjà. Si elle n'existait pas,
l'ouvrir dans Chrome dès qu'elle est écrite, avec le lien imprimé par la
commande :

```sh
open -a 'Google Chrome' 'file:///…/grilles/yi-jin-jing.html'
```

Si elle existait, un onglet la montre sans doute déjà : ne pas en ouvrir un
autre, dire au calligraphe de le recharger.

Fini quand chaque format candidat tient le texte comme le calligraphe le veut.

## 4. Remettre

Donner au calligraphe le lien `file://` imprimé par la commande, et pour
chaque format candidat de quoi le rouvrir dans Chrome, directement sur lui :
une commande à taper dans la conversation, le lien suffixé de `?candidat=`
et de la lettre du résumé.

```sh
! open -a 'Google Chrome' 'file:///…/grilles/yi-jin-jing.html?candidat=B'
```

Avec plusieurs pages, une commande par page et par candidat, dans un tableau
qui les nomme.

Puis ce mode d'emploi :

- `←` `→`, ou la barre du bas, basculent entre les formats candidats ;
- **Caractères** : affichés, en calque (très pâles, pour écrire par-dessus),
  ou masqués (la grille seule) ;
- impression : seul le format candidat affiché sort, une feuille par page A4,
  chacune dans son orientation ; régler l'échelle à 100 % et les marges sur
  « aucune ». Les caractères sortent comme ils sont affichés.

Si le calligraphe retient un format autre que celui de la version, il
s'inscrit là où vit la pièce : dans le plan à l'arbitrage, ou par
`/version-ou-variation` pour une pièce de `content/`.
