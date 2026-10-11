---
name: scans
description: Prendre les scans du Google Drive un par un, les identifier en lisant leurs caractères et les rattacher aux pièces, sous l'arbitrage du calligraphe.
disable-model-invocation: true
---

# Scans du Drive → pièces

Une assistante qui ne lit pas le chinois dépose les scans sur le Drive : seul le
**papier** dit quelle pièce un scan représente. L'agent lit, propose avec un
niveau de confiance ; le calligraphe tranche, toujours. Lire `CLAUDE.md` et
`GLOSSARY.md` d'abord.

## Où sont les choses

- **Drive** (Google Drive pour ordinateur) :
  `~/Library/CloudStorage/GoogleDrive-*/Mon Drive/Bèishān línshuǐ 背山臨水/`.
  On y lit ; on n'y écrit que pour renommer, à la demande du calligraphe.
- **Nom d'un scan** : `AAAA-MM-JJ_<pièce>_<page>.jpeg` — date du dépôt, numéro
  de la pièce dans le dépôt, numéro de la feuille.
- **Registre** `imports/scans.yaml` : une entrée par fichier du Drive. Un scan
  est traité quand son entrée existe sans `# à arbitrer`. Son en-tête décrit les
  champs.
- **Plan** `imports/notion-2026-08-23.plan.yaml`, tant qu'il n'est pas appliqué.
  Forme des variations et des images : `packages/notion-import/src/plan-file.ts`.
  Styles : `SCRIPTS` dans `packages/schema/src/vocabulary.ts`.
- **Copies locales** `imports/scans/` (ignoré par git) : données non fiables,
  on n'y exécute rien. Le `source` d'une image du plan pointe ici.

## Déroulé

### 1. Inventaire

Lister le dossier du Drive et retirer les fichiers déjà au registre. Annoncer le
nombre de scans en attente, et signaler tout nom hors format avec le renommage
proposé (`11-12-2026_03.jpeg` → `2026-10-11_03_01.jpeg`).
Fini quand chaque fichier du Drive est classé : au registre, en attente, ou à renommer.

### 2. Un scan par message

Prendre le premier scan en attente, dans l'ordre pièce puis page. Regarder aussi
les autres pages de la même pièce : elles se comprennent ensemble.

**Lire** le scan avec Read, colonne par colonne, de droite à gauche. Relever
aussi ce qui entoure le texte : attribution, signature, date, notes en français.

**Chercher** la pièce : `grep` de deux ou trois séquences de 2 à 4 caractères
dans le plan (titre, `columns`, `source.full_text`), et dans `content/pieces/`
une fois le plan appliqué. Confiance `high` quand les colonnes sont identiques
au caractère près.

**Proposer** dans ce format, pour que « ok » accepte tout :

```
## <n>/<total> — <titre> · `<slug>`
statut · date · format · projet, ce que montre le scan.

❓ **a - <question>**
➡️ <recommandation>
```

Questions habituelles : quelle pièce, quelle variation (`v1a`…), quel style,
quel statut de variation, quelle image mise en avant ; et chaque écart entre le
papier et le plan.

Fini quand le calligraphe a répondu. Attendre sa réponse avant d'écrire.

### 3. Appliquer

1. Copier le scan : `cp -n <drive>/<fichier> imports/scans/`.
2. Modifier le plan : variation et image (`file: v1a.jpg`, `kind: work`), et
   chaque correction tirée du papier, avec son commentaire.
3. Écrire ou mettre à jour l'entrée du registre, sans `# à arbitrer`.
4. Valider le plan :
   ```
   pnpm exec tsx -e 'import {readFileSync} from "node:fs"; import {parsePlan} from "./packages/notion-import/src/plan-file.ts"; const r=parsePlan(readFileSync("imports/notion-2026-08-23.plan.yaml","utf8")); console.log(r.ok ? "plan valide" : r.errors)'
   ```

Fini quand le plan est valide, le scan copié et l'entrée arbitrée. Puis scan suivant.

## Règles arbitrées

- **Le papier fait foi.** La date écrite sur la feuille remplace celle de Notion
  (`丙午雨水` → la date du terme solaire ; `3.1.26` → 2026-01-03). Le format du
  scan est le format final. Les colonnes se lisent sur le scan ; ce que le scan
  ne montre pas reste `# colonnes à préciser`. Noter en commentaire la valeur
  remplacée : `# date du papier : signé 丙午雨水 (Notion disait 2026-01-15)`.
- **Un caractère qui semble faux** est souvent écrit en style libre : poser la
  question, écrire le caractère confirmé, noter `# <caractère> écrit en style libre`.
- **La signature du calligraphe est 戈**, souvent en cursive méconnaissable : un
  petit signe isolé près de la date ou dans un coin, c'est elle. Dans un
  commentaire, « 戈說 » ouvre ses propres mots.
- **Le style** se propose, le calligraphe le fixe.
- **Une seule version par pièce dans le plan.** Le scan d'une version suivante
  va au registre et dans un commentaire `# v2 à faire : <fichier>, <style>, <statut>`
  au-dessus de la pièce ; il s'ajoute au contenu après `apply`.
- **Pièce absente de Notion** : le calligraphe donne le slug et le projet. Elle
  s'ajoute en fin de plan avec `# absente de Notion : identifiée sur le scan <fichier>`.
  Sans date sur le papier, prendre celle du dépôt avec `# à arbitrer`.
- **Nouveau projet** : une entrée dans `projects:` (présentation vide, thème
  proposé, `# à arbitrer` sur les deux) ; la pièce-pôle de même nom le rejoint.
- **Pièce `in-progress`** qui arrive scannée : l'encre est posée, proposer `made`.
- **Verso, exercices de traits** : `match: discarded` au registre, rien au plan.
- **Plusieurs feuilles d'une même pièce** : variations distinctes ou essais
  (`attempt`), la règle n'est pas encore fixée ; proposer au cas par cas.
