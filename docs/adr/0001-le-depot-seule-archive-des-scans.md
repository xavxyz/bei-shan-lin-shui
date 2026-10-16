# Le dépôt est la seule archive des scans

Un scan importé — son image dans `content/`, le commit sur `main` — est supprimé
du Drive ; un scan écarté l'est dès l'arbitrage. La copie de `content/` devient
la seule archive : un JPEG qualité 92, plafonné à A4 300 dpi
(`packages/notion-import/src/normalize-image.ts`). Le Drive redevient une boîte
de réception où ne reste que ce qui est à faire, sans registre à tenir à côté,
et `content/` reste la seule source de vérité. Le calligraphe numérise en A4
300 dpi : la perte se limite au ré-encodage.

## Options écartées

- **Garder les originaux sur le Drive**, rangés dans `traités/` et `écartés/` :
  une seconde archive à tenir en cohérence avec le dépôt, pour un gain de
  qualité marginal.
- **Un registre `scans.yaml` permanent** : un second registre de ce que
  `content/` dit déjà, et des scans écartés reproposés si l'un se perd.

## Conséquences

La suppression est irréversible au-delà des 30 jours de la corbeille du Drive.
L'agent la fait, mais seulement après la confirmation du calligraphe, sur une
liste qu'il lui montre.
