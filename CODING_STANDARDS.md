# Standards du dépôt

Les règles qu'une relecture applique, une à une, au code, aux skills et à la doc d'une PR. Les règles mécaniques sont vérifiées par `pnpm validate:*`, `pnpm lint` et `pnpm test` : elles ne sont pas redites ici.

## Une PR

- **Un sujet par PR.** Ce qui ne sert pas ce sujet part dans une autre PR.
- **Un comportement qui change emporte sa doc dans la même PR** : la skill qui le décrit, et sa ligne de `CLAUDE.md`.
- **Un décompte cité dans une PR sort d'une commande**, donnée à côté du nombre (`ls content/pieces | wc -l`), jamais d'un comptage à la main.
- **Un rapport de relecture s'écrit en français.**

## Le code

- **Une entrée invalide est signalée**, avec le fichier et le champ fautifs, et fait échouer ce qui la lit. Un `if (!parsed.ok) continue` qui passe en silence est un défaut.
- **Une valeur dérivée se calcule en un seul endroit**, que tout le reste appelle. Deux calculs du même fait finissent par diverger.
- **Un champ qui change dans `packages/schema` change dans la même PR partout où il est lu ou écrit**, et chaque paquet en reprend la définition plutôt que de la redire. La relecture cherche le nom du champ dans tout le dépôt : un schéma local du champ, une exigence que le schéma a levée, ou un type propre là où le schéma en a déjà un, est un défaut.
- **Un commentaire dit ce que fait le code qu'il précède.** Le code change, le commentaire change dans le même commit.
- **Les noms se lisent comme le code qui les entoure** : même vocabulaire, même forme.
- **Les tests observent un comportement de l'extérieur**, par l'interface publique du paquet : ce qui est retourné, écrit sur le disque, ou vu par le visiteur. La structure interne d'un module reste libre de changer sans casser un test.

## La langue

- **Les identifiants internes sont en anglais** : variables, fonctions, types, valeurs stockées.
- **Le texte lu par un humain est en français, dans les mots de `GLOSSARY.md`** : messages d'erreur, interface du site, skills, doc, commentaires.
- **Un terme du domaine qui naît entre au glossaire dans la même PR**, avec sa définition et ses mots à éviter.

## Le contenu

- **Un texte, une attribution, une datation portent la source consultée**, à côté d'eux : l'édition, la page, l'adresse (ADR 0004). Sans source, ils ne s'écrivent pas.
- **L'étendue d'une pièce vit dans la pièce.** `docs/sources/` traduit et éclaire, il n'arbitre jamais ce que la pièce retient (ADR 0002).

## Pour aller plus loin

- `CLAUDE.md`, « Règles qui tiennent le système » : les invariants du contenu et du content layer.
- `GLOSSARY.md` : le vocabulaire du domaine et ses mots à éviter.
- `docs/adr/` : les décisions et leurs options écartées.
