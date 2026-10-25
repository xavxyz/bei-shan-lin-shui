# Mise en page du site : ce qu'on prend à Codrops, et ce qu'on laisse

Note de recherche, octobre 2026. Elle part du prototype actuel de `apps/site/src/` et propose une mise en page simple, sobre et cohérente pour une galerie de calligraphies. L'inspiration vient de [Codrops](https://tympanus.net/codrops/), mais filtrée de près : on garde ce qui sert l'œuvre, on écarte les effets. Pour les transitions de page, la référence est celle que le calligraphe a désignée, [pagetransitions.netlify.app](https://pagetransitions.netlify.app/) de Sarah Drasner (2.3). Les arbitrages du calligraphe du 21 octobre 2026 (§5) y sont répercutés.

**Comment les sources ont été lues.** `tympanus.net` répond aux clients sans navigateur par un défi Cloudflare (HTTP 403). Une première lecture est passée par les instantanés de la Wayback Machine. Le 21 octobre 2026, les articles Codrops cités ont été relus **en direct, dans un navigateur** (le détail est en tête des Sources) : le contenu concorde avec la première lecture, à trois corrections près (l'auteur des carrousels expérimentaux signe Max Barvian ; l'auteur de la galerie WebGL est Chakib Mazouni ; les démos de la référence `writing-mode` sont pour l'instant indisponibles sur la page, seule leur description reste). L'article Interlude, que l'archive n'avait pas, a été lu à cette occasion. Le code vient des dépôts GitHub des démos (`github.com/codrops/…`, via `gh api`). Pour les techniques web, la référence est MDN, ses données de compatibilité (`@mdn/browser-compat-data` 8.1.6, publiée le 15 octobre 2026) ou la spécification.

---

## 1. Ce qu'est le prototype aujourd'hui

Relevé dans les fichiers, sans jugement :

- `layouts/Layout.astro` charge **Noto Serif TC depuis Google Fonts** (`fonts.googleapis.com`). C'est la seule dépendance réseau du site, et elle contredit l'esprit d'ADR 0003 : les polices vivent dans le dépôt.
- `styles/global.css` pose une colonne unique de `62rem` et quatre thèmes (`ink`, `jade`, `cinnabar`, `indigo`) qui ne font que changer cinq variables de couleur. `Layout.astro` pose le thème du projet en `data-theme` sur `<html>`. Les variables de `ink` sont une bonne base ; les trois autres thèmes partent (arbitrage, §5).
- La police chargée, Noto Serif TC, est la version « sous-ensemble régional » de Noto Serif CJK. Le fichier officiel de cette version (`NotoSerifTC-Regular.otf`, Serif2.003) n'a **pas 298 des 447 simplifiés** que produit la dérivation des textes de `docs/sources/` (vérifié avec fontkit, voir 3.1). Le fichier que sert Google Fonts n'a pas été inspecté, mais il porte le même nom de famille : le simplifié retombe vraisemblablement aujourd'hui sur une police du système.
- `components/PieceCard.astro` **recadre** chaque vignette en `aspect-ratio: 3 / 4; object-fit: cover`. Un scan horizontal (`content/pieces/yong-cao-shu/images/v1a.jpg` fait 3840×2160) y perd presque la moitié de sa largeur. La vignette charge en plus le scan pleine taille (2480×3411 pour `v1a-02.jpg`).
- `islands/Carousel.tsx` est déjà accessible : boutons `‹ ›` étiquetés, position annoncée en `aria-live="polite"`, glissement tactile, pilote clavier ← → (`keyboard-pilot.ts`). Sans JavaScript, il montre la première image et la liste des variations. L'image est bornée à `max-height: 80vh`, ce qui rapetisse un scan vertical.
- `components/ChineseText.astro` met les colonnes de la version en `writing-mode: vertical-rl` à partir de 768 px, et en lignes en dessous.
- Les tests E2E assèrent sur des textes visibles (« voir l'évolution », « Image suivante », « 1 / 7 », « non publiée », les libellés de style). Une refonte visuelle doit les garder, ou mettre les tests à jour dans le même geste.

---

## 2. Ce que Codrops offre, trié

### 2.1 Gardé

| Source | Ce qu'on en prend |
| --- | --- |
| [Mastering Carousels with GSAP](https://tympanus.net/codrops/2025/04/21/mastering-carousels-with-gsap-from-basics-to-advanced-animation/), Tom Miller, 2025 : **seulement la première partie**, « Our Basic Carousel » | Un carrousel en HTML et CSS seuls, `overflow-x: auto; scroll-snap-type: x mandatory` sur le conteneur et `scroll-snap-align: center` sur les diapositives. Selon l'article, il fonctionne « even when JavaScript is disabled ». On n'en prend pas l'`object-fit: cover` des images, qui recadre (3.1, principe 1). L'article renvoie au [tutoriel W3C sur les carrousels](https://www.w3.org/WAI/tutorials/carousels/structure/) pour l'accessibilité. Il dit aussi que, dès que le JS retire la zone défilante, « the buttons are necessary to maintain keyboard accessibility », et que Safari demande `tabindex="0"` sur ces boutons. |
| [isle-thorne-collective](https://github.com/codrops/isle-thorne-collective), gabarit Astro publié le 7 octobre 2026 ([article](https://tympanus.net/codrops/2026/10/07/isle-thorne-collective-astro-template/)) | C'est l'exemple Codrops le plus proche de notre pile : Astro, collections de contenu, aucun framework d'interface. L'article confirme le parti pris : un site statique, sans framework d'interface, dont les pages et les liens marchent sans JavaScript. On en prend quatre choses. **(1)** Une grille de site, 2 colonnes sur téléphone et 12 à partir de 1024 px, « so labels line up across the page » (`src/styles/global.css`, utilitaire `grid-site`). L'article ajoute que la police y est auto-hébergée, avec une police de repli ajustée à ses métriques pour que le texte ne bouge pas au chargement : c'est la voie du 3.1, principe 4. **(2)** Une seule famille de caractères en cinq tailles, chacune complète avec son interlignage et son approche (même fichier, bloc `@theme`). **(3)** Une galerie produit, `src/components/ProductGallery.astro` : la grande image est coupée en deux moitiés invisibles qui servent de boutons précédent et suivant ; la flèche n'apparaît qu'au survol ou au focus, avec un léger glissement, réduit à un simple fondu sous `motion-reduce` ; les touches ← et → marchent aussi, et un `aria-live` annonce la photo affichée. **(4)** Sa liste d'accessibilité (README, section _Accessibility_) : « Landmarks and a skip link, one `h1` per page, visible focus everywhere, controls at least 24px tall to the touch », et « Without JavaScript, links are plain page loads ». |
| [Animating Multi-Page Navigations with Browser View Transitions and Astro](https://tympanus.net/codrops/2023/10/03/animating-multi-page-navigations-with-browser-view-transitions-and-astro/), Igor Penaque, 2023 ([code](https://github.com/codrops/astro-shop-view-transitions)) | Le principe des paires nommées : la vignette d'une carte et l'image de la page de détail portent le même nom (`transition:name={\`${slug} image\`}`dans`src/components/ProductCard.astro`et`src/pages/product/[slug]/index.astro`), et le navigateur anime de l'une à l'autre. On garde l'idée, avec le même `<ClientRouter />` que l'article : c'est la voie retenue pour suivre la référence des transitions (2.3). |
| [Référence CSS Codrops : `writing-mode`](https://tympanus.net/codrops/css_reference/writing-mode/), Hui Jing Chen | `vertical-rl` y est la « Han-based writing mode ». La page décrit aussi une catégorie d'article posée en étiquette verticale à droite du texte sur écran large, une information « not necessarily critical » qui laisse l'attention au titre et au texte (la démo elle-même est indisponible au 21 octobre 2026). C'est le modèle du titre du site en marge (voir 3.4). La [référence `text-orientation`](https://tympanus.net/codrops/css_reference/text-orientation/) complète. |
| [A Practical Introduction to Scroll-Driven Animations](https://tympanus.net/codrops/2024/01/17/a-practical-introduction-to-scroll-driven-animations-with-css-scroll-and-view/), Adam Argyle, 2024 | **Seulement la double garde**, pas l'effet : `@media (prefers-reduced-motion: no-preference) { @supports (animation-timeline: scroll()) { … } }`. Tout mouvement ajouté au site se range derrière cette double condition, ou n'existe pas. |

### 2.2 Écarté, et pourquoi

| Source | Pourquoi on ne le prend pas |
| --- | --- |
| [Infinite GSAP Scroll Gallery with Parallax and Flip](https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/), Surya Aditya, 2026 | La transition grille→détail y passe par GSAP Observer, Flip et SplitText, avec un défilement infini et une parallaxe par image. Réévalué après le choix de GSAP (2.3) : toujours écarté. La transition de vue nommée fait déjà le déploiement de la carte vers la page (3.6), sans Flip ni SplitText. Le défilement infini et la parallaxe n'ont pas de sens pour une poignée de pièces. |
| [Scroll-Revealed WebGL Gallery with GSAP, Three.js, Astro and Barba.js](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/), Chakib Mazouni, 2026 | Le titre suffit à l'écarter : WebGL, trois bibliothèques, et un routeur qui remplace la navigation. Un scan de calligraphie se montre tel qu'il est, il ne se déforme pas. |
| [Interlude](https://tympanus.net/codrops/2026/10/07/interlude-astro-page-transitions/), Manoela Ilic, 2026 ([dépôt](https://github.com/codrops/interlude)) | L'article lui-même renvoie d'abord aux transitions d'Astro : un fondu par défaut, et `transition:name` pour qu'une vignette « grow into » sa page ; pour cela, dit-il, on n'a pas besoin du starter. Interlude sert à recouvrir l'écran, dessiner entre deux pages, déplacer la page par morceaux : rien de ce qu'on cherche. Chaque page charge alors le routeur d'Astro (environ 5 kB), le moteur (environ 4 kB) et GSAP (environ 28 kB), et three.js (environ 240 kB) pour les transitions WebGL, chiffres de l'article et du README. Il repose sur `<ClientRouter />`, qui « skips every script it has already run » : sans adaptation, « buttons, menus and carousels stay dead, without an error ». En plus, « `<html>`'s attributes are replaced on each navigation ». **Réévalué après le choix du routeur et de GSAP (2.3).** Les deux risques sont désormais acceptés et traités (2.3, « Les risques du routeur »). Interlude reste pourtant écarté : ses transitions recouvrent l'écran ou découpent la page, ce que la référence ne fait jamais, et la référence n'anime pas le changement de page par GSAP. Si un jour le calligraphe veut une transition de page pilotée par GSAP (un rideau, par exemple), Interlude est la voie toute faite pour Astro. |
| La transition par défaut d'isle-thorne-collective, et Lenis | Le gabarit embarque Interlude, GSAP et Lenis pour le défilement doux. Son README chiffre l'ajout à « about 39 kB (compressed) » de JS par page, et coupe lui-même Lenis sous mouvement réduit. On garde le gabarit pour sa structure, pas pour son mouvement. Réévalué après le choix de GSAP : Lenis reste écarté, la référence n'a pas de défilement doux et le défilement natif suffit. |
| [Experimental CSS-Only Carousels with Scroll-Driven Animations](https://tympanus.net/codrops/2024/01/24/experimental-css-only-carousels-with-scroll-driven-animations/), Max Barvian, 2024 | L'auteur le dit lui-même : « these experiments are for educational purposes only and would need quite a bit of work to be anything close to production-ready ». Les démos passent par des zones défilantes cachées et des `pointer-events: none`. |
| [Making CSS View Transitions Easy with Velvette](https://tympanus.net/codrops/2024/01/19/making-css-view-transitions-easy-with-velvette/), Noam Rosenthal, 2024 | La bibliothèque résout un vrai problème : poser un nom unique, au bon moment, sur le seul élément concerné. Mais elle le résout pour une application à une seule page, avec la Navigation API, et l'article ne la recommande alors que sous Chrome. Notre site est multipage et statique : chaque page de pièce n'a qu'une pièce, et le nom peut s'écrire en dur au build (3.6). L'article retient quand même un principe utile, cité en 3.6 : un seul élément par nom à la fois. |
| [ConnectedGrid](https://github.com/codrops/ConnectedGrid), [ElasticGridScroll](https://github.com/codrops/ElasticGridScroll), [DoubleImageHoverEffects](https://github.com/codrops/DoubleImageHoverEffects), [SlideshowAnimations](https://github.com/codrops/SlideshowAnimations) | Leurs README listent GSAP avec ScrollTrigger ou ScrollSmoother, Lenis, et three.js pour une partie des variantes (« WebGL variations (17–22) » pour SlideshowAnimations, « WebGL effects with three.js » pour DoubleImageHoverEffects). Ce sont des effets de survol et de défilement qui se montrent eux-mêmes. Ici, c'est l'encre qui doit se voir. |
| Le survol de la carte produit d'astro-shop (`group-hover:scale-105`, `src/components/ProductCard.astro`) | Agrandir une image dans un cadre fixe la **recadre**. Pour une calligraphie, c'est couper des caractères. Le survol ne touche pas l'image (3.5). |

### 2.3 Transitions entre pages : sur le modèle de pagetransitions.netlify.app (arbitrage du 21 octobre 2026)

Le calligraphe a désigné la référence des transitions de page : [pagetransitions.netlify.app](https://pagetransitions.netlify.app/), « Travel App, Native-like Page Transitions », de Sarah Drasner ([dépôt `sdras/page-transitions-travelapp`](https://github.com/sdras/page-transitions-travelapp)). Elle accompagne son article CSS-Tricks [Native-Like Animations for Page Transitions on the Web](https://css-tricks.com/native-like-animations-for-page-transitions-on-the-web/) (23 avril 2018). On s'y règle au plus près. Jusqu'ici, la note écartait GSAP et le routeur d'Astro ; ce choix est revu ci-dessous.

**Ce qu'est la référence.** Une application **Vue/Nuxt**, pas Astro : `nuxt` ^2.14.0, `gsap` **2.0.0** et `node-sass` (`package.json`), générée en statique (`target: "static"`, `nuxt.config.js`). Elle a trois pages : l'accueil, « Places » et « Group Trips ». Le dépôt ne déclare pas de licence (`licenseInfo: null` à l'API GitHub) : on en reprend les idées, pas le code. Les scripts servis pèsent environ 125 kB compressés, dont environ 58 kB pour `commons.js` (Vue, Nuxt et GSAP 2), mesurés dans Chrome le 21 octobre 2026.

**Comment elle anime, d'après le code et l'article.** C'est le point décisif : **les transitions de page n'y passent pas par GSAP**. L'article le dit : « I'm mainly using CSS for the nav changes […] For the micro-interactions of any user-driven event, I'm using JavaScript and GreenSock ». Le mécanisme tient en quatre pièces :

1. À chaque changement de route, un middleware écrit le nom de la page dans le store (`middleware/pages.js`, `store/index.js`).
2. L'en-tête vit dans le layout (`layouts/default.vue`), et il **n'est jamais remplacé**. L'article : « it won't rerender every time the page is re-routed ».
3. L'en-tête prend la classe de la page (`.index`, `.place`, `.group`, dans `components/AppNavigation.vue`). Pour chaque page, chaque élément y reçoit sa position en `transform` (`components/AppNavTransition.vue`, bloc « //animations »), et une `transition: 0.4s all ease-out` fait le trajet. L'article : « I can declaratively state the placement of the elements and their transitions ».
4. Le contenu de la page s'efface, puis le nouveau apparaît : `.page-enter-active { transition: opacity 0.25s ease-out }` et `.page-leave-active { transition: opacity 0.25s ease-in }` dans l'article ; `layouts/default.vue` règle les deux à `all 0.25s ease`.

GSAP 2 (`TimelineMax`, `TweenMax.staggerTo`) ne sert qu'aux micro-interactions déclenchées par l'utilisateur : les trois points du menu qui s'écartent et changent de couleur (`AppNavigation.vue`, `openMenu`), et l'icône « + » qui tourne en affichant « Saved! » (`AppNavTransition.vue`, `addAnimation`).

**Ce qu'on voit dans Chrome.** Observé le 21 octobre 2026, en allant de l'accueil à Places puis à Group Trips, avec des mesures par `getComputedStyle` à chaque image :

- **De l'accueil à Places.** La photo de profil passe de sa pleine taille (200 px) à une vignette réduite (`scale(0.75)`), remontée dans le bandeau. Le nom glisse à droite de la photo et passe en blanc. Le bouton Follow se range sous la photo, « 32 days traveling » apparaît, et la photo du bandeau change.
- **De Places à Group Trips.** La photo se réduit de `scale(0.75)` à `scale(0.25)` en environ 430 ms et devient ronde. Trois autres profils apparaissent à côté, et le nom devient « Honolulu ». Pendant ce temps, le contenu descend à l'opacité 0 vers 260 ms, puis remonte à 1 vers 510 ms : il disparaît d'abord, le nouveau apparaît ensuite, sans superposition. Les deux images du bandeau, elles, coexistent environ 500 ms.
- **Focus.** Il reste sur le lien cliqué : la référence ne déplace pas le focus et n'annonce pas la nouvelle page.
- **Mouvement réduit.** Les styles et les scripts servis n'ont **aucune règle `prefers-reduced-motion`** : tout bouge, pour tout le monde.

**Le portage React du calligraphe, en appui secondaire.** En 2018, le calligraphe avait réécrit la référence en React : [xavxyz/nextjs-page-transitions](https://github.com/xavxyz/nextjs-page-transitions), « a rewrite with React & Next.js » de l'original (README), sous licence MIT. **L'original de sdras fait foi** pour les patterns, leur rythme et leur finition. Le portage, copie rapide, ne sert qu'à voir comment un pattern s'écrit en React. Là où il s'écarte de l'original, on suit l'original. Lu via `gh api` le 21 octobre 2026 :

- **Ce qu'il garde.** L'en-tête persistant : `pages/_app.js` rend `<AppNavigation>` hors de la page, et lui passe `pathname={this.props.router.pathname}`. Les positions par page sont les mêmes, `transform` et `transition: 0.4s all ease-out`, écrites en styled-components selon `pathname` (`components/AppNavTransition.js`). Le fond d'en-tête garde son zoom en sortie, `scale(1.1)`.
- **Ce qu'il change.** Le store Vuex et le middleware deviennent l'état de `_app` et `router.pathname` de Next.js. Les classes de page deviennent des props de styled-components.
- **Où il s'écarte de l'original**, et où l'on suit donc l'original :
  - **Le fondu du contenu.** Le portage le fait par un `<Transition>` de react-spring, indexé sur la route, dans un conteneur `position: absolute` (`pages/_app.js`). L'ancienne et la nouvelle page s'y superposent pendant le fondu. L'original efface d'abord l'ancienne page, puis montre la nouvelle (mesuré plus haut). On suit l'original : d'abord l'effacement, puis l'apparition.
  - **Les micro-interactions.** Le portage les fait avec les ressorts de react-spring (`Spring`, `Trail`). Il importe `gsap` sans s'en servir : `TweenMax` et `Sine` sont importés dans `components/AppNavigation.js` et jamais appelés. L'original les fait en timelines GSAP. On suit l'original : GSAP.
  - **« Saved! ».** Le portage le fait disparaître par un `setTimeout` d'une seconde. L'original le fait par une timeline. C'est hors de notre périmètre (pattern G).
- **Ce qui sert ici.** Chaque composant y a sa fixture react-cosmos, dont une fixture de `AppNavigation` par route (`components/AppNavigation.fixture.js`). C'est la pratique du dépôt pour les îlots (`CLAUDE.md`, « Les îlots React sont vérifiés en isolation sous react-cosmos »).

**Les patterns, triés.**

| Pattern de la référence | Pour nous | Pourquoi |
| --- | --- | --- |
| **A. L'en-tête persistant qui se réarrange selon la page** (photo, nom et boutons repositionnés en `transform`, avec `transition: 0.4s ease-out`) | **Retenu.** Sur l'accueil, le titre vertical 背山臨水 et la devise s'affichent en grand dans la marge. Sur les pages projet et pièce, ils se réduisent en étiquette, sans jamais disparaître. | C'est le cœur de la référence : l'élément ne quitte pas la scène, il change de place. Il ne touche à aucune œuvre. |
| **B. Le contenu qui s'efface puis réapparaît, en 0,25 s** (`ease-in` à la sortie, `ease-out` à l'entrée) | **Retenu**, avec les mêmes durées et les mêmes courbes. | Sobre, et il donne le rythme de toutes les navigations. |
| **C. L'élément partagé qui se déplace et change d'échelle d'une page à l'autre** (la photo de profil) | **Retenu pour la transition carte → pièce** (§5) : la vignette devient la première image de la pièce (3.6). | C'est le geste que le calligraphe a choisi. La référence le fait sur un élément persistant. Pour une vignette qui n'existe que sur l'accueil, il faut une transition de vue nommée (voir plus bas). |
| **D. Les micro-interactions en GSAP** (timelines déclenchées par un geste) | **Retenu, à petite dose** : le passage d'une image à l'autre dans le carrousel, et l'ouverture du pinyin et du simplifié. | C'est l'usage que l'article réserve à GSAP. |
| E. Le fond d'en-tête qui change en fondu avec un zoom (`.bk-enter { transform: scale(1.1) }`, image en `background-size: cover`) | **Écarté.** | Il zoome dans l'image et la recadre. Appliqué à une œuvre, il viole le principe 1 (3.1). Nous n'avons pas de photo d'en-tête. |
| F. La photo qui devient ronde (`border-radius: 50%` sur la page Group) | **Écarté.** | Un cercle recadre l'image. |
| G. Les icônes animées (menu, « + » qui tourne, « Saved! ») | **Écarté.** | Rien d'équivalent dans le site, et c'est du mouvement pour lui-même. |

**De Vue/Nuxt à Astro et ses îlots React.** Notre site est multipage. La référence est une application à une seule page : son en-tête survit parce que la page ne se recharge jamais. Dans Astro, pour qu'un en-tête survive à la navigation, il faut le routeur client, `<ClientRouter />`. C'est lui qui porte la directive `transition:persist`, qui sert à « persist components and HTML elements when navigating to another page » ([doc Astro, View transitions](https://docs.astro.build/en/guides/view-transitions/)). **On prend donc `<ClientRouter />`**, que la note écartait jusqu'ici.

Pour écrire l'en-tête, on part de la forme du portage React, et pas d'un script ajouté à la page : un composant qui reçoit la page en prop. La doc d'Astro le permet tel quel. Un îlot marqué `transition:persist` garde son état, « but your component will re-render with new props », et elle cite justement le cas d'« page-specific props » (section `transition:persist-props`). L'en-tête devient donc un îlot React, `<SiteHeader client:load transition:persist page="piece" />`. Il pose `data-page` sur son élément racine, et à chaque navigation, il se re-rend avec la nouvelle valeur. Le DOM reste le même : les `transition` CSS font le trajet, comme dans l'original. Sans JavaScript, l'îlot est rendu au build, et chaque page montre son en-tête déjà en place.

| Référence (Nuxt), et le portage (Next.js) | Astro | Statut |
| --- | --- | --- |
| `<app-navigation />` dans `layouts/default.vue` ; `<AppNavigation>` dans `pages/_app.js` | L'îlot `SiteHeader` dans `Layout.astro`, en `client:load transition:persist` | Se transpose. Astro n'a pas d'`_app` qui enveloppe les pages et survit aux routes : c'est `transition:persist` qui en tient lieu. |
| Le middleware et le store (Nuxt) ; `router.pathname` (Next.js) | La prop `page` (`home`, `project`, `piece`), passée par chaque page à `Layout.astro`, puis à l'îlot. Elle se pose en `data-page` sur l'élément racine de l'îlot, **pas sur `<html>`** : le routeur remplace les attributs de `<html>` à chaque navigation (l'article Interlude le rappelle : « `<html>`'s attributes are replaced on each navigation »). | Autre mécanisme, plus simple : Astro n'a pas de routeur côté React. La page se connaît au build. |
| `transition: 0.4s all ease-out` sur les positions de chaque page | La même chose en CSS, sous `@media (prefers-reduced-motion: no-preference)` | Se transpose tel quel, avec en plus la garde que la référence n'a pas. |
| `.page-enter-active` et `.page-leave-active`, 0,25 s ; le `<Transition>` react-spring du portage | `transition:animate` sur `<main>`, avec une animation personnalisée, comme la doc d'Astro les décrit. Pour l'ancienne page, l'effacement en 250 ms `ease-in` ; pour la nouvelle, l'apparition en 250 ms `ease-out`, une fois la sortie finie. | Autre mécanisme : ce sont des transitions de vue. Le `<Transition>` du portage ne passe pas, car React ne voit jamais les deux pages à la fois : c'est le routeur d'Astro qui les échange. |
| La photo qui change de taille et de place | `transition:name="piece-<slug>"` sur la vignette et sur la première image (3.6) | Autre mécanisme, la transition de vue nommée, mais un geste fidèle. |
| `TimelineMax` (GSAP 2) | `gsap.timeline()` (GSAP 3), dans les îlots React, par `useGSAP()` de `@gsap/react` | La syntaxe de GSAP 2 ne se reprend pas ; les timelines, si. |

**Les risques du routeur, et leur parade.**

- **Les scripts ne se rejouent plus.** La doc d'Astro prévient : « some of your scripts may no longer re-run after page navigation ». Le site n'a pas de script de page en dehors des îlots React. Tout script ajouté plus tard doit s'envelopper dans un écouteur `astro:page-load`. Après une navigation, les îlots de la nouvelle page doivent fonctionner : un test E2E doit le confirmer, en allant d'une pièce à l'autre par un lien, puis en pilotant le carrousel.
- **`apps/site/src/islands/keyboard-pilot.ts` écoute la fenêtre.** Le module n'est évalué qu'une fois, et son écouteur survit à l'échange de page, ce qui est voulu. Chaque carrousel s'inscrit et se désinscrit lui-même (`pilotWithKeyboard` retourne de quoi le désinscrire). Un carrousel détaché du document n'a plus de boîte, donc `checkVisibility()` l'écarte. Le même test E2E doit le couvrir.
- **Les attributs de `<html>` sont remplacés.** `data-theme` disparaît avec les thèmes (§5), et `lang` est le même sur toutes les pages. L'état de la page vit sur l'en-tête persistant.
- **Mouvement réduit.** La doc d'Astro indique que `<ClientRouter />` « includes a CSS media query that disables all view transition animations, including fallback animation, whenever the prefers-reduced-motion setting is detected ». Deux mouvements restent à garder nous-mêmes. Les `transition` CSS de l'en-tête passent sous un `@media`. GSAP passe par `gsap.matchMedia()`, qui « creates a MatchMedia object for adding functions that run when a media query matches » (types de GSAP 3.15.0, `gsap-core.d.ts`).
- **Focus et annonce.** La référence ne fait rien. Le routeur d'Astro annonce la nouvelle page à partir de son `<title>`, ou à défaut de son premier `<h1>` (doc Astro). Chaque page doit donc avoir son propre `<title>`. Où va le focus après l'échange : à vérifier au premier essai.
- **Firefox.** Il n'a pas de transitions de vue entre documents ; le routeur y simule l'animation (`fallback="animate"`, le réglage par défaut).

**GSAP aujourd'hui.**

- **Version** : 3.15.0 (npm, publiée le 13 avril 2026).
- **Licence** : la « Standard 'no charge' license » (champ `license` du paquet npm). Le README du dépôt `greensock/GSAP` présente GSAP comme « 100% FREE », plugins compris, « even for commercial use ». Ce n'est pas une licence open source au sens de l'OSI. La page `gsap.com/standard-license` n'a pas pu être lue le 21 octobre 2026 : `gsap.com` redirigeait vers une page « Forums Temporarily Offline ».
- **Poids**, mesuré sur jsDelivr, compressé en gzip : `gsap.min.js` 28,3 kB, `Flip.min.js` 9,7 kB.

On ne prend que le cœur de GSAP, chargé par les seuls îlots qui s'en servent. Pas de Flip : la transition de vue déplace déjà la vignette.

---

## 3. La proposition

### 3.1 Principes

1. **L'œuvre n'est jamais recadrée, ni déformée, ni animée.** Toute image de calligraphie s'affiche en entier, à ses proportions (`object-fit: contain`, ou dimensions naturelles). Le mouvement ne touche que le passage d'une page à l'autre et d'une image à l'autre, par un fondu.
2. **Une grille, et des étiquettes qui s'alignent.** 12 colonnes à partir de 64rem, 4 en dessous, gouttière de `1.5rem`, marges latérales `clamp(1rem, 4vw, 3rem)`, largeur maximale `90rem`. C'est le principe d'isle-thorne-collective, « so labels line up across the page ». Les métadonnées (date, format, style, statut) commencent toutes sur la même colonne, d'une page à l'autre.
3. **Cinq tailles, pas plus**, chacune complète avec son interlignage et son approche, sur le modèle du bloc `@theme` d'isle-thorne-collective :

   | Jeton | Taille | Usage |
   | --- | --- | --- |
   | `--text-label` | `0.8125rem`, approche `0.08em`, capitales | étiquettes (« Traduction », « Intention »), positions « 1 / 7 » |
   | `--text-body` | `1.0625rem`, interligne `1.65` | prose française, notes, traduction |
   | `--text-lead` | `1.375rem`, interligne `1.45` | présentation d'un projet, pinyin du titre |
   | `--text-cn` | `1.75rem`, approche `0.12em`, interligne `1.9` | colonnes du 正文 en lecture |
   | `--text-display` | `clamp(2.5rem, 6vw, 4.5rem)`, approche `0.14em` | titre chinois d'une pièce ou d'un projet |

   Le chinois se pose sur des carrés de rapport 1:1, « seamlessly arranged with one another » ([clreq §1.2](https://www.w3.org/TR/clreq/#x1-2-basic-features-of-chinese-script)). D'où une approche positive mesurée, et pas de justification forcée.

4. **TW-Kai, la police par défaut des grilles, locale et sous-ensemblée au build.** Le calligraphe veut pour le chinois du site la police qu'il a retenue par défaut pour `/grilles` : le « 楷 standard », TW-Kai (全字庫正楷體), premier de `MODELS` et donc modèle par défaut (`packages/grilles/src/models.ts`). Le fichier est déjà dans le dépôt, avec sa licence OFL 1.1 et sa provenance (`packages/grilles/fonts/TW-Kai-98_1.ttf`, 36,9 Mo, ADR 0003). Le site et la grille parlent ainsi d'un même 楷.

   Vérifié avec fontkit 2.0.4, sur tous les caractères des textes de `docs/sources/` (1 422 traditionnels), leur simplifié dérivé par `packages/content/src/derive.ts` (447 caractères propres) et leur pinyin (23 lettres accentuées) :

   | Police | Traditionnel manquant | Simplifié manquant | Pinyin | Ponctuation CJK |
   | --- | --- | --- | --- | --- |
   | **TW-Kai** (retenue) | 2 (𮌖 𨿽) | 1 (𬬻) | complet | présente |
   | 霞鶩文楷 TC | 2 (𮌖 𨿽) | 0 | complet | présente |
   | Noto Serif CJK TC (complète) | 2 (𮌖 𨿽) | 0 | complet | présente |
   | Noto Serif TC (sous-ensemble régional, chargée aujourd'hui) | 12 (爲 隂 絶 淸 尙 畱 顚…) | **298** | complet | présente |

   Les trois caractères manquants sont des extensions de l'Unicode ; aucun texte publié ne les contient aujourd'hui. Si une pièce en porte un jour, le build doit le signaler, comme la grille signale déjà les caractères qu'un modèle n'a pas, et le navigateur retombe sur une police du système.

   **Deux limites de TW-Kai, mesurées le 21 octobre 2026.** Sa table GSUB ne déclare que la fonction `rtla`, pour les scripts `DFLT` et `hani` :
   - **pas de `locl`** : le simplifié s'écrit dans le dessin de TW-Kai, sans formes propres au continent. Le balisage `lang="zh-Hans"` reste utile aux lecteurs d'écran (principe 8) ;
   - **pas de `vert` ni de `vrt2`** : la police n'a pas de glyphes de ponctuation verticale. Or le texte suit l'image, en colonnes (§5). Les signes sont présents (，。、「」《》：；！？…—), mais ce sera au navigateur de les placer ou de les tourner en `vertical-rl`, sans garantie que la virgule et le point se posent en haut à droite comme le veut l'usage vertical. À vérifier dans un navigateur dès le premier rendu. Si le résultat est faux, une parade simple : une seconde `@font-face` restreinte par `unicode-range` à la ponctuation CJK, tirée d'une police qui porte `vert`. 霞鶩文楷 TC, déjà dans le dépôt (`packages/grilles/fonts/LXGWWenKaiTC-Regular.ttf`, OFL 1.1), déclare `vert` et `vhal` (mesuré avec fontkit le même jour) et reste un 楷 : c'est le candidat naturel, placé avant TW-Kai dans la pile pour la seule ponctuation.

   La police n'est pas recopiée : le build du site lit `packages/grilles/fonts/TW-Kai-98_1.ttf` et en tire un woff2 réduit aux caractères publiés, de la même façon que `packages/grilles/src/models.ts`. Le poids de ce sous-ensemble n'a pas été mesuré. ADR 0003 ne parle que des modèles de grille : que le site emprunte la police des grilles mérite une ligne d'ADR. Pour le latin, la pile de polices système actuelle (`Iowan Old Style`, `Palatino`…) reste, puisqu'elle ne fait aucun appel réseau.

5. **La palette du papier, un seul thème.** On garde le papier teinté et les cinq variables du thème `ink`, pour tout le site ; les thèmes par projet sont abandonnés pour l'instant (§5). L'accent n'apparaît plus qu'en petit, comme un sceau : l'élément courant (vignette, variation affichée), le soulignement des liens au survol, la mention « non publiée ». Les filets (`--rule`) remplacent les cadres des cartes. Il n'y a plus d'ombre portée sous les scans (`box-shadow` de `.carousel__image`) : le scan porte déjà son papier.
6. **L'espace et le rythme.** Un pas vertical de `0.5rem`. Les intervalles entre sections sont des multiples : `3rem` entre blocs, `6rem` avant les versions antérieures. Autour d'une œuvre, de l'air : au moins deux colonnes vides de chaque côté sur écran large quand l'image est verticale.
7. **Un seul vocabulaire de mouvement, celui de la référence (2.3).** L'en-tête persistant se réarrange en 0,4 s `ease-out` ; le contenu s'efface puis revient en 0,25 s ; la vignette grandit jusqu'à l'image de la pièce ; GSAP ne sert qu'aux gestes, en fondus de 200 à 250 ms. Rien ne zoome ni ne recadre une œuvre. Le tout sous `@media (prefers-reduced-motion: no-preference)` et `gsap.matchMedia()`. [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) rappelle que « scaling or panning large objects can be vestibular motion triggers ». Pas de Lenis, pas de WebGL.
8. **Le chinois balisé par langue.** Le traditionnel en `lang="zh-Hant"`, le simplifié en `lang="zh-Hans"`, le pinyin en `lang="zh-Latn-pinyin"`. Les lecteurs d'écran s'en servent pour choisir leur prononciation ; TW-Kai n'ayant pas de `locl` (principe 4), le balisage ne change pas le dessin des caractères.

### 3.2 Accueil (`pages/index.astro`)

- **En-tête** : 背山臨水 composé en `vertical-rl`, en étiquette dans la marge droite sur écran large. C'est le procédé de la [référence Codrops `writing-mode`](https://tympanus.net/codrops/css_reference/writing-mode/). La devise « Soutenu par le maître, je suis les vagues » reste (arbitrage, §5) et passe en `--text-label` au pied de la colonne. En dessous de 64rem, le titre redevient horizontal en haut de page.
- **D'abord, toutes les pièces** (arbitrage, §5) : toutes, avec ou sans projet, de la plus récente à la plus ancienne selon la date de leur dernière version (`version.date`). C'est une grille de vignettes **alignées sur leur pied** (`align-items: end`), comme des œuvres accrochées à la même hauteur d'œil. Chaque vignette garde ses proportions dans une boîte de hauteur fixe (`height: 18rem; width: auto; max-width: 100%`). Le titre chinois et le style en français vont dessous. La section « Pièces isolées » disparaît, puisque chaque pièce est déjà là ; les pièces non publiées du mode admin y figurent aussi, marquées « non publiée » ([#24](https://github.com/xavxyz/bei-shan-lin-shui/issues/24)).
- **Ensuite, les projets** : une liste éditoriale, pas des cartes à bordure. Une ligne par projet sur la grille : le titre en `--text-lead` sur les colonnes 1 à 6, le nombre de pièces en `--text-label` sur la colonne 7, et à droite, sur les colonnes 9 à 12, l'œuvre mise en avant de sa première pièce, non recadrée. Le schéma n'a pas d'image de projet : on la dérive de `pieceSlugs[0]`, sans rien stocker. Cette image ne porte pas de nom de transition : la pièce a déjà le sien plus haut (3.6).

### 3.3 Page projet (`pages/[project]/index.astro`)

- Deux zones sur la grille. Colonnes 1 à 4 : titre chinois ou français en `--text-display`, présentation en `--text-lead`, nombre de pièces. Cette zone est `position: sticky; top: 2rem` sur écran large, pour que la présentation reste lisible pendant qu'on parcourt les œuvres. Colonnes 6 à 12 : les pièces, avec les mêmes vignettes alignées sur leur pied que l'accueil.
- Le projet ne teinte plus la page : un seul papier pour tout le site (§5).
- Chaque vignette porte `transition:name={`piece-${slug}`}` (3.6).

### 3.4 Page pièce (`components/PieceArticle.astro` et ses enfants)

De haut en bas :

1. **Fil d'Ariane** en `--text-label`, sur la colonne 1.
2. **Titre** : le chinois en `--text-display`, et en dessous, le pinyin en `--text-lead` italique avec l'attribution (auteur · œuvre · dynastie) en `--text-label`.
3. **L'œuvre** (le carrousel). La scène prend toute la largeur de la grille, et sa hauteur est `calc(100svh - <hauteur de l'en-tête>)`, pas `80vh`. L'image s'y montre entière, centrée, à ses proportions, qu'elle soit verticale ou horizontale. Les formats très allongés (立軸, 手卷) sont hors périmètre : il n'y en a pas encore (§5).

   Les boutons précédent et suivant deviennent **les deux moitiés invisibles de la scène**, comme dans `ProductGallery.astro` d'isle-thorne-collective. La flèche apparaît au survol et au `:focus-visible`, en fondu seul sous mouvement réduit. Les boutons ronds disparaissent des marges, et l'image regagne leur largeur. Le pilote clavier ← → reste tel quel, et les libellés « Image précédente » et « Image suivante » aussi. Pour le reste, on suit le [tutoriel W3C](https://www.w3.org/WAI/tutorials/carousels/functionality/) : ne pas déplacer le focus sur précédent ou suivant (le déplacer « makes it harder for users to browse back and forth »), et annoncer l'élément affiché dans une région `aria-live="polite"`. L'annonce dira « 2 / 7 · v1a · cursif », plus seulement la position.

4. **Légende** sous l'image, sur une ligne alignée à la grille : à gauche, variation · style en français · statut · nature de l'image ; à droite, la position « n / N » en chiffres tabulaires. Les vignettes, groupées par variation, forment une rangée en dessous. Sur téléphone, cette rangée défile horizontalement avec `scroll-snap-type: x proximity`, au lieu des points actuels. C'est la rangée `scroll-row` d'isle-thorne-collective, et le carrousel de base de Codrops, réduit aux vignettes.
5. **Les variations** : une liste à filets sur la grille. Colonnes 1 à 2 : l'identifiant (`v1a`). Colonnes 3 à 5 : le style **en français**, suivi de son 楷書 (`SCRIPT_HANZI`) en petit. Colonnes 6 à 7 : le statut. Colonnes 8 à 12 : la note personnelle. La variation affichée est marquée d'un filet d'accent à gauche, à la place du `▸`.
6. **Les métadonnées** : un `<dl>` sur une ligne. Date en français et en 干支節氣 (`VersionDate.astro`), format, statut de la pièce. Elles quittent les pastilles arrondies pour des paires étiquette et valeur en `--text-label` et `--text-body`.
7. **La lecture**, en deux zones :
   - à droite (colonnes 8 à 12), le 正文 **suit l'image** (arbitrage, §5) : en `vertical-rl`, une colonne par colonne de la version (le schéma les porte déjà, `version.columns`), qui se lisent de droite à gauche, comme sur le papier. Le clreq le formule ainsi : « Characters are arranged from top to bottom, and lines are arranged from right to left » ([clreq §2.1.2](https://www.w3.org/TR/clreq/#x2-1-2-major-differences-between-horizontal-and-vertical-writing-modes)). Le texte reste vertical à toutes les largeurs : sur téléphone, c'est la taille des caractères qui se réduit pour que les colonnes tiennent (`--text-cn` borné par la largeur disponible divisée par le nombre de colonnes), et non le texte qui repasse en lignes ;
   - à gauche (colonnes 1 à 6), dans cet ordre : traduction, intention, puis pinyin et simplifié **repliés** (arbitrage, §5), puis le texte intégral replié lui aussi. Chaque repli est un `<details>` natif : accessible au clavier et aux lecteurs d'écran sans JavaScript, comme les panneaux d'une page produit d'isle-thorne-collective. Le `<summary>` dit ce qu'il cache (« Pinyin », « Simplifié »), et son contenu porte son `lang` (3.1, principe 8).

   Le pinyin reste **un bloc à part, horizontal**, et ne vient pas en annotation interlinéaire (ruby) dans le texte vertical. Pour le clreq, la romanisation n'existe qu'à l'horizontale (« Romanization is only available in horizontal writing mode », [§5.5.4.1](https://www.w3.org/TR/clreq/#x5-5-4-1-basic-requirements)), et « 常規排版中沒有行間注標音的習慣 » : la composition ordinaire n'annote pas la prononciation ([§5.5.1.1](https://www.w3.org/TR/clreq/#x5-5-1-1-indicating-the-pronunciation-for-han-characters)). Si un chiffre arabe apparaît un jour dans un texte vertical, on le pose en 縱中橫 avec `text-combine-upright: all`, qui exige un `<span>` autour du chiffre ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/text-combine-upright)). Le support est large : Chrome 48, Firefox 48, Safari 15.4.

8. **Les versions antérieures** : on garde le `<details>` « voir l'évolution ». Chaque version y reprend la même composition en réduit (scène, légende, variations, métadonnées), précédée d'un filet et de sa date en `--text-lead`. Le libellé du `summary` reste le même, pour les tests.

### 3.5 Survol et focus

- **Carte** : l'image ne bouge pas. Seul le titre se souligne, `text-decoration-color: var(--accent)`, en fondu de 150 ms. Le focus clavier dessine un contour net `2px solid currentColor` décalé de `2px`, comme l'`:focus-visible` global d'isle-thorne-collective.
- **Cibles** d'au moins 24 px de haut, vignettes et filets de variation compris : c'est la règle d'isle-thorne-collective.

### 3.6 Les transitions de page, et la transition carte → pièce

Elles suivent la référence (2.3). Le calligraphe a retenu la transition carte → pièce (§5) : quand on clique une vignette, l'image grandit jusqu'à sa place sur la page de la pièce, au lieu que la page change d'un coup. Toutes les transitions sont désactivées pour qui demande moins de mouvement.

**Le cadre.** `<ClientRouter />` dans le `<head>` de `Layout.astro`. L'en-tête est l'îlot `SiteHeader`, en `client:load transition:persist`. Il reçoit la page en prop (`home`, `project`, `piece`), la pose en `data-page` sur son élément racine, et se re-rend à chaque navigation (pattern A, 2.3). `<main>` porte une animation de sortie puis d'entrée en 250 ms (pattern B). Les images clés `sortie` et `entree` (opacité de 1 à 0, et de 0 à 1) vivent dans `global.css` ; la forme de l'objet suit la section « Customizing animations » de la doc d'Astro :

```astro
---
const pageFade = {
  forwards: {
    old: { name: "sortie", duration: "250ms", easing: "ease-in", fillMode: "both" },
    new: {
      name: "entree",
      duration: "250ms",
      easing: "ease-out",
      delay: "250ms",
      fillMode: "both",
    },
  },
  backwards: {/* idem */},
};
---

<main id="contenu" transition:animate={pageFade}>…</main>
```

```css
@media (prefers-reduced-motion: no-preference) {
  .site-header,
  .site-header * {
    transition:
      transform 0.4s ease-out,
      opacity 0.4s ease-out;
  }
}
.site-header[data-page="piece"] .site-title {
  transform: translateY(-1rem) scale(0.6);
}
```

Le titre se réduit par `scale`, mais c'est du texte, jamais une œuvre : le principe 1 tient.

**La vignette qui devient l'image (pattern C).**

- La vignette de la carte et la **première image** de la page pièce portent le même `transition:name={\`piece-${slug}\`}`. Le carrousel ouvre déjà sur l'image mise en avant (`orderSlides`), qui est aussi celle de la carte (`piece.featuredImage`) : la paire existe d'elle-même. Le préfixe `piece-`évite un identifiant CSS qui commencerait par un chiffre, ce que`slugSchema` permet.
- Il faut veiller à ce que chaque nom soit unique. Deux éléments qui portent le même nom au même moment, et « the transition will be skipped » ([MDN `view-transition-name`](https://developer.mozilla.org/en-US/docs/Web/CSS/view-transition-name)). Deux cas sont à surveiller. Sur l'accueil, l'image dérivée d'un projet reprend celle d'une pièce déjà présente dans la grille : seule la vignette de la pièce porte le nom. Les carrousels des versions antérieures, eux, n'en portent pas.
- **Pas de déformation.** La vignette n'est plus recadrée (3.1, principe 1) : l'image a donc les mêmes proportions aux deux bouts. Le changement de taille que décrit MDN (« `height` and `width` transitions have a smooth scaling animation applied ») l'agrandit sans la déformer. Si les proportions différaient, la transition étirerait l'image : c'est une raison de plus de ne jamais recadrer la vignette.

**GSAP, pour les gestes (pattern D).** Dans `Carousel.tsx`, le passage d'une image à l'autre devient une timeline courte, écrite dans `useGSAP()` et placée sous `gsap.matchMedia()` : l'image sortante s'efface en 200 ms, l'entrante apparaît en 250 ms, sans déplacement ni zoom. Sous mouvement réduit, l'image change d'un coup. L'ouverture du pinyin et du simplifié peut suivre le même modèle. Tant qu'aucun autre geste ne le demande, GSAP n'entre que dans cet îlot.

---

## 4. Ce qu'il faudrait changer, fichier par fichier

Rien n'est modifié par cette note. Voici la liste des changements qu'elle propose.

| Fichier | Changement |
| --- | --- |
| `apps/site/src/layouts/Layout.astro` | Retirer les trois `<link>` vers Google Fonts. Retirer la prop `theme` et l'attribut `data-theme` de `<html>`. Ajouter `<ClientRouter />` dans le `<head>`, une prop `page` transmise à l'îlot `SiteHeader` (`client:load transition:persist`), et `transition:animate` sur `<main>` (3.6). Un `<title>` propre à chaque page, pour l'annonce du routeur. Ajouter un `<link rel="preload" as="font">` vers le sous-ensemble local, un lien d'évitement vers `<main id="contenu">`, et l'en-tête à titre vertical (3.2). Prévoir un pied de page minimal. Une page n'a qu'un `h1` : aujourd'hui, le titre du site est un `h1` et celui de la pièce un `h2`. Il faut l'inverser hors de l'accueil. |
| `apps/site/src/styles/global.css` | Poser les jetons d'espace et les cinq tailles (3.1), l'utilitaire de grille 4/12 colonnes, les images clés `sortie` et `entree`, les positions de l'en-tête par `data-page` et leurs `transition` sous garde de mouvement réduit (3.6), et l'`:focus-visible` global. Ajouter `@font-face` pour le sous-ensemble et remplacer `--serif-cn`. Supprimer les blocs `[data-theme="jade"]`, `[data-theme="cinnabar"]` et `[data-theme="indigo"]` : les variables de `:root` (le thème `ink`) restent seules. Supprimer les cadres de `.card`, le recadrage de `.card__thumbnail` et les pastilles `.tag`, qui deviennent les paires du `<dl>`. Passer `.chinese-text` à `--text-cn`. |
| `apps/site/src/components/PieceCard.astro` | Vignette non recadrée, avec `width` et `height` explicites (il faut connaître les dimensions, voir plus bas), `transition:name={`piece-${slug}`}`, et le style en français sous le titre. |
| `apps/site/src/pages/index.astro` | D'abord toutes les pièces, de la plus récente à la plus ancienne, en grille alignée sur le pied ; ensuite la liste éditoriale des projets avec œuvre dérivée (3.2). La section « Pièces isolées » disparaît. |
| `apps/site/src/pages/[project]/index.astro` | Deux zones, présentation collante à gauche et pièces à droite (3.3). Ne plus passer `theme={project.theme}` au layout. |
| `apps/site/src/pages/[project]/[piece].astro`, `apps/site/src/pages/pieces/[piece].astro` | Ne plus passer `theme={project.theme}` au layout ; le titre de pièce passe en `h1` par `PieceArticle`. |
| `apps/site/src/components/PieceArticle.astro` | Recomposition sur la grille : titre, œuvre, légende, variations, `<dl>`, lecture en deux zones (3.4), avec pinyin et simplifié dans des `<details>` fermés par défaut. |
| `apps/site/src/components/ChineseText.astro` | Garder une colonne par `p`, en `vertical-rl` à toutes les largeurs : retirer le passage en lignes sous 768 px, et borner la taille des caractères par la largeur et le nombre de colonnes (3.4). Poser `lang="zh-Hant"` sur le traditionnel, `lang="zh-Hans"` sur le simplifié, `lang="zh-Latn-pinyin"` sur le pinyin. |
| `apps/site/src/components/VersionDate.astro` | Rendu en paire étiquette et valeur plutôt qu'en `.tag`. |
| `apps/site/src/components/VersionVariations.astro` | Passer au carrousel le nom de transition, seulement pour la version courante. |
| `apps/site/src/components/EarlierVersions.astro` | Même composition en réduit, sans nom de transition. |
| `apps/site/src/islands/Carousel.tsx` | Moitiés invisibles en guise de boutons (garder `aria-label` « Image précédente » et « Image suivante »), scène pleine hauteur avec l'image entière (3.4), annonce enrichie, rangée de vignettes défilante sur téléphone au lieu des points. Passage d'une image à l'autre en timeline GSAP, par `useGSAP()` sous `gsap.matchMedia()` (3.6, pattern D). Garder tous les `data-testid`. |
| `apps/site/src/islands/Carousel.css` | Mêmes changements côté style. Retirer `max-height: 80vh` et `box-shadow`. Ajouter `@media (prefers-reduced-motion: no-preference)` autour du fondu entre images. |
| `apps/site/src/islands/keyboard-pilot.ts` | Rien. L'écouteur de fenêtre survit au routeur, ce qui est voulu ; chaque carrousel se désinscrit lui-même, et un carrousel détaché est écarté par `checkVisibility()` (2.3). À couvrir par un test E2E. |
| _nouveau_ `apps/site/src/islands/SiteHeader.tsx` et `SiteHeader.css` | L'en-tête persistant : titre vertical, devise, navigation. Il reçoit `page` et la pose en `data-page` ; ses positions par page et leurs `transition` (0,4 s `ease-out`) passent sous garde de mouvement réduit. Sur le modèle de l'original de sdras, écrit dans la forme du portage React (2.3). |
| _nouveau_ `apps/site/src/islands/SiteHeader.fixture.tsx` | Une fixture react-cosmos par valeur de `page`, comme `AppNavigation.fixture.js` dans le portage du calligraphe. |
| `apps/site/package.json` | Ajouter `gsap` (^3.15.0) et `@gsap/react` (^2.1.2). `<ClientRouter />` est fourni par `astro`, déjà présent. |
| _nouveau_ `apps/site/src/integrations/site-fonts.ts` | Au build, rassembler les caractères publiés (traditionnel, simplifié et pinyin dérivés, ponctuation) et sous-ensembler `packages/grilles/fonts/TW-Kai-98_1.ttf`, sans la recopier, comme `packages/grilles/src/models.ts`, en woff2 servi par le site. Signaler au build tout caractère absent de la police. |
| _nouveau_ `docs/adr/0005-…` | La police du site : TW-Kai, la police par défaut des grilles, empruntée à `packages/grilles/fonts/` (3.1, principe 4), et, si le rendu vertical l'exige, 霞鶩文楷 TC pour la seule ponctuation. ADR 0003 ne couvre que les modèles de grille. |
| `apps/site/tests/e2e/navigation.spec.ts` | Retirer les deux assertions sur `data-theme` (lignes 16 et 20), qui décrivent les thèmes abandonnés. Ajouter un parcours par liens, sans recharger : accueil → pièce → autre pièce, puis ← → sur le carrousel, pour vérifier que les îlots et le pilote clavier vivent après l'échange de page (2.3). La navigation passant par le routeur, les assertions attendent l'URL (`waitForURL`) plutôt qu'un chargement de page. |
| _hors de `apps/site`_ : le champ `theme` du projet | Rien pour l'instant. `packages/schema/src/index.ts` exige `theme` et le glossaire en parle ; le site cesse simplement de le lire. Retirer le champ serait une autre décision, à prendre si les thèmes ne reviennent pas. |
| _hors de `apps/site`_ : `packages/schema` et `packages/content` | Ajouter à `loadedImageSchema` une largeur et une hauteur **dérivées au chargement** (lues dans l'image, jamais stockées), pour poser `width` et `height` et éviter les décalages de mise en page. Plus tard, des dérivés réduits pour les vignettes : elles chargent aujourd'hui le scan pleine taille. |

---

## 5. Arbitrages du calligraphe (21 octobre 2026)

Les questions posées par la première version de cette note ont toutes reçu leur réponse ; la police et la référence des transitions ont été tranchées dans un second temps, le même jour. Chaque décision est répercutée plus haut.

| Question | Arbitrage | Où elle porte |
| --- | --- | --- |
| Quel 體 pour le chinois du site ? | La police par défaut des grilles : TW-Kai, le « 楷 standard » (`packages/grilles/src/models.ts`). | 3.1, principe 4 ; §4 |
| Le texte en vertical ? | Le texte suit l'image : vertical, une colonne par colonne de la version, de droite à gauche, à toutes les largeurs. | 3.4, point 7 ; `ChineseText.astro` |
| Pinyin et simplifié ? | Repliés par défaut, dans des `<details>` natifs. | 3.4, point 7 |
| Le fond ? | Le papier teinté. | 3.1, principe 5 |
| L'accueil ? | La devise reste ; toutes les pièces d'abord, de la plus récente à la plus ancienne, les projets ensuite. | 3.2 |
| Les thèmes de projet ? | Abandonnés pour l'instant : un seul thème, celui du papier (`ink`). Le site cesse de lire `project.theme` ; le champ reste dans le schéma. | 3.1, principe 5 ; 3.3 ; §4 |
| Les formats allongés, 立軸 et 手卷 ? | Il n'y en a pas encore : leur affichage n'est pas conçu. Hors périmètre. | 3.4, point 3 |
| Un sceau, 戈 ? | Il n'y en a pas encore. Hors périmètre ; l'accent reste le vermillon actuel. | — |
| Quels statuts le public voit-il ? | Déjà réglé ailleurs : le site public ne montre que les pièces publiées, et un mode admin local montre aussi les autres, marquées « non publiée » ([#24](https://github.com/xavxyz/bei-shan-lin-shui/issues/24), détaché de [#13](https://github.com/xavxyz/bei-shan-lin-shui/issues/13), toutes deux fermées). La mise en page n'en décide rien ; elle garde la mention « non publiée » en accent. | 3.1, principe 5 ; 3.2 |
| La transition de la carte vers la pièce ? | Retenue, désactivée sous `prefers-reduced-motion`. | 3.6 |
| La référence des transitions de page ? | [pagetransitions.netlify.app](https://pagetransitions.netlify.app/) de Sarah Drasner, avec GSAP, « au max ». On en prend l'en-tête persistant qui se réarrange, le contenu qui s'efface puis revient, l'élément partagé qui grandit, et GSAP pour les gestes. Le zoom du fond et la photo arrondie sont écartés, parce qu'ils recadrent. D'où `<ClientRouter />` et GSAP 3, que la note écartait. L'original de sdras fait foi. Le portage React du calligraphe ([xavxyz/nextjs-page-transitions](https://github.com/xavxyz/nextjs-page-transitions)) ne sert qu'à montrer la forme React, et là où il s'en écarte (fondu superposé, react-spring au lieu de GSAP), on suit l'original. | 2.3 ; 3.1, principe 7 ; 3.6 ; §4 |
| Le partage entre CSS et GSAP ? | Confirmé après lecture de la référence : « CSS majoritairement, basé sur les mêmes principes que Sarah Drasner, et GSAP pour le gros ». Le changement de page reste en CSS, comme chez sdras : l'en-tête persistant, le fondu du contenu et l'élément partagé. GSAP prend les mouvements chorégraphiés, ceux qui enchaînent plusieurs éléments ou demandent un minutage que le CSS rend mal. Le carrousel en fait partie. | 2.3 ; 3.1, principe 7 ; 3.6 |

Il ne reste aucune question ouverte. Un point est à vérifier au premier rendu : la ponctuation verticale de TW-Kai (3.1, principe 4).

## 6. Arbitrages du calligraphe après le prototype (25 octobre 2026)

Le prototype (branche `prototype/mise-en-page`) a retenu **A · Cimaise, avec la devise en grand de C**. Une séance de questions a ensuite repris l'interface à partir de ce verdict, et un second prototype (branche `prototype/gloses-et-traduction`) a tranché le corps de la page pièce. Ces décisions **remplacent** celles du §5 là où elles le contredisent : le texte vertical, les replis du pinyin et du simplifié, le thème, et GSAP pour le carrousel.

| Question | Arbitrage |
| --- | --- |
| La mise en page ? | A · Cimaise. Sur l'accueil, l'en-tête prend toute la hauteur, avec le titre et la devise en grand. Ailleurs, il reste réduit. |
| Le titre d'une pièce et d'un projet ? | Un titre chinois et, dessous, une **glose** : une courte phrase française, optionnelle (`GLOSSARY.md`). Le titre d'un projet devient chinois, comme celui d'une pièce : 戈之研究, glosé « Explorations personnelles ». Sans glose, on n'affiche que le titre chinois. Les gloses manquantes sont à revoir ([#69](https://github.com/xavxyz/bei-shan-lin-shui/issues/69)). |
| La traduction ? | Elle appartient à la version : une ligne française par colonne, 款 compris, écrite à la main (`GLOSSARY.md`, **Traduction**). Elle est optionnelle, mais une traduction présente couvre toutes les colonnes, sinon le build casse. Le champ `translation` de la pièce disparaît : celui de 永草書 était en fait une glose. |
| Le texte de la pièce ? | **Plus de texte vertical.** Il se présente à l'horizontale, dans un tableau « chinois simplifié / français », une ligne par colonne de l'œuvre. Sans traduction, c'est une simple liste des lignes en simplifié. Le traditionnel ne reste que dans l'œuvre, dans le titre et dans le texte intégral de la source. |
| Le pinyin ? | Il s'ouvre en popover sur chaque ligne du tableau : au survol sur ordinateur, au toucher sur mobile, et au focus au clavier. Il n'y a plus de replis. |
| La ponctuation ? | Horizontale, celle de TW-Kai. La question de la ponctuation verticale disparaît avec le texte vertical. |
| Le corps de la page pièce ? | **Vis-à-vis** (variante 3 du second prototype). L'œuvre reste fixe en colonnes 1 à 7. À droite, en colonnes 8 à 12, défilent le titre, la glose, le tableau, les faits et la prose. |
| Une œuvre plus haute que l'écran ? | Elle tient entière dans la hauteur de la fenêtre, réduite au besoin, jamais recadrée. Avec plusieurs images, le carrousel reste fixe dans la colonne de gauche. |
| Les versions antérieures ? | Même vis-à-vis que la version courante, en dessous. |
| Le format ? | Un libellé français dérivé au build (« 4 colonnes de 5 caractères »), avec la notation brute en petit dessous. |
| Le pinyin des titres ? | En popover, comme les lignes du tableau. |
| Sur mobile ? | Le vis-à-vis s'empile : titre, glose, œuvre, tableau, faits, prose, versions antérieures. |
| Ce que voit le public ? | Les pièces publiées **qui ont une image**. Une pièce publiée sans scan reste cachée. |
| Les pièces sans scan, en mode admin ? | Elles sont regroupées dans une section à part, « Sans scan · N », entre le mur et les projets, et sous les œuvres sur la page projet. Chacune y occupe une rangée : titre, glose, statut et date de la dernière version. |
| Les pièces scannées non publiées, en mode admin ? | Elles restent dans le mur, marquées « non publiée ». |
| Le thème des projets ? | Retiré du schéma et du vocabulaire dans ce chantier. |
| Ce que fait GSAP ? | Seulement la vignette du mur qui grandit jusqu'à l'œuvre. Le carrousel garde son défilement, et le reste est en CSS. |
| La police du site ? | Une ADR à écrire, qui cite l'ADR 0003 : TW-Kai réduite aux caractères publiés, à la place de Noto Serif TC chargée depuis Google Fonts. |

---

## Sources

**Codrops (articles relus en direct dans un navigateur le 21 octobre 2026 ; pour la galerie GSAP et la galerie WebGL, seuls l'en-tête et les bibliothèques citées ; la référence `text-orientation` n'a pas été relue)**

- Tom Miller, [Mastering Carousels with GSAP: From Basics to Advanced Animation](https://tympanus.net/codrops/2025/04/21/mastering-carousels-with-gsap-from-basics-to-advanced-animation/), 21 avril 2025.
- Igor Penaque, [Animating Multi-Page Navigations with Browser View Transitions and Astro](https://tympanus.net/codrops/2023/10/03/animating-multi-page-navigations-with-browser-view-transitions-and-astro/), 3 octobre 2023.
- Noam Rosenthal, [Making CSS View Transitions Easy with Velvette](https://tympanus.net/codrops/2024/01/19/making-css-view-transitions-easy-with-velvette/), 19 janvier 2024.
- Adam Argyle, [A Practical Introduction to Scroll-Driven Animations with CSS scroll() and view()](https://tympanus.net/codrops/2024/01/17/a-practical-introduction-to-scroll-driven-animations-with-css-scroll-and-view/), 17 janvier 2024.
- Max Barvian, [Experimental CSS-Only Carousels with Scroll-Driven Animations](https://tympanus.net/codrops/2024/01/24/experimental-css-only-carousels-with-scroll-driven-animations/), 24 janvier 2024.
- Surya Aditya, [Building an Infinite GSAP Scroll Gallery with Parallax and Flip Transitions](https://tympanus.net/codrops/2026/07/30/building-an-infinite-gsap-scroll-gallery-with-parallax-and-flip-transitions/), 30 juillet 2026.
- Chakib Mazouni, [Building a Scroll-Revealed WebGL Gallery with GSAP, Three.js, Astro and Barba.js](https://tympanus.net/codrops/2026/02/02/building-a-scroll-revealed-webgl-gallery-with-gsap-three-js-astro-and-barba-js/), 2 février 2026 (titre et en-tête seuls).
- Manoela Ilic, [Interlude: A Starter for Custom Page Transitions in Astro](https://tympanus.net/codrops/2026/10/07/interlude-astro-page-transitions/), 7 octobre 2026.
- Manoela Ilic, [Isle Thorne Collective: A Free Astro Template for Furniture Shops](https://tympanus.net/codrops/2026/10/07/isle-thorne-collective-astro-template/), 7 octobre 2026.
- Hui Jing Chen, [CSS Reference : writing-mode](https://tympanus.net/codrops/css_reference/writing-mode/) et [text-orientation](https://tympanus.net/codrops/css_reference/text-orientation/).

**La référence des transitions (lue le 21 octobre 2026)**

- Sarah Drasner, [pagetransitions.netlify.app](https://pagetransitions.netlify.app/), parcourue et mesurée dans Chrome (positions et opacités par `getComputedStyle`, scripts servis, styles servis).
- [sdras/page-transitions-travelapp](https://github.com/sdras/page-transitions-travelapp), via `gh api` : `README.md`, `package.json`, `nuxt.config.js`, `middleware/pages.js`, `store/index.js`, `layouts/default.vue`, `components/AppNavigation.vue`, `components/AppNavTransition.vue`, `pages/index.vue`, `pages/place.vue`.
- Appui secondaire : [xavxyz/nextjs-page-transitions](https://github.com/xavxyz/nextjs-page-transitions), le portage React et Next.js du calligraphe (2018, MIT), via `gh api` : `README.md`, `package.json`, `pages/_app.js`, `components/AppNavigation.js`, `components/AppNavTransition.js`, `components/AppNavigation.fixture.js`, `components/Link.js`.
- Sarah Drasner, [Native-Like Animations for Page Transitions on the Web](https://css-tricks.com/native-like-animations-for-page-transitions-on-the-web/), CSS-Tricks, 23 avril 2018.

**GSAP**

- Paquet npm `gsap` 3.15.0 (`npm view` : version, champ `license`, date) ; types `types/gsap-core.d.ts` (`gsap.matchMedia`), via jsDelivr ; poids gzip de `dist/gsap.min.js` et `dist/Flip.min.js` mesurés sur jsDelivr le 21 octobre 2026.
- [greensock/GSAP](https://github.com/greensock/GSAP), `README.md` (sections « GSAP is FREE! » et « License »).
- `@gsap/react` 2.1.2, `README.md` (`useGSAP()`).
- `gsap.com/standard-license` et `gsap.com/docs` : illisibles le 21 octobre 2026, redirigés vers une page « Forums Temporarily Offline ».

**Codrops (code, GitHub)**

- [codrops/isle-thorne-collective](https://github.com/codrops/isle-thorne-collective) : `README.md`, `src/styles/global.css`, `src/components/ProductGallery.astro`.
- [codrops/interlude](https://github.com/codrops/interlude) : `README.md`.
- [codrops/astro-shop-view-transitions](https://github.com/codrops/astro-shop-view-transitions) : `src/components/ProductCard.astro`, `src/pages/product/[slug]/index.astro`.
- [codrops/ConnectedGrid](https://github.com/codrops/ConnectedGrid), [codrops/ElasticGridScroll](https://github.com/codrops/ElasticGridScroll), [codrops/DoubleImageHoverEffects](https://github.com/codrops/DoubleImageHoverEffects), [codrops/SlideshowAnimations](https://github.com/codrops/SlideshowAnimations) : `README.md` (dépendances).

**Références web**

- MDN : [Using the View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using), [`@view-transition`](https://developer.mozilla.org/en-US/docs/Web/CSS/@view-transition), [`view-transition-name`](https://developer.mozilla.org/en-US/docs/Web/CSS/view-transition-name), [`writing-mode`](https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode), [`text-combine-upright`](https://developer.mozilla.org/en-US/docs/Web/CSS/text-combine-upright), [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion), [Basic concepts of scroll snap](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_scroll_snap/Basic_concepts).
- [MDN browser-compat-data 8.1.6](https://github.com/mdn/browser-compat-data) (15 octobre 2026) : `css.at-rules.view-transition`, `css.properties.view-transition-name`, `css.properties.writing-mode.vertical-rl`, `css.properties.text-combine-upright`, `css.properties.scroll-snap-type`, `css.properties.animation-timeline.view`, `css.at-rules.media.prefers-reduced-motion`.
- Chrome for Developers, [Cross-document view transitions](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document).
- Astro, [View transitions](https://docs.astro.build/en/guides/view-transitions/), relue dans Chrome le 21 octobre 2026 : `transition:persist` (îlots compris), `transition:animate` et animations personnalisées, `transition:persist-props` (un îlot persistant se re-rend avec ses nouvelles props), cycle `astro:before-swap` / `astro:after-swap` / `astro:page-load`, `data-astro-rerun`, annonce de la page, mouvement réduit, `fallback`.
- W3C, [Requirements for Chinese Text Layout (clreq)](https://www.w3.org/TR/clreq/) : §1.2, §2.1.2, §3.1.1.1, §5.5.1.1, §5.5.4.1.

**Police**

- [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk), version Serif2.003 (30 juillet 2024) : `Serif/README.md` (formats de diffusion), `Serif/OTF/TraditionalChinese/NotoSerifCJKtc-Regular.otf` et `Serif/SubsetOTF/TC/NotoSerifTC-Regular.otf` (couverture mesurée avec fontkit 2.0.4, le 21 octobre 2026, pour comparaison), `Serif/LICENSE` (SIL OFL 1.1).
- W3C WAI, [Carousels Tutorial](https://www.w3.org/WAI/tutorials/carousels/), [Structure](https://www.w3.org/WAI/tutorials/carousels/structure/), [Functionality](https://www.w3.org/WAI/tutorials/carousels/functionality/).

**Dans le dépôt**

- `docs/adr/0003-les-polices-du-modele-vivent-dans-le-depot.md` ; `packages/grilles/src/models.ts` (sous-ensemble woff2) ; `packages/grilles/fonts/` (couverture et fonctions OpenType de TW-Kai et de 霞鶩文楷 TC vérifiées avec fontkit le 21 octobre 2026) ; `packages/content/src/derive.ts` (simplifié par opencc-js `tw → cn`, pinyin par pinyin-pro) ; `docs/sources/` (corpus de la mesure de couverture).
- Issues [#13](https://github.com/xavxyz/bei-shan-lin-shui/issues/13) et [#24](https://github.com/xavxyz/bei-shan-lin-shui/issues/24) : le mode admin local.
