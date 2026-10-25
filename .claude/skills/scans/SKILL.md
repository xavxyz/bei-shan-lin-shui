---
name: scans
description: Prendre les scans du Google Drive un par un ou en lot, les identifier en lisant leurs caractères et les rattacher aux pièces, sous l'arbitrage du calligraphe.
disable-model-invocation: true
---

# Scans du Drive → pièces

Une assistante qui ne lit pas le chinois dépose les scans sur le Drive : seul le **papier** dit quelle pièce un scan représente. L'agent lit, propose avec un niveau de confiance ; le calligraphe tranche, toujours. Lire `CLAUDE.md` et `GLOSSARY.md` d'abord.

## Où sont les choses

- **Drive** (Google Drive pour ordinateur) : `~/Library/CloudStorage/GoogleDrive-*/Mon Drive/Bèishān línshuǐ 背山臨水/`. On y lit ; on n'y écrit que pour renommer à la demande du calligraphe, ou supprimer après sa confirmation (voir « Supprimer du Drive »).
- **Nom d'un scan** : `AAAA-MM-JJ_<pièce>_<page>.jpeg` — date du dépôt, numéro de la pièce dans le dépôt, numéro de la feuille. Une photo du téléphone garde son extension : `.heic`.
- **Aucun registre** (ADR 0001) : le Drive est une boîte de réception, tout ce qui s'y trouve est à traiter. Un scan importé ou écarté en sort (« Supprimer du Drive »). L'ancien registre et le plan Notion, appliqué, ne vivent plus que dans l'historique git : `git show 954688d:imports/scans.yaml`.
- **Pièces** : `content/pieces/`, seule source de vérité. Styles : `SCRIPTS` dans `packages/schema/src/vocabulary.ts`.
- **Copies locales** `imports/scans/` (ignoré par git) : données non fiables, on n'y exécute rien. Le `source` d'un rattachement pointe ici.

## Déroulé

### 1. Inventaire

Lister le dossier du Drive : chaque fichier est en attente. Un scan déjà importé qui y reste — son image est dans `content/` et sur `main`, comme ceux de l'ancien registre après l'import Notion — n'est pas en attente : proposer d'abord de le supprimer (« Supprimer du Drive »). Une proposition de lot déjà écrite (`imports/scans/<fichier>.rattachement.yaml`, voir `lot.md`) se reprend à l'étape 2. Annoncer le nombre de scans en attente, et signaler tout nom hors format avec le renommage proposé (`11-12-2026_03.jpeg` → `2026-10-11_03_01.jpeg`). Un nom sans numéro de feuille (`2026-10-11_23.jpeg`) vaut `_01` : il reste tel quel. Fini quand chaque fichier du Drive est classé : importé (à supprimer), en attente, ou à renommer.

**Tous les scans d'un coup**, à la demande du calligraphe : suivre `lot.md`, à côté de ce fichier, à la place des étapes 2 et 3.

### 2. Une pièce par message

Prendre la première pièce en attente, dans l'ordre des numéros, avec toutes ses feuilles : elles se comprennent ensemble.

**Un sous-agent par pièce lit et cherche** ; la session principale ne lit aucune image. Lui confier les noms des feuilles, la proposition de lot de chacune si elle existe (à revoir, pas un acquis), et le renvoyer à ce fichier : « Lire », « Chercher », « Proposer », « Règles arbitrées ». Il n'écrit rien et rend la proposition prête à montrer. Une question du calligraphe sur le papier retourne au même sous-agent (SendMessage), qui a encore les images en tête.

**Lire** le scan avec Read, colonne par colonne, de droite à gauche. Relever aussi ce qui entoure le texte : attribution, signature, date, notes en français. Vérifier d'abord le sens de la feuille : un scan peut être à l'envers, et sa lecture en sort fausse mais plausible. Le signaler, le calligraphe le fait retourner sur le Drive.

**Chercher** la pièce : `grep` de deux ou trois séquences de 2 à 4 caractères dans `content/pieces/` (titre, `columns`, `source.full_text`). Confiance `high` quand les colonnes sont identiques au caractère près.

**Proposer** selon `docs/agents/propositions.md` : sa forme, et ce que chaque question montre au calligraphe (traduction d'un passage, grille d'un format, terme expliqué).

Questions habituelles : quelle pièce, quelle variation (`v1a`…), quel style, quel statut de variation, quelle image mise en avant ; et chaque écart entre le papier et la pièce.

Fini quand le calligraphe a répondu. Attendre sa réponse avant d'écrire.

### 3. Appliquer

