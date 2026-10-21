# Aucune donnée de mémoire

Un fait écrit dans le dépôt — un texte, une leçon, une attribution, une datation, une édition — vient d'une source consultée et citée à côté de lui : la page de zh.wikisource, le 卷 du 全唐詩, le fac-similé du 道藏, la Pléiade, ou la parole du calligraphe. Cela vaut pour `docs/sources/`, pour le plan d'import et pour `content/`. Ce qu'aucune source consultée ne donne ne s'écrit pas : il reste à relever (« à relever dans la Pléiade »), ou il se demande au calligraphe. Le dépôt est la source de vérité, et une pièce recopie ce que ses textes de référence affirment : une erreur qui y entre se propage, et rien ne la distingue plus d'un fait établi.

## Options écartées

- **Écrire de mémoire, en le marquant** (« donné de mémoire, non collationné ») : la marque se perd dès que le fait est repris dans une pièce ou dans un autre texte de référence, et un fait marqué n'est jamais relevé ensuite. Au lot 5, les attributions des vers du 占花名兒 et la datation du 胎息經 sont entrées ainsi (#56).
- **S'autoriser la mémoire pour les faits notoires** : la frontière entre un fait notoire et un fait mal retenu ne se voit pas de l'intérieur, et c'est l'agent qui la tracerait.

## Conséquences

Les traductions de `docs/sources/` restent des traductions de travail (ADR 0002) : elles sont un travail, pas un fait, et ne demandent pas de source. Les leçons, elles, en demandent une, comme le 氣 du fac-similé du 道藏 contre le 炁 du 胎息經註. Un fait sourcé qu'une autre source contredit garde les deux, chacune citée. Une revue de code vérifie que chaque fait nouveau porte sa source.
