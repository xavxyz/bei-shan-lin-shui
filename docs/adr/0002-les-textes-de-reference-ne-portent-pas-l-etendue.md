# Les textes de référence ne portent pas l'étendue retenue

Le texte d'où une pièce est tirée vit dans `docs/sources/`, traduit vers par vers, avec ses leçons et ses étendues candidates (➡️). L'étendue retenue n'y est pas : elle vit dans la pièce, ses colonnes, et dans le plan tant qu'il n'est pas appliqué. Un texte de référence sert plusieurs pièces et plusieurs versions — le 《原道歌》 entier, promis par une `intention`, ou une nouvelle pièce prise au même 中和集 — et survit donc au plan, qui disparaît une fois appliqué (#17).

## Options écartées

- **Garder les textes avec le plan, dans `imports/`** : ils disparaîtraient avec lui, alors qu'ils resserviront.
- **Marquer l'étendue retenue dans `docs/sources/`** : une seconde source de vérité, qui diverge de la pièce. Au lot 3, `lian-xu-ge` portait 個, d'après le 个 du 道藏, quand le papier de `xu-xin-shi-fu` porte 箇.
- **Le texte entier dans `source.full_text` de chaque pièce** : le même texte recopié dans chaque pièce qui y puise, et des traductions faites par des agents à côté du contenu, où la traduction s'écrit à la main.

## Conséquences

Les ➡️ restent des candidates, même une fois une étendue choisie. Les traductions de `docs/sources/` sont des traductions de travail, jamais reportées dans `translation`. Les leçons douteuses y sont relevées ; une leçon tranchée se commente dans la pièce.
