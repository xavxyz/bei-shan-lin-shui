# Scans du Drive — à arbitrer

État au 2026-10-11. Les 91 scans du Drive ont chacun leur entrée dans
`scans.yaml`, triée par nom de fichier. **Toutes** portent `# à arbitrer`,
y compris 01 à 08, déjà arbitrées une première fois : tout est à revoir au
calme. Les entrées de 10_01 à 33_09 ont été écrites par des sous-agents,
une par scan ; ce sont des propositions, pas des lectures confirmées.

## Valeurs hors vocabulaire, passées en commentaire

`pnpm validate:imports` les refuse ; elles attendent l'arbitrage en commentaire.

- **12_01** et **18_01** : style proposé `lishu` (隸書), absent de `SCRIPTS`
  (kaishu, xingshu, xingcao, caoshu, kuangcao, ziyou). Arbitré : lishu
  n'entre pas au vocabulaire ; le style de ces deux scans est à reprendre.
- **18_04** et **33_07** : variation proposée `attempt`, devenu `study`, qui
  est un type d'image et non un identifiant de variation (`v1a`…).

## Cas à arbitrer à l'étape 2

Les questions transverses sont tranchées dans « Règles arbitrées » de
`.claude/skills/scans/SKILL.md` (2026-10-15) : place d'une feuille (variation,
étude ou `discarded`), version, dates, graphies, pièces absentes de Notion,
noms sans numéro de feuille. Restent les cas, à revoir à leur lumière.

### Plusieurs feuilles d'une même pièce

10, 11, 14, 16, 17, 18, 20, 21, 22, 25, 26, 31, 32 et 33 : variation ou
étude, feuille par feuille. 26, 32 et 33 alternent kaishu et cursive : une
variation par style.

### Études ou exercices

- **10_01, 10_03, 10_05** : grilles 3x5 d'exercices en simplifié, au recto
  de 過猶不及 : `discarded`, sauf si leurs caractères sont ceux de la pièce.
- **13_02, 13_03** : 流 répété et tiges célestes. Exercice ou pièce ?
- **18_03, 18_04** : essais de 水火調劑 sur grille 米, ou à écarter ?
- **20_02** : 修 / 養 / 虛 ×5, du kaishu au caoshu. Corps de 煉丹 ou étude ?
- **30_01** : 宇八宇, essai sur 宇 (de 戈澤宇) ?
- **31_02** : 字字字 (ou 守 ?), exercice ?
- **15_01** : 龍騰虎躍, « 戈試越來越書 » : étude de `deng-shan-ge-jue`
  (六龍騰岱六虎躍崑), arbitré.
- **33_02 à 33_08** : deux caractères de 33_01 par feuille : études de la
  variation de 33_01.

### Pièces absentes de Notion

L'agent propose le slug, le calligraphe le confirme ; pas de projet sauf
indication du papier ou de Notion.

| Scans    | Texte lu                                  | Pistes                                                                                         |
| -------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 12_01    | 閃仚機 ?                                  | lecture très incertaine ; `shu-heng-zhuo-an-npl` ?                                             |
| 13_01–03 | 流, 未干, 山川臨 ?                        | étude de 流 ? daté 丙午春分 / 23 ou 29.3.26                                                    |
| 14_01–03 | 地支 (12 branches et animaux)             | `di-zhi`, projet tian-ren-di ? 28.3.26 alors que 春分 = 20 mars                                |
| 16_01–06 | 龍 / 騰, lignes du 乾 (潛龍, 見龍, 亢龍…) | une pièce 乾 ou un projet ? 16_03 : récit en prose + sceau 龍                                  |
| 17_01–03 | 虎, 肅書 ?, 躍, 履虎尾                    | pièce 履虎尾 ou études de `deng-shan-ge-jue` ?                                                 |
| 18_01–04 | 水火調劑 (未 / 既), 臨菓 ?                | projet zhong-he-ji ?                                                                           |
| 19_01–02 | 吐納 (kaishu puis caoshu)                 | v1a / v1b (un style par variation)                                                             |
| 20_01–02 | 煉丹, 修養虛                              | ou `lian-xu-ge` (鍊虛歌) ?                                                                     |
| 21_01–02 | 凝聚 / 聚精會神                           | ou lié à `an-zhi-shi-zuo-zhu-yi-fang-xin` ? date 13 ou 19.4.26                                 |
| 22_01–02 | 醫王會 / 禪指壓 (Iokai Shiatsu)           | une pièce ou deux ? 医/会/圧 : simplifié ou libre, jamais japonais                             |
| 23       | 篤志力行 / 專心警省                       | daté ? 立夏 ; mains imprimées au-dessus des colonnes                                           |
| 27       | 飛鴻戲海 / 雲鶴遊天                       | 飛鴻 ou 群鴻 (梁武帝 sur 鍾繇) ? 丙午小滿                                                      |
| 30_01–03 | 成人不自在 / 自在不成人 (紅樓夢 82)       | projet `tai-xu-huan-jing-hong-lou-meng` ? 30_03 : traduction manuscrite                        |
| 31_01–04 | 虛靈頂勁, 松胯                            | pièce à part, ou études de `yi-shou-yi-dian-jin-gang-qi` / `meshkah` / `fang-xin-song-kua-…` ? |

