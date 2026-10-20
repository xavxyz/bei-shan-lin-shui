# Plan Notion — à arbitrer

État au 2026-10-19, après le lot 3. Le plan `notion-2026-08-23.plan.yaml` porte 92 pièces et 12 projets ; il reste **48** `# à arbitrer`, sur 20 pièces et les 12 projets. Les 72 autres pièces, dont les 36 qui ont un scan, n'ont plus rien à arbitrer. Le suivi se fait par les `# à arbitrer` du plan : ce fichier les résume, lot par lot, et disparaît avec le plan (#17).

Un lot commence par ce fichier seul : l'issue #17 et les PR des lots précédents n'apprennent rien de plus, sauf doute sur une décision numérotée.

L'agent propose pièce par pièce, au format de la skill `scans` ; « ok » accepte tout.

## Sources primaires

Le texte d'une pièce se cherche par un **subagent**, un par pièce ou par source. Il rend le passage retenu, les variantes entre éditions et les liens, jamais la page entière : une page de ctext coûte 25k de contexte, une image zoomée 2 à 5k.

- **zh.wikisource** : le wikitexte d'un livre s'obtient par `https://zh.wikisource.org/w/index.php?title=<titre>&action=raw`.
- **ctext** passe derrière Cloudflare, et son API ne donne que les métadonnées. Il se lit par le Chrome du calligraphe, connecté à son compte (`/chrome` avant de commencer) : `javascript_tool` fait `fetch('/wiki.pl?if=gb&chapter=<n>')` et ne renvoie que le passage voulu. Les images des pages sont à `library.pl?if=gb&file=<n>&page=<p>` ; le panneau de droite est un OCR illisible, on lit l'image à gauche.

## Règles arbitrées

- **Une pièce sans texte n'est pas importée** (décision 2 de #17).
- **Le titre porte le texte.** Une pièce sans texte a son texte dans son titre la plupart du temps ; sinon, le titre dit où le prendre (2026-10-17).
- **Une idée entre avec `format: à préciser`.** Le format d'une pièce au statut `idea` ne bloque pas `apply` ; ses marques `version.format` sont retirées au lot 0 (2026-10-17).
- **Le traditionnel de Notion se garde.** Une conversion ne remplace pas un caractère déjà traditionnel par sa variante (`泄`, `朱砂`, `卷`) ; une variante voulue se garde en notant le caractère dont elle varie (`# 洩, variante de 泄`) (2026-10-19).
- **Un simplifié voulu se garde**, avec son commentaire : il s'oppose au traditionnel sur le papier (`（罗）羅`, `虎书`). `丑`, la branche terrestre, est traditionnel (2026-10-19).

## Lot 0 — fait

- La marque périmée de `tai-quan-zhu-shan-an` est retirée : ses colonnes ont été posées à l'arbitrage des scans.
- Les marques `version.format` des 22 idées sont retirées.
- Les marques du projet `xian-xian-ji` sont remises au-dessus de lui.
- `long-hu-ge-mian-zhan-mian-zhan`, `ri-yong` et `jiao-he`, sans texte et sans marque, en reçoivent une.

## Lot 1 — fait

- Les 36 marques de conversion, sur 28 pièces, sont levées : 29 acceptées telles quelles ; `卷上` et `占花名兒` corrigés, `朱砂` et le `泄` de `meshkah` rendus à Notion, le `洩` de `zi-ti-xiang` gardé en variante, `（罗）羅` rendu au simplifié voulu.
- Deux formats en simplifié, sans marque, convertis : `修真後內外火候圖` (`xing-qi-yu-pei-ming`), `心性圖` (`bai-zi-bei`).
- **Projet `yi-jin-jing`** 易筋經, désigné par le calligraphe : la pièce `yi-jin-jing`, dont l'avertissement 不按指示做，磨磚豈成鏡 est tout le texte ; `mo-li-li` devenue `bao-jian-feng-cong-mo-li-chu-ku-lian` (苦煉 // 寶劍鋒從磨礪出) ; une nouvelle idée, `mei-hua-xiang-zi-ku-han-lai-xia-gong-fu` (下功夫 // 梅花香自苦寒來). Le mot est le sujet, le vers l'explique.

