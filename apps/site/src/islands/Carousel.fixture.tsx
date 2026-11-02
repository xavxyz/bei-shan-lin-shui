import {
  loadedImageSchema,
  loadedVariationSchema,
  SCRIPT_LABELS,
  type LoadedImage,
  type LoadedVariation,
} from "@bsls/schema";
import { featuredVariation, pickFeaturedImage } from "@bsls/content/featured";
import { workTransitionName } from "../work-transition.js";
import { Carousel } from "./Carousel.js";
import { placeholder } from "./fixture-placeholder.js";

/**
 * Les fixtures sont validées par le schéma partagé : une évolution du schéma
 * les casse ici, avant de casser le site.
 */
function image(attributes: Partial<LoadedImage> & { file: string; src: string }): LoadedImage {
  return loadedImageSchema.parse({ kind: "work", capture: "scan", ...attributes });
}

/** Une variation telle que la livre le content layer, image mise en avant comprise. */
function variation(
  attributes: Pick<LoadedVariation, "id" | "script" | "status"> & Partial<LoadedVariation>,
): LoadedVariation {
  const images = attributes.images ?? [];
  return loadedVariationSchema.parse({
    scriptLabel: SCRIPT_LABELS[attributes.script],
    featuredImage: pickFeaturedImage(images),
    ...attributes,
    images,
  });
}

const a4 = image({
  file: "v2a-01.jpg",
  src: placeholder(210, 297, "山"),
  featured: true,
  caption: "Version retenue, encre de Chine sur papier de riz.",
});
const detail = image({
  file: "v2a-02.jpg",
  src: placeholder(120, 900, "居"),
  kind: "detail",
  caption: "Détail de la troisième colonne.",
});
const study = image({ file: "v2c-01.jpg", src: placeholder(210, 297, "秋"), kind: "study" });
const setAsideWork = image({ file: "v2c-02.jpg", src: placeholder(210, 297, "暝") });

const kept = variation({
  id: "v2a",
  script: "caoshu",
  status: "kept",
  personal_note: "La troisième colonne tient enfin ; le rythme se referme sur 流.",
  images: [a4, detail],
});
const withoutImage = variation({
  id: "v2b",
  script: "kuangcao",
  status: "to-try",
  personal_note: "À tenter une fois le geste assuré.",
});
const setAside = variation({
  id: "v2c",
  script: "xingcao",
  status: "set-aside",
  personal_note: "Le grand courant noie la lumière ; à laisser de côté.",
  images: [study, setAsideWork],
});

const title = "山居秋暝";

/**
 * Le carrousel tel que `VersionVariations.astro` le monte : la règle du content
 * layer choisit qui l'ouvre ; `transitionName`, quand la page pièce le passe,
 * lie l'image d'ouverture à la vignette du mur.
 */
function carousel(variations: LoadedVariation[], transitionName?: string) {
  return (
    <Carousel
      title={title}
      variations={variations}
      leadingVariation={featuredVariation(variations)?.id ?? null}
      transitionName={transitionName}
    />
  );
}

export default {
  "une image": carousel([
    variation({ id: "v1a", script: "xingshu", status: "kept", images: [a4] }),
  ]),

  "plusieurs variations": carousel([kept, setAside]),

  "ouverte depuis le mur": carousel([kept, setAside], workTransitionName("shan-ju-qiu-ming")),

  "une variation sans image": carousel([kept, withoutImage, setAside]),

  "portrait A4": carousel([
    variation({ id: "v1a", script: "kaishu", status: "tried", images: [a4] }),
  ]),

  "détail très allongé": carousel([
    variation({ id: "v1a", script: "caoshu", status: "tried", images: [detail] }),
  ]),

  "légende longue": carousel([
    variation({
      id: "v1a",
      script: "xingcao",
      status: "set-aside",
      images: [
        image({
          ...a4,
          caption:
            "Premier jet à l'encre grasse sur papier de riz, encre trop chargée dans le bas de " +
            "la deuxième colonne ; les liaisons manquent de tension et le dernier caractère " +
            "déborde du cadre. Repris le lendemain sur un papier plus absorbant.",
        }),
      ],
    }),
  ]),

  "aucune légende": carousel([
    variation({
      id: "v1a",
      script: "xingshu",
      status: "tried",
      images: [study, image({ ...detail, caption: undefined })],
    }),
  ]),

  "aucune image": carousel([withoutImage]),
};
