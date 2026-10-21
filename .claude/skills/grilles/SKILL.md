---
name: grilles
description: Générer pour une pièce des feuilles A4 quadrillées à imprimer, une grille par format candidat, comparables côte à côte. À utiliser quand le calligraphe veut une grille à imprimer pour écrire une pièce, un calque de ses caractères, ou hésite entre plusieurs formats.
argument-hint: "[slug] [format candidat…]"
---

# Grilles

Les feuilles sont la **grille imprimée** : le calligraphe les imprime et écrit dessus au pinceau, sur la grille seule ou par-dessus son **modèle** en **calque**. Le modèle est toujours en régulier (楷書), dans un 體 au choix ; le courant comme le cursif sont son propre travail. `pnpm grilles` les écrit dans une page HTML autonome, une série de feuilles par format candidat, basculées par `?candidat=` comme un prototype. La skill lit la pièce et n'écrit rien dans `content/` ni dans le plan.

## 1. Retrouver la pièce

Appelée par `/grilles`, la skill reçoit dans `$ARGUMENTS` le slug, puis d'éventuels formats candidats à reprendre à l'étape 2 ; sans slug, demander la pièce au calligraphe.

La commande cherche le slug dans `content/`, puis dans `imports/*.plan.yaml` tant que le plan n'est pas appliqué. Lire la pièce et résumer au calligraphe la version visée (la dernière par défaut) : son format et ses colonnes.

Fini quand le calligraphe a confirmé la pièce et la version.

## 2. Arrêter le texte et les formats candidats

- **Texte** : les colonnes de la version, en traditionnel. Une version sans colonnes reçoit son texte du calligraphe, ou d'un extrait de `source.full_text` qu'il confirme caractère par caractère. Il se passe par `--texte`, colonnes séparées par `/`. La ponctuation tombe d'elle-même.
- **Formats candidats** : celui de la version, plus ceux que le calligraphe veut comparer. Proposer des candidats qui coupent le texte autrement (une colonne courte pour une incise, une feuille de plus), jusqu'à cinq.

La notation, lue de droite à gauche :

| Format                     | Sens                                                           |
| -------------------------- | -------------------------------------------------------------- |
| `NxM`                      | un groupe de N colonnes de M caractères, lues de haut en bas   |
| `NxMh`                     | un groupe de N lignes de M caractères, lues de droite à gauche |
| `NxMv`                     | `NxM` : un groupe sans suffixe est vertical                    |
| `NxM/k`, `NxMh/k`          | des carreaux k fois plus petits que ceux de la feuille, k ≥ 1  |
| `[(13x7)]`                 | une feuille, un groupe                                         |
| `[(1x3, 9x7)]`             | deux groupes sur une feuille, un demi-carreau entre eux        |
| `[(1x3, 9x7), (1x4, 3x7)]` | deux feuilles : une parenthèse par feuille, entre crochets     |
| `[(1x7, 1x4h, 1x7)]`       | un 牌樓聯 : colonne de droite, 橫批 en haut, colonne de gauche |
| `[(1x2, 1x7/2)]`           | un mot sujet, puis le vers qui l'explique, en demi-carreaux    |
| `[(4x7, 1x13/2)]`          | quatre vers, puis leur 款 en demi-carreaux                     |

Sur une feuille, chaque groupe est un bloc : un groupe vertical a N carreaux de large et M de haut, un groupe `h` M de large et N de haut. Les blocs se suivent de droite à gauche, un demi-carreau entre deux. Les groupes `h` sont en haut ; dès qu'il y en a un, tous les groupes verticaux de la feuille commencent sous le plus haut d'entre eux, un demi-carreau plus bas. Entre deux colonnes, le 橫批 est ainsi sur le linteau, et les colonnes pendent sous lui de part et d'autre du passage vide ; il n'est centré au-dessus du passage que si les groupes qui l'encadrent sont symétriques, comme dans `[(1x7, 1x4h, 1x7)]`. La règle vaut aussi pour un groupe `h` en premier ou en dernier, et pour plusieurs groupes `h`. Le carreau de la feuille est le plus grand qui tient sur la page ; un groupe `/k` a le sien, k fois plus petit, et s'aligne en haut comme les autres. Tailles et écarts se comptent en carreaux de la feuille.