## Lot 2 — fait

Le titre porte le texte, découpé en colonnes ; un format pour les pièces qui ne sont pas des idées. Sources vérifiées sur zh.wikisource.

- `fang-yuan` 方圓, `xiu-zhu-can-cha` 修竹參差 (`1x4`, scan attendu), `wu-qi-chao-yuan-shen-xin-ping-heng` 五氣朝元 · 身心平衡.
- `xin-nian-kuai-le-…` 新年快樂 · 馬到成功 (`2x4`) : produite en 3 exemplaires, photos de contexte à demander.
- `ji-jing-zhong-she-xin` 寂靜中攝心 : `made`, papier introuvable, à refaire ; `1x5` supposé.
- `zi-de-shen-xin-ding` : le 5ᵉ des sept 《自得》 du 中和集 (卷五), en entier.
- `jing-zhong-qiu-dong` devient `dong-zhong-qiu-jing` 動中求靜, le dixième des dix points de 楊澄甫, dans leur projet.
- `wei-er-bu-fan-…` devient `wei-er-bu-meng-he-er-bu-tong` : 威而不犯 n'a pas de source, 威而不猛 est au 論語 (述而, 堯曰).
- `shen-yu` 神遇 : 庖丁 · 臣以神遇而不以目視 (`1x2 + 1x9`, 莊子, 養生主).
- `zao-hua-…` : 造化鍾神秀，陰陽割昏曉 est de 《望嶽》 ; 杜甫 n'a pas de《登泰山》. Slug raccourci.
- `tai-xu-huan-jing-ji-shi-zhen-ru-fu-di` et `jia-zuo-zhen-shi-zhen-yi-jia` deviennent une pièce en trois feuilles, `hong-lou-meng-pai-lou-lian` 紅樓夢牌樓聯 : 紅樓夢 · 太虛幻境即是真如福地, puis l'arche du 太虛幻境 (假作真時真亦假，無為有處有還無, chapitres 1 et 5), puis celle du 真如福地 (假去真來真勝假，無原有是有非無, chapitre 116).
- `zhong-he-ji` reste, à refaire en grand : 中和集 en `1x3`.
- `diao-xi` 調息 et `diao-xin` 調心 rejoignent `qi-gong` avec 調身 ; leur texte est à retrouver dans un livre de Yang Jwing-Ming (lot 4).

## Lot 3 — fait

Le titre renvoie au texte du 中和集 de 李道純 ; le calligraphe a choisi l'étendue sur les textes traduits vers par vers (正統道藏, zh.wikisource), gardés en référence dans `docs/sources/zhong-he-ji.md`. Leçons gardées : 須, 大霶霈, 裏.

- `lian-xu-ge` 《鍊虛歌》 est retirée : c'était `xu-xin-shi-fu`, dont les deux dernières colonnes, 虛心直節青青竹 / 箇是鍊虛第一機, sont la fin du poème.
- `gua-xiang-lun` 《卦象論》 : 水府求玄者，煉精氣神, puis de la citation de紫陽 (取將坎位中心實…) à 無爻卦內定乾坤, en 42 membres de phrase en attendant le format.
- `yuan-dao-ge` 《原道歌》 : 浮華亂目孰回光 / 薄霧牽情誰返照 ; le poème entier viendra en nouvelle version (`intention`).
- **Nouvelle idée `yu-suo-jin-jia-qi-jie-tuo`** 玉鎖金枷齊解脫, un vers du《原道歌》, dans le projet du 紅樓夢 (le 金鎖 de 寶釵, le 玉 de 寶玉) et dans celui du 中和集.
- `xuan-li-ge` 《玄理歌》 : du second chant, les vers 1-2 (治人事天莫若嗇…) et 13-20, les trois 息 ; elle ne rejoint pas `qi-gong`.
- `hui-jian` 《慧劍》 est retirée : trop précieuse pour être calligraphiée.
- `ri-yong` 《日用》 et `jiao-he` 《交合》, en paire : le 七律, puis le titre en `2x4`, 中和集詩 / 工夫日用 et 中和集詩 / 工夫交合.
- `long-hu-ge-mian-zhan-mian-zhan` : de la préface, la citation de 紫陽 (收拾身心，謂之降伏龍虎…) jusqu'à 神仙之能事畢矣, puis 勉旃勉旃, les vers 青青白白太分明 / 也是無風自起浪 et 徹底掀翻參學畢. Le `full_text` part désormais de la citation de 紫陽. Deux feuilles, `(1x3 + 9x7) + (1x4 + 3x7)` : la citation, puis l'exhortation et les vers ; le `13x7` d'une seule feuille attend une seconde version (`intention`).

