---
# absente de Notion : identifiée sur les scans 2026-10-11_16_01 à 16_06 (registre imports/scans.yaml, retiré à l'import : git show 954688d:imports/scans.yaml)
# feuilles 一 à 六 : explorations du dragon, pendant de 虎躍 dans le projet long-teng-hu-yue ;
# sur 一 二 五 六, une ligne du 乾 (易經, 卦一) : 初九, 九二, 九五, 上九 ; le 九四
# (或躍在淵) manque, 四 porte 藏鋒歛銳 à la place
# 戈說 : les écarts avec le 易經 (無用, 二九, 五九) sont innocents, écrits comme un débutant 蒙
# qui ne sait pas comment 屯 s'écrit le 周易 ; jeu de mots implicite sur les hexagrammes 3 et 4
title: 龍騰
slug: long-teng
projects:
  - long-teng-hu-yue
status: made
versions:
  - id: v1
    # date du papier : une par feuille, 28 3 26, 29 3 26, 丙午春分, 5 4 26, 6 4 26,
    # 7 4 26 ; date stockée : la première feuille (春分 → 2026-03-28 aussi)
    date: 2026-03-28
    format: 1x4 + 1x2 + 1x4 + 1x2 + 1x1 + 1x1 + 1x3 + 1x2 + 1x4 + 1x1 + 1x3 + 1x2
    columns:
      - 龍龍龍龍 # 16_01 ; du régulier vers la cursive
      - 龍龍
      - 龍龍龍龍 # 16_02 ; gauche de 龍 tirée du sceau, droite écrite 龙 : style libre
      - 龍龍
      - 龍 # en grand
      - 龍 # 16_03 ; sceau rouge en sigillaire, dans un cadre
      - 騰騰騰 # 16_04
      - 騰騰 # le dernier en grande cursive
      - 騰騰騰騰 # 16_05
      - 騰 # très cursif, 月 en une boucle
      - 騰騰騰 # 16_06 ; 肉 pour 月, 火 pour 灬 : 騰 écrit en style libre
      - 騰騰
    variations:
      - id: v1a
        script: ziyou
        status: kept
        images:
          # feuille 一 : inscription 初九潛龍無用 (易經 : 潛龍勿用) ; signé 戈, 28 3 26
          - file: v1a-01.jpg
            kind: work
            capture: scan
            featured: true
          # feuille 二 : inscription 二九利見大人 (le 九二 : 見龍在田，利見大人) ; signé 戈, 29 3 26
          - file: v1a-02.jpg
            kind: work
            capture: scan
          # feuille 三 : grille imprimée 5x11, récit en kaishu : 很久以前奶奶的茶几上一直放着
          # 一本書，書上我多次看見一個篆字，看不懂它是什麼。我就學完了這本書，才明白。
          # 我把騰蛇臨寫登石如。右逸聞 ; 登 pour 鄧 (鄧石如), jeu de mots ; 看 écrit 手目 /
          # 目手, 懂 écrit 董, 着 pour 著 ; le 篆字 est le 龍 au sceau rouge ; signé en rouge
          # 丙午春分 戈澤宇
          - file: v1a-03.jpg
            kind: work
            capture: scan
          # feuille 四 : note 藏鋒歛銳 (歛 pour 斂), flèche vers la signature ; signé 戈, 5 4 26
          - file: v1a-04.jpg
            kind: work
            capture: scan
          # feuille 五 : inscription 五九利見大人 (le 九五 : 飛龍在天，利見大人) ; 利 au 刂
          # écrit 刀 ; signé 戈, 6 4 26
          - file: v1a-05.jpg
            kind: work
            capture: scan
          # feuille 六 : inscription 上九亢龍有悔 ; signé 戈, 7 4 26
          - file: v1a-06.jpg
            kind: work
            capture: scan
published: true
---
