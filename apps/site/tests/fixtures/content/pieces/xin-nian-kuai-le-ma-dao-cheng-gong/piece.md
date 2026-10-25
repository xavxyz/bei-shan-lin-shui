---
# écrite en 3 exemplaires sur une même feuille (v1), puis découpée et collée en
# 3 feuilles sur papier rouge (v2), offertes : dans le salon de la mère (v2a), dans
# le bureau du père (v2b), chez le frère (v2c, photo manquante) ; les variations de
# v2 suivent l'ordre de la feuille, de droite à gauche
title: 新年快樂，馬到成功
slug: xin-nian-kuai-le-ma-dao-cheng-gong
status: made
versions:
  # la feuille 米字格 entière, avant découpe : de droite à gauche, trait fin,
  # trait épais, formes libres
  - id: v1
    date: 2026-02-17
    format: 6x4
    columns: [新年快樂, 馬到成功, 新年快樂, 馬到成功, 新年快樂, 馬到成功]
    variations:
      - id: v1a
        script: ziyou # la feuille alterne régulier et formes libres
        status: kept # la feuille n'existe plus entière, elle est devenue v2
        images:
          # capture d'une vidéo partagée à la famille pour le nouvel an chinois
          - file: v1a.jpg
            kind: work
            capture: photo
            featured: true
  # chaque paire de colonnes découpée et collée sur papier rouge
  - id: v2
    date: 2026-02-17 # date du collage inconnue, au plus tard le nouvel an ; retenue par le calligraphe
    format: 2x4
    columns: [新年快樂, 馬到成功]
    variations:
      # 戈說 : trait fin, voulu ; la paire de droite de v1
      - id: v2a
        script: kaishu
        status: kept
        images:
          # dans le salon de la mère, contre une lampe ; marques
          # grises pâles entre les colonnes ; ni signature, ni date, ni sceau
          - file: v2a-01.jpg
            kind: context
            capture: photo
      # 戈說 : trait épais, voulu ; la paire du milieu de v1
      - id: v2b
        script: kaishu
        status: kept
        images:
          # dans le bureau du père, debout sur une étagère ; grille 米字格 collée sur
          # carton rouge ; ni signature, ni date, ni sceau
          - file: v2b-01.jpg
            kind: context
            capture: photo
      # la paire de gauche de v1 ; chez le frère, photo pas encore disponible
      - id: v2c
        script: ziyou
        status: kept
published: true
---