### Le papier contredit le plan

- **11 `shi-ren-jin-ge`** : 11_02 daté 25.2.26, Notion disait 2026-01-22.
  Sur 11_01, 麥 écrit 麦 ; sur 11_02, 回 de forme particulière. Style libre ?
- **10 `guo-you-bu-ji-…`** : 10_02 (③) est en simplifié (过犹). Sur 10_06,
  un caractère au stylo entre 制 et 宜, avec 制 encadré : correction ?
- **24 `diao-shen`** : daté 立夏 (2026-05-05), Notion disait 2026-03-03
  « À refaire ». v1a ou reprise v2 ?
- **25 `gui-she-…-zhong-he`** : daté 立夏, Notion disait 2026-01-09. v2 ou
  correction de date ? 25_02 : v1b ou essai ? 眞 pour 真.
- **26 `tai-quan-zhu-shan-an`** : le papier écrit 勢 là où le titre a 𫝑.
  Colonnes vides au plan ; 1x2 par feuille contre 3x2 au plan. 26_01
  (戈謂之意 ?, 立夏) et 26_08 (?合掌) font-elles partie de la pièce ?
- **28 `you-xin-qiu-rou-wu-yi-cheng-gang`** : le scan ne montre que le titre
  en 2x4, le plan dit 1x8 + 道德經 76 + 2 竹. v2 ou étude ? Que représente
  le long trait vertical ?
- **29 `zao-hua-zhong-shen-xiu-…`** : grande cursive, 化 et 鍾 incertains ;
  au plan en idée, proposé `made`. caoshu, kuangcao ou ziyou ?
- **32 `fang-xin-song-kua-…`** : 32_04 signé 丙午處暑 (2026-08-23), 32_01
  porte « 8 26 », Notion disait 2026-07-12. Signature 戈化 ou 戈作 ?
- **31_04** : 松 sur le papier, 鬆 au plan.
- **33 `mo-si-wen-ke`** : colonne 2 lue 血珠玄鋒, le plan dit 血珠成鋒玄 ;
  une colonne 3 路此山岸 (ou 路此岸) manque au plan. Daté 30.8.26, le plan
  dit 2026-04-05. 33_06 / 33_07 (石 sur 夂) : 路 décomposé en style libre ?
  33_09 en cursive : v1b ?

### Lectures à confirmer, en vrac

- 16_01 : 無用 sur le papier, 勿用 dans le 易經.
- 16_02 : 二九 inversé exprès ?
- 16_03 : 登石如 pour 鄧石如 ?
- 16_05 : 利 ou 初 ?
- 16_06 : 騰 avec 肉 en entier à la place de 月, voulu ?
- 17_02 : 肃 ou variante de 肅 ?
- 18_02 : 劑 en style libre ? 18_03 : 劑 ou 齊 ?
- 13_02 : 固 pour 戊 en style libre ?
- 33_05 : 墨 avec le 土 glissé entre 里 et 灬, style libre ?
