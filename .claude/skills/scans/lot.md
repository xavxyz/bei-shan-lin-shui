# Scans en lot : un sous-agent par scan

Quand le calligraphe demande de traiter tous les scans en attente d'un coup.
Chaque sous-agent lit **un** scan et écrit **lui-même** son entrée au
registre ; la session principale orchestre et ne lit aucune image, n'écrit
rien dans le registre ni dans le plan. Le plan n'est pas touché : tout ce qui
sort d'un lot est `# à arbitrer`.

## 1. Inventaire

Comme l'étape 1 de `SKILL.md`, puis écrire la liste des scans en attente,
triée, dans `/tmp/scans-todo.txt`. Annoncer le nombre de scans et attendre le
feu vert.

## 2. Vagues

Au plus **20 sous-agents en même temps** : c'est la limite de l'outil, et
chaque lancement au-delà échoue. Lancer les 20 premiers, puis un nouveau à
chaque fin de sous-agent, jusqu'à épuisement de la liste.

Le prompt de chaque sous-agent est celui ci-dessous, avec `__FILE__` (le nom du
scan) et `__SIBLINGS__` (les autres feuilles de la même pièce, ou `aucune`)
remplacés. Le générer par `sed` depuis ce fichier plutôt que le réécrire.

À chaque retour, ne relayer au calligraphe qu'une ligne : le scan, le match, la
confiance. Noter les erreurs de validation rapportées pour la passe finale.

Fini quand chaque scan de la liste a son entrée au registre, une seule :

```
grep 'file:' imports/scans.yaml | sed 's/.*file: *//; s/ .*//' | sort > /tmp/scans-done.txt
comm -23 /tmp/scans-todo.txt /tmp/scans-done.txt   # manquants
sort /tmp/scans-done.txt | uniq -d                  # doublons
```

## 3. Passe finale

Un dernier sous-agent remet les entrées dans l'ordre des noms de fichier, lance
`pnpm exec prettier --write imports/scans.yaml` puis `pnpm validate:imports`,
et corrige jusqu'à ce que la validation passe. Une valeur que le vocabulaire
refuse devient un commentaire `# à arbitrer — <champ> proposé : <valeur>`,
jamais une valeur perdue.

Fini quand `pnpm validate:imports` passe.

## Prompt du sous-agent

```
Tu traites UN scan du Drive de calligraphie et tu ajoutes toi-même son entrée au registre. Tu travailles à la racine du dépôt.

Ton scan : __FILE__
Autres feuilles de la même pièce sur le Drive (à regarder pour comprendre l'ensemble, sans écrire leur entrée) : __SIBLINGS__
Dossier du Drive : ~/Library/CloudStorage/GoogleDrive-*/Mon Drive/Bèishān línshuǐ 背山臨水/

À lire d'abord : CLAUDE.md, GLOSSARY.md, .claude/skills/scans/SKILL.md (surtout « Lire », « Chercher » et « Règles arbitrées »), et l'en-tête plus quelques entrées de imports/scans.yaml pour en reprendre la forme exacte.

Travail :
1. Lis le scan avec Read, colonne par colonne, de droite à gauche. Relève aussi l'attribution, la signature (戈), la date et les notes en français. Pour zoomer, recadre dans /tmp uniquement (par exemple `sips -c` ou `sips --cropOffset`), jamais dans le dépôt.
2. Cherche la pièce : grep de deux ou trois séquences de 2 à 4 caractères dans imports/*.plan.yaml (titre, columns, source.full_text) et dans content/pieces/. `match` vaut un slug du plan, `new`, `unidentified` ou `discarded` (verso, exercices de traits).
3. Ajoute l'entrée au registre. L'entrée elle-même et chaque champ dont tu n'es pas sûr portent `# à arbitrer` : rien n'est arbitré par le calligraphe. `read` ne contient que des caractères chinois ; tout le reste va en commentaire. `script` prend une valeur de SCRIPTS (packages/schema/src/vocabulary.ts), avec `# à arbitrer`. `variation` est un identifiant de variation (v1a, v1b, v2a…), seulement si une proposition s'impose, avec `# à arbitrer` ; une étude se note en commentaire (`image kind: study`). Termine par des commentaires courts : format, date du papier, écarts avec le plan, questions pour le calligraphe.

Règles d'écriture (d'autres agents écrivent dans le même fichier au même moment) :
- Avant d'écrire, vérifie que `grep -c 'file: __FILE__' imports/scans.yaml` vaut 0. Sinon arrête-toi et dis-le.
- Écris en UN SEUL appel Bash : `cat >> imports/scans.yaml <<'EOF'` avec une ligne vide, puis l'entrée indentée de 2 espaces (`  - file: __FILE__`). N'utilise jamais Edit ni Write sur ce fichier, ne le réécris jamais.
- Lance ensuite `pnpm validate:imports`. Si une erreur désigne __FILE__, ne retouche pas le fichier : recopie l'erreur dans ta réponse, la passe finale la corrigera. Les erreurs des autres scans ne te regardent pas.
- N'écris nulle part ailleurs dans le dépôt : ni le plan, ni imports/scans/, ni aucun autre fichier. Ne renomme rien sur le Drive. Le nom exact du Drive va dans `file`, même hors format.

Réponds en 3 lignes au plus : le match proposé, la confiance, et la question principale pour le calligraphe (ou l'erreur de validation).
```