Le texte tombe dans l'ordre des groupes, de droite à gauche : pour `[(1x7, 1x4h, 1x7)]`, le 上聯 (colonne de droite), le 橫批, le 下聯 (colonne de gauche). Si les colonnes de la version sont dans un autre ordre, le 橫批 en premier par exemple, les réordonner dans la version, ou passer le texte réordonné par `--texte`.

Proposer les candidats dans l'ordre classique, qui tient au rôle et non à la longueur : le 正文 à droite, au carreau de la feuille, puis le 款 (ou le 跋) qui le signe, à gauche, en `/2`. Ce sont des usages courants, pas des règles : le calligraphe les apprend et peut s'en écarter. En proposant, dire en une phrase ce que fait chaque partie à sa place.

Le 款 s'écrit d'un trait, ses parties s'enchaînant case après case ; le souffle avant la signature se donne au pinceau. Il porte, dans l'ordre :

- une dédicace (上款), s'il y en a une ;
- la source : l'auteur et le titre, suivis de 句 pour un extrait, `李道純原道歌句` ;
- la signature, sous l'une de deux formes : l'année 干支 et le 節氣 du jour où la pièce s'écrit, puis 戈書 (`丙午霜降戈書`) ; ou 戈 seul, avec une date française (`21.10.26`) que le calligraphe écrit à la main, hors de `--texte`. Une pièce en plusieurs feuilles ne porte la date que sur sa feuille principale.

La version garde du 款 la source, jamais la date : ses dernières cases restent vides pour la signature du jour. Pour l'imprimer en modèle, la composer avec le calligraphe, le 節氣 calculé à la date où il écrit, et passer le 款 entier par `--texte`. Le 款 tient en une colonne tant qu'il est moins haut que le 正文, en carreaux de la feuille, et s'arrête alors avant son bas ; plus long, il passe sur une seconde colonne. La grille l'aligne en haut : pour le faire commencer plus bas, le calligraphe laisse vides ses premières cases, comme il en laisse au bas pour un sceau.

Le titre d'un poème va d'ordinaire dans le 款. En tête, il est le 引首 d'un 手卷, le titre d'un 賦 ou d'un 記 au carreau du texte, ou un titre seul sur sa feuille, où il prend un grand carreau : `yi-jin-jing`, 易筋經 en `[(1x3), (2x5)]`. Le rôle d'une colonne courte ne se devine pas : un mot qui condense le vers peut en être le sujet, en grand et en premier, comme un 題字, le vers l'expliquant en `/2`. Le demander au calligraphe quand le plan ne le dit pas. Ainsi `yi-jin-jing` : 苦煉 / 寶劍鋒從磨礪出 et 下功夫 / 梅花香自苦寒來, le mot sujet d'abord. Un 款 ou un 跋 seul sur sa feuille renverse la hiérarchie : ne le proposer qu'en le disant.

Le rapport des parties secondes est au calligraphe : `/2` pour commencer, puis celui qu'il demande. Pour un mot sujet et son vers, proposer aussi le carreau commun, `[(1x2, 1x7)]` à côté de `[(1x2, 1x7/2)]`, pour qu'il voie ce que la hiérarchie change.

Un format qui n'est pas une grille (`A4 vertical`), ou encore écrit dans l'ancienne notation (`1x3 + 2*(4x5) + 1x3`), se réécrit avec le calligraphe dans celle-ci : la commande le refuse et dit où elle bute.

Fini quand chaque format candidat est dans la notation et que le texte est arrêté.

## 3. Générer

```sh
pnpm grilles long-hu-ge-mian-zhan-mian-zhan \
  --format '[(1x3, 9x7), (1x4, 3x7)]' \
  --format '[(13x7)]'
```

