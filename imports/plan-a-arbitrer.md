# Plan Notion — à arbitrer

État au 2026-10-19, après le lot 2. Le plan `notion-2026-08-23.plan.yaml`
porte 93 pièces et 12 projets ; il reste **56** `# à arbitrer`, sur 28
pièces et les 12 projets. Les 65 autres pièces, dont les 36 qui ont un scan,
n'ont plus rien à arbitrer. Le suivi se fait par les `# à arbitrer` du plan :
ce fichier les résume, lot par lot, et disparaît avec le plan (#17).

Un lot commence par ce fichier seul : l'issue #17 et les PR des lots
précédents n'apprennent rien de plus, sauf doute sur une décision numérotée.

L'agent propose pièce par pièce, au format de la skill `scans` ; « ok »
accepte tout.

## Sources primaires

Le texte d'une pièce se cherche par un **subagent**, un par pièce ou par
source. Il rend le passage retenu, les variantes entre éditions et les liens,
jamais la page entière : une page de ctext coûte 25k de contexte, une image
zoomée 2 à 5k.

- **zh.wikisource** : le wikitexte d'un livre s'obtient par
  `https://zh.wikisource.org/w/index.php?title=<titre>&action=raw`.
- **ctext** passe derrière Cloudflare, et son API ne donne que les
  métadonnées. Il se lit par le Chrome du calligraphe, connecté à son compte
  (`/chrome` avant de commencer) : `javascript_tool` fait
  `fetch('/wiki.pl?if=gb&chapter=<n>')` et ne renvoie que le passage voulu.
  Les images des pages sont à `library.pl?if=gb&file=<n>&page=<p>` ; le
  panneau de droite est un OCR illisible, on lit l'image à gauche.

## Règles arbitrées

- **Une pièce sans texte n'est pas importée** (décision 2 de #17).
- **Le titre porte le texte.** Une pièce sans texte a son texte dans son
  titre la plupart du temps ; sinon, le titre dit où le prendre (2026-10-17).
- **Une idée entre avec `format: à préciser`.** Le format d'une pièce au
  statut `idea` ne bloque pas `apply` ; ses marques `version.format` sont
  retirées au lot 0 (2026-10-17).
- **Le traditionnel de Notion se garde.** Une conversion ne remplace pas un
  caractère déjà traditionnel par sa variante (`泄`, `朱砂`, `卷`) ; une
  variante voulue se garde en notant le caractère dont elle varie
  (`# 洩, variante de 泄`) (2026-10-19).
- **Un simplifié voulu se garde**, avec son commentaire : il s'oppose au
  traditionnel sur le papier (`（罗）羅`, `虎书`). `丑`, la branche terrestre,
  est traditionnel (2026-10-19).

## Lot 0 — fait

- La marque périmée de `tai-quan-zhu-shan-an` est retirée : ses colonnes
  ont été posées à l'arbitrage des scans.
- Les marques `version.format` des 22 idées sont retirées.
- Les marques du projet `xian-xian-ji` sont remises au-dessus de lui.
- `long-hu-ge-mian-zhan-mian-zhan`, `ri-yong` et `jiao-he`, sans texte et
  sans marque, en reçoivent une.

## Lot 1 — fait

- Les 36 marques de conversion, sur 28 pièces, sont levées : 29 acceptées
  telles quelles ; `卷上` et `占花名兒` corrigés, `朱砂` et le `泄` de
  `meshkah` rendus à Notion, le `洩` de `zi-ti-xiang` gardé en variante,
  `（罗）羅` rendu au simplifié voulu.
- Deux formats en simplifié, sans marque, convertis : `修真後內外火候圖`
  (`xing-qi-yu-pei-ming`), `心性圖` (`bai-zi-bei`).
- **Projet `yi-jin-jing`** 易筋經, désigné par le calligraphe : la pièce
  `yi-jin-jing`, avec sur le côté l'avertissement 不按指示做，磨磚豈成鏡 ;
  `mo-li-li` devenue `bao-jian-feng-cong-mo-li-chu-ku-lian` (寶劍鋒從磨礪出
  // 苦煉) ; une nouvelle idée, `mei-hua-xiang-zi-ku-han-lai-xia-gong-fu`
  (梅花香自苦寒來 // 下功夫).

## Lot 2 — fait

Le titre porte le texte, découpé en colonnes ; un format pour les pièces qui ne
sont pas des idées. Sources vérifiées sur zh.wikisource.

- `fang-yuan` 方圓, `xiu-zhu-can-cha` 修竹參差 (`1x4`, scan attendu),
  `wu-qi-chao-yuan-shen-xin-ping-heng` 五氣朝元 · 身心平衡.
- `xin-nian-kuai-le-…` 新年快樂 · 馬到成功 (`2x4`) : produite en 3
  exemplaires, photos de contexte à demander.
- `ji-jing-zhong-she-xin` 寂靜中攝心 : `made`, papier introuvable, à refaire ;
  `1x5` supposé.
- `zi-de-shen-xin-ding` : le 5ᵉ des sept 《自得》 du 中和集 (卷五), en entier.
- `jing-zhong-qiu-dong` devient `dong-zhong-qiu-jing` 動中求靜, le dixième
  des dix points de 楊澄甫, dans leur projet.
- `wei-er-bu-fan-…` devient `wei-er-bu-meng-he-er-bu-tong` : 威而不犯 n'a pas
  de source, 威而不猛 est au 論語 (述而, 堯曰).
- `shen-yu` 神遇 : 庖丁 · 臣以神遇而不以目視 (`1x2 + 1x9`, 莊子, 養生主).
- `zao-hua-…` : 造化鍾神秀，陰陽割昏曉 est de 《望嶽》 ; 杜甫 n'a pas de
  《登泰山》. Slug raccourci.
- `tai-xu-huan-jing-ji-shi-zhen-ru-fu-di` et `jia-zuo-zhen-shi-zhen-yi-jia`
  deviennent une pièce en trois feuilles, `hong-lou-meng-pai-lou-lian`
  紅樓夢牌樓聯 : 紅樓夢 · 太虛幻境即是真如福地, puis l'arche du 太虛幻境
  (假作真時真亦假，無為有處有還無, chapitres 1 et 5), puis celle du 真如福地
  (假去真來真勝假，無原有是有非無, chapitre 116).
- `zhong-he-ji` reste, à refaire en grand : 中和集 en `1x3`.
- `diao-xi` 調息 et `diao-xin` 調心 rejoignent `qi-gong` avec 調身 ; leur
  texte est à retrouver dans un livre de Yang Jwing-Ming (lot 4).

## Lot 3 — le 中和集 de 李道純 (8 pièces)

Le titre renvoie au texte : l'agent le prend dans une source primaire et le
propose ; reste à choisir l'étendue, découpée selon le format.

Les huit textes, traduits vers par vers, avec leurs étendues candidates et
leurs leçons douteuses, sont dans `imports/lot-3-textes.md`. Les étendues
proposées sont posées dans le plan, sous `# à arbitrer` : le calligraphe
reprend les textes avant de trancher.

Sources : [zh.wikisource, 中和集](https://zh.wikisource.org/wiki/中和集), le
正統道藏 ; ctext, le 正統道藏 ([res=537433](https://ctext.org/wiki.pl?if=gb&res=537433))
et 清庵先生中和集 ([res=3138576](https://ctext.org/wiki.pl?if=gb&res=3138576),
images au `file=205666`), la seule édition indépendante. Graphies converties :
眞→真, 淸→清, 靑→青, 𨿽→雖, 个→個 ; 气 noté en commentaire.

- `lian-xu-ge` 《鍊虛歌》 — **fait** : 虛心直節青青竹 / 個是鍊虛第一機, la fin
  du dernier quatrain ; 鍊, comme Notion et le 道藏.
- `gua-xiang-lun` 《卦象論》 (630 caractères) — proposé : 過河須用栰 /
  到岸不須船 / 得魚忘筌 / 得兔忘蹄.
- `yuan-dao-ge` 《原道歌》 — proposé : le 5ᵉ quatrain, 人人自有長生要…
  À trancher si le poème entier : 野雲**翕**, à lire 翁 (la rime), et 大霶霈
  (`# 大霧需 dans le 道藏`).
- `xuan-li-ge` 《玄理歌》 — proposé : le quatrain du souffle, 諦觀三教聖人書…,
  et la pièce rejoint aussi `qi-gong`.
- `hui-jian` 《慧劍歌》 — le chant commence par 自從至人傳劍訣 ; 此寶劍 ouvre la
  8ᵉ strophe, proposée. Titre 《慧劍歌》 et slug `hui-jian-ge` proposés. Dans le
  chant entier : 蛟螭, 卓豎, et 部天地 (剖 ?) à vérifier sur le 清庵.
- `ri-yong` 《日用》, `jiao-he` 《交合》 — les deux 七律 posés ; restent les
  deux colonnes de quatre du titre.
- `long-hu-ge-mian-zhan-mian-zhan` — proposé selon le format du plan :
  龍虎歌勉旃勉旃, puis les 8 premiers vers du chant. L'autre étendue, le
  quatrain de la préface, n'en est pas un : 平地起波濤 est une locution, la fin
  se lit 4+5+5. Le `full_text` a son 裏 ; il porte encore 以卸天 (御), 束齊
  (齋), 進開頂顧門 (迸開頂顖門 ?), et ponctue 平地起，波濤.

Pour le lot 5 : le 述工夫十七首 contient un 《鑄劍》, qui éclaire peut-être
`zhu-jian-qing-chui`.

## Lot 4 — les autres textes connus (7 pièces)

`tai-shang-lao-jun-shuo-chang-qing-jing-jing` 《太上老君說常清靜經》 ·
`xing-qi-yu-pei-ming` 行氣玉佩銘 · `bai-zi-bei` 百字碑 · `yi-jin-jing`
易筋經 (quel passage ? l'avertissement est posé) · `pang-xie-feng-ci` 螃蟹諷刺 (le 螃蟹詠 de 寶釵,
chapitre 38) · `diao-xi` 調息 et `diao-xin` 調心 (dans un livre de Yang
Jwing-Ming, que le calligraphe n'a pas sous la main).

## Lot 5 — titres ambigus (6 pièces)

La lecture du calligraphe d'abord :

- **`bao-yu-si-shou-shi-…`** : les quatre 即事詩 de 寶玉 sont des 七律, le
  titre dit 五言律詩.
- **`zhan-hua-ming-er`** : quelles fiches du jeu (chapitre 63) ?
- **`hu-si-luan-xiang`** : `4 + 2x7`, quel distique ?
- **`tai-xi`** : 胎息 en `2x5`, le texte dépasse le titre.
- **`zhu-jian-qing-chui`** : 鑄劍 // 輕吹.
- **`shu-heng-zhuo-an-npl`** : 豎橫 《卓菴》 NPL. 《卓菴》 est un poème du
  中和集 (卷五) ; 豎橫 vient de 直豎須彌柱，橫安太極楹. Et NPL ?

## Lot 6 — formats et notes (9 pièces)

- Formats des pièces qui ont un texte et ne sont pas des idées :
  `jiao-xue`, `shu-hu-hun-dun` (25 colonnes), `yi-zhi-xuan-yi-rui-tu-wei`,
  `jing-xin-jing-yi-cheng-jian-jing`, `tian-ren-di`,
  `si-wei-yi-xing-zhu-zuo-wo`.
- Notes prises pour des colonnes : `jiu-san-er-ba-he-tu` (« incroyable »),
  `yi-zhi-xuan-yi-rui-tu-wei` (deux phrases en français).
- La pièce `tian-ren-di` porte le nom de son projet : pièce ou page-pôle ?

## Lot 7 — les 12 projets (24 marques)

En dernier, quand on sait quelles pièces chacun garde. L'agent propose un
brouillon de présentation à partir des pièces, et un thème parmi `ink`,
`jade`, `cinnabar`, `indigo` ; le calligraphe écrit le texte final.
