# Plan Notion — à arbitrer

État au 2026-10-21, après le lot 6. Le plan `notion-2026-08-23.plan.yaml` porte 93 pièces et 11 projets ; il ne reste que les **22** `# à arbitrer` des 11 projets, le lot 7. Aucune pièce n'a plus rien à arbitrer au titre des lots 0 à 6. Le suivi se fait par les `# à arbitrer` du plan : ce fichier les résume, lot par lot, et disparaît avec le plan (#17).

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

## Lot 4 — fait

Les autres textes connus. Le calligraphe a choisi l'étendue et la leçon sur les textes traduits vers par vers, gardés en référence dans `docs/sources/` : `qing-jing-jing.md`, `xing-qi-yu-pei-ming.md`, `bai-zi-bei.md`, `pang-xie-yong.md`.

- `yi-jin-jing` 易筋經 : arbitré avec son projet (PR #46).
- `tai-shang-lao-jun-shuo-chang-qing-jing-jing` : le 經 entier, 391 caractères, sans les trois postfaces. Leçons du 道藏 contre la vulgate : 心擾之, 動者靜之基, 真常應物, 名為得道. Le titre seul sur sa feuille, à l'horizontale, puis cinq feuilles paysage de 10 colonnes de 8 : `[(1x9h), (10x8), (10x8), (10x8), (10x8), (10x8)]`.
- `bai-zi-bei` 百字碑 : le poème entier, 100 caractères, 返覆 au vers 11. Une v1 en A4, `[(7x15)]`, trois vers par colonne, avant le grand format (45x90 cm, sur le 心性圖) d'une v2.
- `xing-qi-yu-pei-ming` 行氣玉佩銘 : le texte de 郭沫若, 幾 et 退, comme Yang Jwing-Ming (son 几 est le simplifié de 幾). Une v1 en A4 à la manière du jade, 36 caractères et les 重文 ＝ dans la case de leur caractère, `[(4x9)]`, avant le grand format (45x90 cm, sur le 修真後內外火候圖) d'une v2.
- `pang-xie-feng-ci` 螃蟹諷刺 : le distique 眼前道路無經緯 / 皮裏春秋空黑黃 du 螃蟹詠 de 寶釵, puis 只是諷刺世人太毒了些, la fin du jugement des convives, `[(2x7, 1x10)]`. Le texte est le même dans le 庚辰本, les 程本 et l'édition courante (人民文學出版社), au 諷剌 du 程甲本 près, coquille de l'imprimé.
- `diao-xi` 調息 et `diao-xin` 調心 : le livre est Yang Jwing-Ming, _Qigong Meditation: Small Circulation_, chapitre 4 (五調). Il n'y a pas de chaîne de trois vers comme pour 調身 ; Yang cite le 《性命圭旨》 (亨集). 調息 (4-3) : 以如來空空之心 / 合真人深深之息 / 則心息相依 / 息調心淨, `[(1x2, 4x7)]` ; la citation de 白玉蟾 qui ouvre le passage s'arrête à 只要凝神入氣穴, la phrase est du compilateur, d'après 晁迥 (宋), 《法藏碎金錄》 卷八. 調心 (4-4) : 身不動而心自安 / 心不動而神自守, après 沖妙云, `[(1x2, 2x7)]`. On cite la source, le 《性命圭旨》, pas d'auteur. Le titre à droite, en premier.
- `diao-shen` 調身 : sa formule est de Yang (4-2), absente du 《性命圭旨》 ; aucune source classique trouvée. Le livre est sa source, sans auteur, comme pour 調息 et 調心.

## Lot 5 — fait

Les titres ambigus, sur la lecture du calligraphe. Sources gardées en référence : `hong-lou-meng.md` (sections 5 à 7), `zhong-he-ji.md` (sections 8 et 9), `tai-xi.md`.

- `bao-yu-si-shou-shi-…` devient `bao-yu-si-lu` 寶玉四律 · 省親 : les quatre 五律 du chapitre 18, dont 杏帘在望, écrit par 黛玉 pour lui ; les 即事詩 du chapitre 23 sont des 七律. Dans le projet `hong-lou-meng`.
- `zhan-hua-ming-er` 占花名兒 : les huit fiches du chapitre 63, chacune sa devise et son vers ; qui la tire et sa fleur vont dans la colonne de signature.
- `hu-si-luan-xiang` 胡思亂想 : les deux distiques qui l'entourent, la rêverie (悠悠生死別經年 / 魂魄不曾來入夢, chapitre 109, du 《長恨歌》) puis sa réponse (禪心已作沾泥絮 / 莫向春風舞鷓鴣, chapitre 91, d'après 道潛), `[(1x4, 2x7, 2x7)]`.
- `tai-xi` 胎息 : 神行即氣行 / 神住即氣住, le seul 5+5 du 《胎息經》, 氣 du 道藏 et 即, `[(2x5)]`. Dans le projet `qi-gong`.
- `zhu-jian-qing-chui` 鑄劍 // 輕吹 : le 《鑄劍》 du 中和集 en entier. 輕吹 est le souffle léger du soufflet, le feu doux, d'après 吹噓離火巽為風 ; il n'est pas dans le livre.
- `shu-heng-zhuo-an-npl` devient `shu-heng-zhuo-an` 豎橫 《卓菴》, `made` : la v1 est la couverture 山竪橫 en style libre, le scan `2026-10-11_18_01`, prise jusque-là pour la feuille ① de `shui-huo-tiao-ji`, qui garde la date du 2026-04-19, même séance. La v2, une idée : 豎橫, puis 直豎須彌柱 / 橫安太極楹, du premier 《卓菴》. NPL passe dans son `intention` : le studio-atelier face à la mer. 豎 et 橫 sont aussi les traits de la méthode de 山山 : le lien avec 方圓, défini au glossaire. Ses cinq points : #55.

