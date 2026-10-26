# Le site écrit le chinois en TW-Kai, réduite aux caractères publiés

Le site écrit tout son chinois en TW-Kai (全字庫正楷體, OFL 1.1), le 楷 standard par défaut des grilles, pour une seule voix typographique entre le site et le papier. Il emprunte le fichier que l'ADR 0003 range dans `packages/grilles/fonts/`, sans le recopier. Au build, `packages/site-font` en tire un woff2 réduit aux caractères que le site montre (titres de pièce et de projet, colonnes, texte intégral, attribution, date chinoise, chacun en traditionnel et en simplifié), que le site sert lui-même sous `/fonts/`, avec la licence. Ce que TW-Kai ne dessine pas passe à une police de secours, choisie par l'ADR 0006 ; un caractère qu'aucune des deux ne dessine casse le build, en nommant la pièce et le caractère.

## Options écartées

- **Une police web hébergée** (Noto Serif TC chez Google Fonts, chargée jusqu'ici) : la seule dépendance réseau du site, contraire à l'esprit de l'ADR 0003, et dans un dessin d'imprimerie qui n'est pas celui des grilles. Son sous-ensemble régional n'a pas 298 des 447 simplifiés dérivés des textes de `docs/sources/` (mesure de `docs/research/mise-en-page-codrops.md`, §3.1).
- **Une police du système** (Kaiti TC, BiauKai…) : absente d'un Mac par défaut, comme l'a déjà constaté l'ADR 0003, et différente d'un visiteur à l'autre.
- **TW-Kai entière** : 37 Mo à chaque visite. Réduite, elle pèse 95 Ko pour les fixtures du site.

## Conséquences

TW-Kai n'a ni `locl` ni `vert` : le simplifié s'écrit dans son dessin, sans formes propres au continent, et la ponctuation verticale n'existe pas. C'est sans conséquence, puisque tout le texte du site est horizontal ; le balisage `lang` reste pour les lecteurs d'écran.

La police servie change avec le contenu publié, et son poids croît avec lui. Les emoji d'un titre ne sont pas demandés à TW-Kai : ils restent à la police emoji du système.

TW-Kai ne couvre pas les extensions de l'Unicode : 𮌖, 𨿽 et 𬬻 manquent aux textes de `docs/sources/`, et 𫝑, confirmé par le calligraphe dans le titre de `content/pieces/tai-quan-zhu-shan-an/piece.md`, cassait le build du contenu réel : l'ADR 0006 leur donne une police de secours, qui couvre 𫝑 et 𬬻.
