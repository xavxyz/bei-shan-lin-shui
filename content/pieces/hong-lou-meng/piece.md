---
# la page-pôle de Notion (太虚幻境红楼梦) ; titre en traditionnel confirmé par le scan
# la v2 la réduit à 紅樓夢, d'où son titre : le distique et 太虛幻境 vivent dans le 牌樓聯 (feuille 1)
# date du papier : signé 丙午雨水 (Notion disait 2026-01-15)
# 真 et 無 en graphies changeantes (眞 pour le 1er 真), à la frontière du style libre ; 虛 écrit 虚
title: 紅樓夢
slug: hong-lou-meng
projects:
  - hong-lou-meng
status: made # en cours de l'erreur relevée en v1 à la v2, qui la refait
versions:
  # erreur de copie au premier vers : 真作假時假亦真 au lieu de 假作真時真亦假. Le vers ne part plus de
  # l'illusion prise pour le réel, mais du réel qu'on nie : l'avertissement au rêveur devient scepticisme.
  # Il ne répond plus non plus au second vers (假 face à 無, 真 face à 有), et casse la règle tonale
  # (平仄) du couplet : il finit sur un ton plat comme lui (真 / 無), là où le couplet veut un oblique
  # puis un plat (假 / 無)
  - id: v1
    date: 2026-02-25
    format: 3x7
    columns:
      - 真作假時假亦真 # tel que sur le papier ; le roman dit 假作真時真亦假 (chapitres 1 et 5)
      - 無為有處有還無
      - 太虛幻境紅樓夢
    variations:
      - id: v1a
        script: kaishu
        status: kept
        images:
          - file: v1a.jpg
            kind: work
            capture: scan
            featured: true
  # la v1 simplifiée : 紅樓夢 seul, sans le distique ni 太虛幻境, et donc sans l'erreur
  - id: v2
    date: 2026-10-20 # date du papier : 丙午季秋 ; photo du 2026-10-20
    format: "[(1x6/4, 1x3, 1x6/4)]" # disait [(1x3)] ; 上款 et 款 à main levée, hors grille, au quart du carreau environ
    columns: # disait [紅樓夢]
      # 戈說 : 程錦, ma professeur de chinois à l'institut Confucius de septembre à octobre 2025.
      # Nous n'avons eu que trois cours ensemble, puis sommes restés en contact : c'est grâce
      # à elle que j'ai lu le 紅樓夢.
      - 程錦女史清賞 # 上款 ; 女 avec un point en tête
      - 紅樓夢
      - 丙午季秋戈書 # le point de 戈 en rouge
    variations:
      - id: v2a
        script: kaishu
        status: kept
        images:
          - file: v2a.jpg
            kind: work
            capture: photo
            featured: true
          - file: v2a-02.jpg
            kind: context
            capture: photo
            caption: Sur la table de travail, avec les essais de 紅樓夢 et le 牌樓聯.
published: true
---
