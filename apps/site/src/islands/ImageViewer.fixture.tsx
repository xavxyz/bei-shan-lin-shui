import { loadedImageSchema, type LoadedImage } from "@bsls/schema";
import { ImageViewer } from "./ImageViewer.js";

/**
 * Les fixtures sont validées par le schéma partagé : une évolution du schéma
 * les casse ici, avant de casser le site.
 */
function image(attributes: Partial<LoadedImage> & { file: string; src: string }): LoadedImage {
  return loadedImageSchema.parse({ kind: "work", capture: "scan", ...attributes });
}

/** Rectangle uni aux proportions demandées : la visionneuse n'a besoin de rien de plus. */
function placeholder(width: number, height: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="#f4f1ea"/>
    <text x="50%" y="50%" font-family="serif" font-size="${Math.round(width / 8)}"
      fill="#2b2b2b" text-anchor="middle" dominant-baseline="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const a4 = image({ file: "v1a-01.jpg", src: placeholder(210, 297, "山"), featured: true });
const detail = image({
  file: "v1a-02.jpg",
  src: placeholder(120, 900, "居"),
  kind: "detail",
  caption: "Détail de la troisième colonne.",
});
const attempt = image({ file: "v1a-03.jpg", src: placeholder(210, 297, "秋"), kind: "attempt" });

const title = "山居秋暝";

export default {
  "une seule image": <ImageViewer title={title} images={[a4]} />,

  "plusieurs images": <ImageViewer title={title} images={[a4, detail, attempt]} />,

  "portrait A4": <ImageViewer title={title} images={[a4]} />,

  "détail très allongé": <ImageViewer title={title} images={[detail]} />,

  "légende longue": (
    <ImageViewer
      title={title}
      images={[
        image({
          ...a4,
          caption:
            "Premier jet à l'encre grasse sur papier de riz, encre trop chargée dans le bas de " +
            "la deuxième colonne ; les liaisons manquent de tension et le dernier caractère " +
            "déborde du cadre. Repris le lendemain sur un papier plus absorbant.",
        }),
      ]}
    />
  ),

  "absence de légende": <ImageViewer title={title} images={[detail, a4]} />,

  "aucune image": <ImageViewer title={title} images={[]} />,
};
