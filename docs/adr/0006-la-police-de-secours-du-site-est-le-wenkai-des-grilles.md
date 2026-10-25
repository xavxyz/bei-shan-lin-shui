# La police de secours du site est le 文楷 des grilles

Complète l'ADR 0005. TW-Kai ne couvre pas les extensions de l'Unicode, et 𫝑 (U+2B751, extension D), dans le titre de `content/pieces/tai-quan-zhu-shan-an/piece.md`, cassait le build du contenu réel. Le site gagne une police de secours : 霞鶩文楷 TC (LXGW WenKai TC v1.530, OFL 1.1), le 文楷 que l'ADR 0003 range déjà dans `packages/grilles/fonts/`, empruntée sans la recopier. Au build, `packages/site-font` en tire un woff2 réduit aux seuls caractères publiés que TW-Kai ne dessine pas, servi sous `/fonts/` avec sa licence, et déclaré en second dans la pile du chinois, avec un `unicode-range` limité à ces caractères : une page qui n'en montre aucun ne la charge pas. Si TW-Kai dessine tout, aucun fichier de secours n'est servi. Un caractère que ni l'une ni l'autre ne dessine casse toujours le build, en nommant la pièce et le caractère : jamais de case vide, jamais de police du système.

## Mesures

Couverture lue avec fontkit (`hasGlyphForCodePoint`) le 2026-10-25. Les 473 caractères distincts publiés par le contenu réel, traditionnel et simplifié, n'en ont qu'un hors de TW-Kai : 𫝑. Les textes de `docs/sources/` ajoutent 𨿽 (U+28FFD, extension B) et 𮌖 (U+2E316, extension F) en traditionnel, et 𬬻 (U+2CB3B, extension E), simplifié dérivé de 鑪.

| Police                                          | Licence | 𫝑  | 𬬻  | 𨿽  | 𮌖  |
| ----------------------------------------------- | ------- | --- | --- | --- | --- |
| 霞鶩文楷 TC v1.530 (`LXGWWenKaiTC-Regular.ttf`) | OFL 1.1 | oui | oui | non | non |
| TW-Kai-Ext-B (`TW-Kai-Ext-B-98_1.ttf`)          | OFL 1.1 | non | non | oui | non |
| TW-Kai-Plus (`TW-Kai-Plus-98_1.ttf`)            | OFL 1.1 | non | non | non | non |
| 王漢宗顏楷體 (`wt064.ttf`)                      | GPL v2  | non | non | non | non |

TW-Kai-Ext-B et TW-Kai-Plus viennent de l'archive même de TW-Kai, `https://data.cns11643.gov.tw/opendata/Fonts_Kai.zip`, téléchargée le 2026-10-25 : son empreinte (sha256 `50fdfafabb40a382b74e7f6cf813bcd036a446b7700be0099de8372fee9c9e38`) est celle que `packages/grilles/fonts/README.md` note déjà. La page des versions de `https://github.com/lxgw/LxgwWenkaiTC/releases`, consultée le même jour, donne v1.530 pour la dernière : c'est le fichier versionné.

## Options écartées

- **TW-Kai-Ext-B**, la même famille du 全字庫, au dessin le plus proche de TW-Kai : elle n'a aucun des caractères publiés hors de TW-Kai, ni 𫝑 ni 𬬻, et ajouterait 46,5 Mo au dépôt pour le seul 𨿽, qu'aucune pièce ne publie.
- **TW-Kai-Plus** : aucun des quatre caractères.
- **王漢宗顏楷體**, l'autre 楷 des grilles : aucun des quatre caractères, et un 顏 qui n'est pas le 楷 standard du site.
- **Une police du système** : écartée par l'ADR 0005, pour les mêmes raisons.

Aucun autre 楷 libre couvrant l'extension F n'a été trouvé et mesuré.

## Conséquences

Un caractère de secours s'écrit dans le dessin du 文楷, plus manuscrit que TW-Kai : l'écart se voit, au caractère près. Le 文楷 dessine certains caractères sous leur forme héritée (ADR 0003), mais il ne reçoit jamais que ceux que TW-Kai n'a pas.

𨿽 et 𮌖 restent sans police : une pièce qui les publie casse le build. Pour 𨿽, TW-Kai-Ext-B s'ajouterait comme troisième police, et le plus petit ensemble couvrant trois des quatre caractères est le 文楷 et TW-Kai-Ext-B ; pour 𮌖, aucune police mesurée ne suffit. Chacun reste une décision à prendre le jour où il est publié.
