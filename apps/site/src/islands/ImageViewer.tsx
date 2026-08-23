import { useState } from "react";
import { IMAGE_KIND_LABELS, type LoadedImage } from "@bsls/schema";
import "./ImageViewer.css";

export type ImageViewerProps = {
  /** Images déjà validées par le content layer : la visionneuse ne lit rien elle-même. */
  images: LoadedImage[];
  /** Titre de la pièce, utilisé pour décrire les images à qui ne les voit pas. */
  title: string;
};

/**
 * Montre l'œuvre en grand, et laisse passer d'une prise de vue à l'autre.
 * Aucun accès réseau ni disque : tout arrive par les props.
 */
export function ImageViewer({ images, title }: ImageViewerProps) {
  const [shownIndex, setShownIndex] = useState(0);
  const shown = images[Math.min(shownIndex, images.length - 1)];

  if (!shown) return null;

  return (
    <figure className="viewer">
      <div className="viewer__stage">
        <img className="viewer__image" src={shown.src} alt={describe(shown, title)} />
      </div>

      {shown.caption ? <figcaption className="viewer__caption">{shown.caption}</figcaption> : null}

      {images.length > 1 ? (
        <ul className="viewer__thumbnails">
          {images.map((image, index) => (
            <li key={image.file}>
              <button
                type="button"
                className="viewer__thumbnail"
                aria-current={index === shownIndex ? "true" : undefined}
                aria-label={describe(image, title)}
                onClick={() => setShownIndex(index)}
              >
                <img src={image.src} alt="" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}

function describe(image: LoadedImage, title: string): string {
  return image.caption ?? `${title} — ${IMAGE_KIND_LABELS[image.kind]}`;
}

export default ImageViewer;
