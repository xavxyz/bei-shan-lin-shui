# Le manifeste se cite tel qu'il est écrit, en simplifié

Le dépôt tient le traditionnel pour la source de vérité : le simplifié et le pinyin en sont dérivés au build, jamais stockés (`CLAUDE.md`). Le manifeste de 山山 sur le style libre fait exception. Il a été écrit en simplifié, et l'accueil le cite en entier : `content/manifeste.yaml` le porte tel qu'il est écrit, recopié au caractère près du fichier fourni par le calligraphe le 2026-11-02, et le site le montre ainsi, sans dérivation, sans pinyin. Seule l'épigraphe, 針尖上的舞蹈, prise au dernier paragraphe, s'écrit en traditionnel : c'est le choix du calligraphe. Le content layer vérifie qu'elle cite bien le texte, en comparant son simplifié aux paragraphes.

## Options écartées

- **Transcrire le texte en traditionnel**, puis le dériver comme le reste : ce ne serait plus la citation de 山山, mais une transcription, et la conversion du simplifié vers le traditionnel n'est pas univoque : un simplifié peut venir de plusieurs traditionnels, et l'agent choisirait à la place de l'auteur.
- **Dériver du simplifié le traditionnel et le pinyin**, pour le montrer comme une pièce : la même conversion ambiguë, et un appareil qui n'éclaire pas un texte que le visiteur lit en regard de sa traduction.

## Conséquences

Le manifeste n'a ni traditionnel ni pinyin. Son chinois entre tel quel dans la police du site (ADR 0005) : titre, paragraphes, signature, traducteur et épigraphe. La règle du traditionnel reste entière pour les pièces et les projets ; un autre texte cité tel qu'il est écrit demanderait la même exception, décidée pour lui.