Leçons douteuses non tranchées, hors des étendues retenues : 野雲翕 (翁 ?), 部天地 (剖 ?), 誰敢覬 (覷 ?), et dans le `full_text` du 龍虎歌 以卸天 (御), 束齊 (齋), 進開頂顧門 (迸開頂顖門 ?), 平地起，波濤.

Pour le lot 5 : le 述工夫十七首 contient un 《鑄劍》, qui éclaire peut-être `zhu-jian-qing-chui`.

## Lot 4 — les autres textes connus (7 pièces)

`tai-shang-lao-jun-shuo-chang-qing-jing-jing` 《太上老君說常清靜經》 · `xing-qi-yu-pei-ming` 行氣玉佩銘 · `bai-zi-bei` 百字碑 · `yi-jin-jing` 易筋經 (pas de passage : l'avertissement 不按指示做，磨磚豈成鏡 est tout le texte) · `pang-xie-feng-ci` 螃蟹諷刺 (le 螃蟹詠 de 寶釵, chapitre 38) · `diao-xi` 調息 et `diao-xin` 調心 (dans un livre de Yang Jwing-Ming, que le calligraphe n'a pas sous la main).

## Lot 5 — titres ambigus (6 pièces)

La lecture du calligraphe d'abord :

- **`bao-yu-si-shou-shi-…`** : les quatre 即事詩 de 寶玉 sont des 七律, le titre dit 五言律詩.
- **`zhan-hua-ming-er`** : quelles fiches du jeu (chapitre 63) ?
- **`hu-si-luan-xiang`** : `4 + 2x7`, quel distique ?
- **`tai-xi`** : 胎息 en `2x5`, le texte dépasse le titre.
- **`zhu-jian-qing-chui`** : 鑄劍 // 輕吹.
- **`shu-heng-zhuo-an-npl`** : 豎橫 《卓菴》 NPL. 《卓菴》 est un poème du 中和集 (卷五) ; 豎橫 vient de 直豎須彌柱，橫安太極楹. Et NPL ?

## Lot 6 — formats et notes (9 pièces)

- Formats des pièces qui ont un texte et ne sont pas des idées : `jiao-xue`, `shu-hu-hun-dun` (25 colonnes), `yi-zhi-xuan-yi-rui-tu-wei`, `jing-xin-jing-yi-cheng-jian-jing`, `tian-ren-di`, `si-wei-yi-xing-zhu-zuo-wo`.
- Notes prises pour des colonnes : `jiu-san-er-ba-he-tu` (« incroyable »), `yi-zhi-xuan-yi-rui-tu-wei` (deux phrases en français).
- La pièce `tian-ren-di` porte le nom de son projet : pièce ou page-pôle ?

## Lot 7 — les 12 projets (24 marques)

En dernier, quand on sait quelles pièces chacun garde. L'agent propose un brouillon de présentation à partir des pièces, et un thème parmi `ink`, `jade`, `cinnabar`, `indigo` ; le calligraphe écrit le texte final.