## Lot 6 — fait

Les formats des pièces qui ont un texte, et les notes prises pour des colonnes. Sans scan, un format est déduit des colonnes de Notion et marqué `# supposé`.

- `jiao-xue` 教/學 : `[(1x4, 2x6)]` supposé ; à refaire.
- `yi-zhi-xuan-yi-rui-tu-wei` : `[(1x7)]` ; des deux phrases en français, la littérale devient la traduction, la lecture l'intention.
- `jing-xin-jing-yi-cheng-jian-jing` : la photo `IMG_0619.HEIC` (`2026-10-21_01_01`) devient `v1a`, `ziyou`. Les colonnes suivent le papier, le 款 à droite : 丙午雨水末戈澤宇遇道靜讓 / 靜心淨 / 意誠兼靜. Le format est « mixte », le grand 靜 n'entre pas dans la notation. 靜讓 est le nom chinois inventé pour Lucie Calmejeanne ; 遇道 joue sur 遇到.
- `tian-ren-di` 天人地 : une pièce, la pièce-pôle de son projet ; `[(1x3)]` supposé.
- `si-wei-yi-xing-zhu-zuo-wo` : `[(1x4, 1x3/2)]`, 四威儀 en demi-carreaux comme un titre dans le 款, comparé sur grille.
- `shuo-dao-xin-suan-chu` : `[(4x5)]`, un vers par colonne.
- `jiu-san-er-ba-he-tu` est retirée : la source est perdue. C'était une conjecture sur le 河圖, ses points blancs 9 et 3, noirs 2 et 8. Dans le 中和集 (zh.wikisource), 九三 et 二八 ne se rencontrent qu'au 《詠眞樂十二首》 : 九三輻輳諸緣息，二八相交五氣朝 ; 河圖 n'y est pas.
- `shu-hu-hun-dun` 儵忽混沌 : les deux feuilles de Notion sont perdues. Leurs pièces reviennent en idées, de nouvelles v1 :
  - la pièce elle-même devient les deux premiers vers du 《元陽洞》 de 唐順之 (明, 荊川集), 混沌遇儵忽 / 誤被鑿一竅, `[(2x5, 1x7/2)]` ; le 莊子 (應帝王) est abandonné, et le projet `shu-hu-hun-dun` avec lui ; `qi-huan-shu-hu-yi-mao-fen-xing` reste, sans projet ;
  - `shen-shu-qu-qiao-shou-hun` 慎術 去巧 守渾, `[(3x2)]`, sans source : sans doute d'une séance de questions à Claude ;
  - `chuan-bu-xi-hu` 傳不習乎, `[(1x4, 1x4/2)]` : c'est 曾子 qui parle (論語, 學而), pas 孔子 comme le disait le papier ;
  - abandonnées : 學者須先立定心體…, introuvable dans le 傳習錄 qu'attribuait le papier, et 不慌不忙無心無為, sans source.

## Lot 7 — les 11 projets (22 marques)

En dernier, quand on sait quelles pièces chacun garde. L'agent propose un brouillon de présentation à partir des pièces, et un thème parmi `ink`, `jade`, `cinnabar`, `indigo` ; le calligraphe écrit le texte final.