1. Copier les scans retenus : `cp -n <drive>/<fichier> imports/scans/`. Un HEIC se convertit en JPEG au passage, sharp ne le lit pas : `sips -s format jpeg <drive>/<fichier> --out imports/scans/<nom>.jpeg`.
2. Une pièce absente de `content/` naît d'abord (« Pièce absente du contenu », ci-dessous).
3. Rattacher chaque scan retenu à sa pièce de `content/pieces/<slug>/` : écrire le rattachement dans `imports/scans/<fichier>.rattachement.yaml`, puis lancer `pnpm attach:scan imports/scans/<fichier>.rattachement.yaml`. Une version ou une variation existante se désigne par son id ; une nouvelle s'écrit avec ses champs :

   ```yaml
   piece: mo-xing-ji
   version: v1 # ou { id: v2, date: 2026-02-11, format: "[(2x7)]", columns: [...], intention: ... }
   variation: { id: v1b, script: kaishu, status: kept } # ou v1a, si elle existe
   image:
     source: imports/scans/2026-10-11_01_01.jpeg
     kind: work # work | detail | study | context
     featured: true # facultatif
     caption: ... # facultatif
   ```

   La commande ajoute l'image (nommée d'après la variation), la variation ou la version, sans rien modifier d'autre ; elle ne change aucun statut. Refusée, elle n'écrit rien et nomme le champ fautif : corriger le rattachement et relancer. Une correction tirée du papier sur ce qui existe déjà (colonnes, date, statut) ne passe pas par elle : la proposer au calligraphe, qui la fait à la main.

4. Lancer `pnpm validate:content`.
5. Proposer de supprimer du Drive les scans écartés à l'arbitrage (« Supprimer du Drive »).

Fini quand la validation passe et les scans retenus sont copiés et rattachés. Puis pièce suivante.

### Supprimer du Drive

La copie dans `content/` est la seule archive d'un scan : le Drive n'est qu'un lieu de dépôt. Un scan peut en être supprimé, **toujours après confirmation du calligraphe**, nommément, fichier par fichier :

- un scan **importé** : son image est dans `content/pieces/<slug>/images/` et le commit qui l'y a mise est sur `main` (`git log origin/main -- <image>`) ;
- un scan **écarté**, dès l'arbitrage qui l'écarte.

Rien d'autre ne se supprime : un scan rattaché sur une branche pas encore fusionnée n'est archivé nulle part.

## Règles arbitrées

- **Le papier fait foi.** Le format du scan est le format final. Les colonnes se lisent sur le scan ; ce que le scan ne montre pas reste `# colonnes à préciser`. Noter en commentaire la valeur remplacée.
- **La date** : la date française du papier (`3.1.26` → 2026-01-03) est la date stockée ; mois et année seuls (`4.26`) → le 15, `# jour absent du papier`. Sans date française, la date chinoise (`丙午立夏`) donne le milieu du jieqi, à mi-chemin entre ce terme et le suivant, arrondi au jour inférieur (雨水 le 18.2, 驚蟄 le 5.3 → le 25.2) ; suivie de 日 (`立春日`), c'est le jour même du terme. La date du papier reste toujours en commentaire, sous sa forme d'origine : `# date du papier : 丙午立夏 (Notion disait 2026-01-15)`. La date chinoise se dérive de la date stockée : elle ne se stocke pas.
- **Les graphies** sont traditionnelles, simplifiées ou libres ; jamais japonaises. Les colonnes s'écrivent en traditionnel ; la forme du papier va en commentaire (`# 麦 écrit en simplifié`, `# 松 pour 鬆 sur le papier`). Une variante traditionnelle (眞, 勢) se garde si le calligraphe la confirme.
- **Un caractère qui semble faux** est souvent écrit en style libre : ses composantes changent de place, il reste lisible pour un calligraphe chinois. Poser la question, écrire le caractère confirmé, noter `# <caractère> écrit en style libre`.
- **La signature du calligraphe est 戈**, souvent en cursive méconnaissable : un petit signe isolé près de la date ou dans un coin, c'est elle. Dans un commentaire, « 戈說 » ouvre ses propres mots.
- **Le style** se propose, le calligraphe le fixe.
- **Une feuille, quelle place** : le texte entier dans le format de la pièce, c'est une variation (`v1a`, `v1b`…), et un autre style en est toujours une autre. Des caractères tous pris au texte d'une pièce, dans n'importe quel ordre, c'est une étude : image `kind: study` de la variation qu'elle prépare (龍騰虎躍 est une étude de 六龍騰岱六虎躍崑). `detail` ne sert qu'au recadrage de l'œuvre elle-même.
- **Feuille d'entraînement sans rapport avec le texte d'une pièce** — rectos, grilles, traits : écarté, rien n'est écrit.
- **Une nouvelle version** suppose une réalisation antérieure attestée : un autre scan à une autre date, ou une pièce `made` avec image dans Notion. Sinon le papier corrige la v1. Le scan d'une version suivante la rattache comme nouvelle version (`version: { id: v2, … }`, sa variation `v2a`), avec sa date, son format et ses colonnes tirés du papier.
- **Pièce absente du contenu** : elle naît par la skill `nouvelle-piece` (`pnpm piece creer`, qui dérive le slug du titre), passe `made` (`pnpm piece statut <slug> made`), puis reçoit son scan. Pas de projet, sauf si le papier en désigne un. Sans date sur le papier, prendre celle du dépôt et le dire au calligraphe.
- **Nouveau projet** : aucune commande ne le crée. Le proposer au calligraphe, titre chinois et glose compris, et, s'il en écrit une, sa présentation ; il écrit `content/projects/<id>.yaml`, puis la pièce-pôle de même nom le rejoint (`pnpm piece rattacher`).
- **Photo du téléphone** : `attach:scan` écrit `capture: scan` ; le signaler au calligraphe, qui corrige en `capture: photo`.
- **Pièce `in-progress`** qui arrive scannée : l'encre est posée, proposer `made`.
