# Scans en lot : un sous-agent par scan

Quand le calligraphe demande de traiter tous les scans en attente d'un coup. Chaque sous-agent lit **un** scan et écrit **lui-même** sa proposition, dans un fichier à lui : `imports/scans/<scan>.rattachement.yaml`, ignoré par git. La session principale orchestre et ne lit aucune image. Rien n'entre dans `content/` : tout ce qui sort d'un lot est `# à arbitrer`, et passe ensuite par les étapes 2 et 3 de `SKILL.md`.

## 1. Inventaire

Comme l'étape 1 de `SKILL.md`, puis écrire la liste des scans en attente, triée, dans `/tmp/scans-todo.txt`. Annoncer le nombre de scans et attendre le feu vert.

## 2. Vagues

Au plus **20 sous-agents en même temps** : c'est la limite de l'outil, et chaque lancement au-delà échoue. Lancer les 20 premiers, puis un nouveau à chaque fin de sous-agent, jusqu'à épuisement de la liste.

Le prompt de chaque sous-agent est celui ci-dessous, avec `__FILE__` (le nom du scan) et `__SIBLINGS__` (les autres feuilles de la même pièce, ou `aucune`) remplacés. Le générer par `sed` depuis ce fichier plutôt que le réécrire.

À chaque retour, ne relayer au calligraphe qu'une ligne : le scan, le match, la confiance. Noter les erreurs de validation rapportées pour la passe finale.

Fini quand chaque scan de la liste a sa proposition :

```
ls imports/scans/ | sed -n 's/\.rattachement\.yaml$//p' | sort > /tmp/scans-done.txt
comm -23 /tmp/scans-todo.txt /tmp/scans-done.txt   # manquants
```

## Prompt du sous-agent

```
Tu traites UN scan du Drive de calligraphie et tu écris toi-même sa proposition de rattachement. Tu travailles à la racine du dépôt.

Ton scan : __FILE__
Autres feuilles de la même pièce sur le Drive (à regarder pour comprendre l'ensemble, sans écrire leur entrée) : __SIBLINGS__
Dossier du Drive : ~/Library/CloudStorage/GoogleDrive-*/Mon Drive/Bèishān línshuǐ 背山臨水/

À lire d'abord : CLAUDE.md, GLOSSARY.md, .claude/skills/scans/SKILL.md (surtout « Lire », « Chercher » et « Règles arbitrées »), et la forme d'un rattachement dans « 3. Appliquer » de ce même fichier.

Travail :
1. Lis le scan avec Read, colonne par colonne, de droite à gauche. Relève aussi l'attribution, la signature (戈), la date et les notes en français. Pour zoomer, recadre dans /tmp uniquement (par exemple `sips -c` ou `sips --cropOffset`), jamais dans le dépôt.
2. Cherche la pièce : grep de deux ou trois séquences de 2 à 4 caractères dans content/pieces/ (titre, columns, source.full_text). La pièce est un slug du contenu ; sinon `new` (absente du contenu), `unidentified` ou `discarded` (verso, traits d'entraînement).
3. Écris ta proposition dans imports/scans/__FILE__.rattachement.yaml, sous la forme d'un rattachement : `piece`, `version`, `variation`, `image` (`source: imports/scans/__FILE__`, `kind`). Chaque champ porte `# à arbitrer` : rien n'est arbitré par le calligraphe. Pour `new`, `unidentified` ou `discarded`, `piece` porte ce mot et le fichier s'arrête là, avec ce que tu as lu. Ce que tu lis sur le papier (colonnes en traditionnel, date, signature, notes) va en commentaire en tête du fichier. `script` prend une valeur de SCRIPTS (packages/schema/src/vocabulary.ts). Termine par des commentaires courts : format, date du papier, écarts avec la pièce, questions pour le calligraphe.

Règles d'écriture :
- Si imports/scans/__FILE__.rattachement.yaml existe déjà, arrête-toi et dis-le.
- N'écris que ce fichier : rien dans content/, rien d'autre dans le dépôt. Ne lance pas `pnpm attach:scan`. Ne renomme rien sur le Drive. Le nom exact du Drive sert au nom du fichier, même hors format.

Réponds en 3 lignes au plus : le match proposé, la confiance, et la question principale pour le calligraphe.
```
