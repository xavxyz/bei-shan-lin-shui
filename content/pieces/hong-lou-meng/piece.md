---
# la page-pôle de Notion (太虚幻境红楼梦) ; titre en traditionnel confirmé par le scan
# la v2 la réduit à 紅樓夢, d'où son titre : le distique et 太虛幻境 vivent dans le 牌樓聯 (feuille 1)
# date du papier : signé 丙午雨水 (Notion disait 2026-01-15)
# 真 et 無 en graphies changeantes (眞 pour le 1er 真), à la frontière du style libre ; 虛 écrit 虚
title: 紅樓夢
slug: hong-lou-meng
projects:
  - hong-lou-meng
status: in-progress # made jusqu'à l'erreur relevée en v1, refaite en v2
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
    date: 2026-10-20
    format: "[(1x3)]"
    columns: [紅樓夢]
    variations:
      - id: v2a
        script: kaishu
        status: to-try
published: true
---
