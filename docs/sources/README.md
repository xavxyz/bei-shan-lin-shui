# Textes de référence

Un fichier par texte d'où des pièces sont tirées, traduit vers par vers pour choisir leur étendue. Ce qu'il porte et ce qu'il laisse à la pièce : ADR 0002. Chaque fait y vient d'une source consultée et citée à côté de lui : ADR 0004, et `pnpm validate:content` y refuse les marques d'un fait sans source.

## Chercher un texte

Un **subagent** par pièce ou par source cherche le texte. Il rend le passage retenu, les variantes entre éditions et les URL consultées, et garde la page entière dans son propre contexte : un chapitre de ctext coûte 25k tokens, une image zoomée 2 à 5k. Le texte se recopie au caractère près depuis la page brute ; un résumé de WebFetch le déforme.

- **zh.wikisource** : le wikitexte d'une page s'obtient en brut dans un fichier temporaire, où l'on cherche le passage par `grep`. `--data-urlencode` encode le titre chinois, que curl envoie sinon tel quel (« Error: 400 »). Une réponse « Wikimedia Error » dit que la page n'existe pas : vérifier le titre, souvent une sous-page (`紅樓夢/第001回`). Wikimedia refuse un User-Agent vide. Le `grep` de ce poste (ugrep) refuse un large contexte autour d'un passage chinois (`.{0,300}`) : en prendre 10 à 20 caractères, ou passer par `python3`.

  ```sh
  curl -s -A 'bei-shan-lin-shui/1.0' -G --data-urlencode 'title=<titre>' -d action=raw 'https://zh.wikisource.org/w/index.php' > "$TMPDIR/page.txt"
  ```

- **Fac-similé de wikisource** : une page qui transcrit un scan porte `<pages index=…>` dans son wikitexte. L'image de la page se demande à l'API de Commons (`action=query&prop=imageinfo&iiprop=url&iiurlparam=page<p>-1920px` sur le fichier djvu), puis se lit et se zoome (`sips`) : la transcription d'une page de qualité 1 n'a pas été relue.
- **ctext** passe derrière Cloudflare, qui bloque `curl`, et son API ne donne que les métadonnées. Il se lit par le Chrome du calligraphe, connecté à son compte (`/chrome` avant de commencer) : dans `javascript_tool`, `fetch('/wiki.pl?if=gb&chapter=<n>')`, filtré pour ne renvoyer que le passage voulu. Les images des pages sont à `library.pl?if=gb&file=<n>&page=<p>` : on lit l'image, à gauche ; le panneau OCR de droite est illisible.
- **Textes bouddhiques** : CBETA, cité par sa référence de ligne (`T48n2003_p0223b21`) ; skill `cbeta-lookup`.
- **Datation d'un texte du 道藏** : le catalogue de Kanripo (`KR-Catalog`, fichiers `KR/KR5*.txt`) donne pour chaque texte son numéro DZ, sa dynastie et sa page dans _The Taoist Canon_ (champ `TTC`), où la notice reste à relever.

## Forme d'un fichier

- **Titre** `# <texte> — texte de référence`, puis un paragraphe : le texte, les pièces qu'il sert (par slug), l'édition suivie et celles qui la recoupent, avec leurs URL.
- La ligne qui rappelle que la traduction est de travail et que les ➡️ marquent des étendues candidates.
- **Une section par texte** : `## 《<titre>》 · \`<slug>\``, ouverte par un paragraphe **Source :** — attribution et datation, chacune avec sa référence, édition, nombre de caractères, graphies normalisées, leçons entre éditions.
- Un tableau `原文 | traduction`, une ligne par vers ou par membre de phrase ; ➡️ en tête des étendues candidates.
- Des notes en liste : allusions et citations, chacune avec son ouvrage et son chapitre.

Un fait qu'aucune source consultée ne donne reste **à relever**, avec l'ouvrage où le chercher : « à relever dans le 全宋詩 ».