Sans `--format`, la page prend le format de la version ; avec, les formats candidats donnés le remplacent : le redonner pour le comparer. `--texte` remplace les colonnes de la version : pour une version sans colonnes, pour les réordonner, ou pour compléter le 款 de sa signature. `--version vN` vise une autre version que la dernière ; `--out` déplace la page, écrite par défaut dans `grilles/<slug>.html`, que git ignore.

La commande résume chaque format candidat : orientation, taille du carreau, groupes (chacun avec son orientation dès qu'un groupe est horizontal ou plus petit, et son carreau s'il est en `/k`), caractères par feuille, et comment le texte est tombé. Quand le texte a autant de colonnes que la grille de colonnes et de lignes, et que chacune tient dans la sienne, elles y tombent une à une ; sinon il coule dans l'ordre des groupes et peut couper un vers. Si les nombres sont égaux mais qu'une colonne ne tient pas, le résumé le signale et liste, pour chaque colonne du texte dont la longueur diffère, sa longueur et le groupe où elle devait tomber : c'est souvent un ordre à reprendre (le 橫批 en premier), à corriger avant de relancer. Ce hasard de la coulée, lui, est voulu : le dire au calligraphe, la coupure peut faire un contresens, fructueux ou non. Lire ce résumé avec lui : un débordement, des cases vides, ou une coupure qu'il ne veut pas se corrigent au texte ou au format, puis on relance.

Le résumé finit par les 體 du modèle et ce qu'ils disent du texte : un caractère qu'un 體 n'a pas, et qui s'affiche en 楷 standard ou dans une police du système ; un caractère que 文楷 dessine comme une autre forme (真 en 眞). Le dire au calligraphe : le traditionnel du texte fait foi, pas le modèle.

Avant de lancer, regarder si la page existe déjà. Si elle n'existait pas, l'ouvrir dans Chrome dès qu'elle est écrite, avec le lien imprimé par la commande :

```sh
open -a 'Google Chrome' 'file:///…/grilles/yi-jin-jing.html'
```

Si elle existait, un onglet la montre sans doute déjà : ne pas en ouvrir un autre, dire au calligraphe de le recharger, et la rouvrir s'il l'a fermé.

Fini quand chaque format candidat tient le texte comme le calligraphe le veut.

## 4. Remettre

Donner au calligraphe, pour chaque page, de quoi la rouvrir dans Chrome : une commande à taper dans la conversation, sur le lien `file://` imprimé par la commande. Avec plusieurs pages, une ligne par page dans un tableau qui les nomme.

```sh
! open -a 'Google Chrome' 'file:///…/grilles/yi-jin-jing.html'
```

Pas de commande par format candidat : le calligraphe navigue entre eux sur la page.

Puis ce mode d'emploi :

- `←` `→`, ou la barre du bas, basculent entre les formats candidats ;
- **Caractères** : affichés, en calque (très pâles, pour écrire par-dessus), ou masqués (la grille seule) ;
- **Modèle** : 楷 standard (par défaut), 顏體 ou 文楷 ; sous la bascule, ce que le 體 choisi dessine autrement que le texte ;
- **Repères**, masqués par défaut et à cocher un à un : le **九宮格**, chaque carreau partagé en trois dans les deux sens pour situer les traits, et les **cotes**, pour tracer la feuille à la main : marges, groupes et écarts en haut, 橫批 et colonnes à droite, un groupe moins haut le long de son bord gauche, chacun avec son carreau et, s'il a plusieurs cases, sa longueur ; sous la feuille, la ligne des marges, des carreaux et de l'écart ;
- impression : seul le format candidat affiché sort, une feuille par page A4, chacune dans son orientation ; régler l'échelle à 100 % et les marges sur « aucune ». Les caractères et les repères sortent comme ils sont affichés.

Si le calligraphe retient un format autre que celui de la version, il s'inscrit là où vit la pièce : dans le plan à l'arbitrage, ou par `/version-ou-variation` pour une pièce de `content/`.
