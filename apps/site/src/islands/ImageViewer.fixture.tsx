import {
  loadedImageSchema,
  loadedVariationSchema,
  SCRIPT_LABELS,
  type LoadedImage,
  type LoadedVariation,
} from "@bsls/schema";
import { ImageViewer } from "./ImageViewer.js";

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
    featuredImage: images.find((candidate) => candidate.featured) ?? images[0] ?? null,
    ...attributes,
    images,
  });
}

/** Rectangle uni aux proportions demandées : le carrousel n'a besoin de rien de plus. */
function placeholder(width: number, height: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f1ea"/>
    <text x="50%" y="50%" font-family="serif" font-size="${Math.round(width / 8)}"
      fill="#2b2b2b" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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

export default {
  "une image": (
    <ImageViewer
      title={title}
      variations={[variation({ id: "v1a", script: "xingshu", status: "kept", images: [a4] })]}
    />
  ),

  "plusieurs variations": <ImageViewer title={title} variations={[kept, setAside]} />,

  "une variation sans image": (
    <ImageViewer title={title} variations={[kept, withoutImage, setAside]} />
  ),

  "portrait A4": (
    <ImageViewer
      title={title}
      variations={[variation({ id: "v1a", script: "kaishu", status: "tried", images: [a4] })]}
    />
  ),

  "détail très allongé": (
    <ImageViewer
      title={title}
      variations={[variation({ id: "v1a", script: "caoshu", status: "tried", images: [detail] })]}
    />
  ),

  "légende longue": (
    <ImageViewer
      title={title}
      variations={[
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
      ]}
    />
  ),

  "aucune légende": (
    <ImageViewer
      title={title}
      variations={[
        variation({
          id: "v1a",
          script: "xingshu",
          status: "tried",
          images: [study, image({ ...detail, caption: undefined })],
        }),
      ]}
    />
  ),

  "aucune image": <ImageViewer title={title} variations={[withoutImage]} />,
};
