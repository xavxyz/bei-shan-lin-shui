import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import {
  IMAGE_KIND_LABELS,
  IMAGE_KINDS,
  VARIATION_STATUS_LABELS,
  type LoadedImage,
  type LoadedVariation,
} from "@bsls/schema";
import { pilotWithKeyboard } from "./keyboard-pilot.js";
import "./Carousel.css";

export type CarouselProps = {
  /**
   * Variations d'une version, dans l'ordre du fichier, déjà validées par le
   * content layer : le carrousel ne lit rien lui-même.
   */
  variations: LoadedVariation[];
  /**
   * Identifiant de la variation qui ouvre le carrousel, choisie côté Astro par
   * la règle du content layer (`featuredVariation`) ; `null` si aucune n'a d'image.
   */
  leadingVariation: string | null;
  /** Titre de la pièce, utilisé pour décrire les images à qui ne les voit pas. */
  title: string;
};

type Slide = { image: LoadedImage; variation: LoadedVariation };

/** Glissement horizontal minimal, en pixels, pour changer d'image. */
const SWIPE_THRESHOLD = 40;

/**
 * Un carrousel par version : toutes les images de toutes ses variations, une
 * seule fois chacune, et sous lui la liste des variations qui sert à y
 * naviguer. Aucun accès réseau ni disque : les données arrivent par les props.
 * Une fois monté, il s'inscrit auprès du pilote clavier de la page
 * (`keyboard-pilot.ts`), qui lui transmet les flèches ← → quand il est le
 * premier carrousel visible.
 *
 * Sans JavaScript, il montre la première image et la liste ; flèches,
 * vignettes et points n'apparaissent qu'une fois l'îlot monté.
 */
export function Carousel({ variations, leadingVariation, title }: CarouselProps) {
  const slides = orderSlides(variations, leadingVariation);
  const [shownIndex, setShownIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const swipeStart = useRef<number | null>(null);
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => setMounted(true), []);

  const index = Math.min(shownIndex, Math.max(slides.length - 1, 0));
  const shown = slides[index];
  const navigable = mounted && slides.length > 1;

  const count = slides.length;
  /** D'une image à l'autre, en boucle ; à jour même appelé depuis le clavier. */
  const move = useCallback(
    (by: number) => setShownIndex((current) => (current + by + count) % count),
    [count],
  );

  // Les flèches ← → pilotent le premier carrousel visible, sans qu'il ait le focus.
  useEffect(() => {
    if (!navigable) return;
    return pilotWithKeyboard({
      element: () => image.current,
      previous: () => move(-1),
      next: () => move(1),
    });
  }, [navigable, move]);

  function onPointerDown(event: PointerEvent) {
    swipeStart.current = event.clientX;
  }

  function onPointerUp(event: PointerEvent) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!navigable || start === null) return;
    const delta = event.clientX - start;
    if (delta <= -SWIPE_THRESHOLD) move(1);
    else if (delta >= SWIPE_THRESHOLD) move(-1);
  }

  return (
    <div className="carousel" data-testid="carousel">
      {shown ? (
        <figure className="carousel__figure">
          <div className="carousel__frame">
            {navigable ? (
              <button
                type="button"
                className="carousel__arrow carousel__arrow--previous"
                aria-label="Image précédente"
                onClick={() => move(-1)}
              >
                ‹
              </button>
            ) : null}

            <div
              className="carousel__stage"
              data-testid="carousel-stage"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => (swipeStart.current = null)}
            >
              <img
                className="carousel__image"
                data-testid="carousel-image"
                ref={image}
                src={shown.image.src}
                alt={describe(shown.image, title)}
                draggable={false}
              />
            </div>

            {navigable ? (
              <button
                type="button"
                className="carousel__arrow carousel__arrow--next"
                aria-label="Image suivante"
                onClick={() => move(1)}
              >
                ›
              </button>
            ) : null}
          </div>

          <figcaption className="carousel__caption" data-testid="carousel-caption">
            <span className="carousel__tags">
              {[
                shown.variation.id,
                shown.variation.scriptLabel,
                VARIATION_STATUS_LABELS[shown.variation.status],
                IMAGE_KIND_LABELS[shown.image.kind],
              ].join(" · ")}
            </span>
            {shown.image.caption ? (
              <span className="carousel__legend">{shown.image.caption}</span>
            ) : null}
            <span className="carousel__position" data-testid="carousel-position" aria-live="polite">
              {index + 1} / {slides.length}
            </span>
          </figcaption>

          {navigable ? (
            <>
              <ul className="carousel__thumbnails" data-testid="carousel-thumbnails">
                {groupByVariation(slides).map(({ variation, first, count }) => (
                  <li key={variation.id} className="carousel__group">
                    <ul aria-label={`${variation.id} · ${variation.scriptLabel}`}>
                      {slides.slice(first, first + count).map((slide, offset) => (
                        <li key={slide.image.file}>
                          <button
                            type="button"
                            className="carousel__thumbnail"
                            aria-current={first + offset === index ? "true" : undefined}
                            aria-label={describe(slide.image, title)}
                            onClick={() => setShownIndex(first + offset)}
                          >
                            <img src={slide.image.src} alt="" draggable={false} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>

              <ol className="carousel__dots" data-testid="carousel-dots">
                {slides.map((slide, position) => (
                  <li key={slide.image.file}>
                    <button
                      type="button"
                      className="carousel__dot"
                      aria-current={position === index ? "true" : undefined}
                      aria-label={`Image ${position + 1} sur ${slides.length}`}
                      onClick={() => setShownIndex(position)}
                    />
                  </li>
                ))}
              </ol>
            </>
          ) : null}
        </figure>
      ) : null}

      <VariationList
        variations={variations}
        shownVariation={shown?.variation.id}
        onSelect={
          mounted
            ? (variation) =>
                setShownIndex(slides.findIndex((slide) => slide.variation.id === variation.id))
            : undefined
        }
        slides={slides}
      />
    </div>
  );
}

type VariationListProps = {
  variations: LoadedVariation[];
  slides: Slide[];
  shownVariation: string | undefined;
  /** Absent tant que l'îlot n'est pas monté : la liste n'est alors qu'une liste. */
  onSelect: ((variation: LoadedVariation) => void) | undefined;
};

/** Toutes les variations, quel que soit leur statut, avec ou sans image. */
function VariationList({ variations, slides, shownVariation, onSelect }: VariationListProps) {
  return (
    <ol className="variations__list" aria-label="Variations">
      {variations.map((variation) => {
        const tags = (
          <span className="variation__tags">
            <span className="tag" data-testid="variation-script">
              {variation.scriptLabel}
            </span>
            <span className="tag" data-testid="variation-status">
              {VARIATION_STATUS_LABELS[variation.status]}
            </span>
          </span>
        );
        const inCarousel = slides.some((slide) => slide.variation.id === variation.id);

        return (
          <li
            key={variation.id}
            id={variation.id}
            className="variation"
            data-testid="variation"
            aria-current={variation.id === shownVariation ? "true" : undefined}
          >
            {onSelect && inCarousel ? (
              <button
                type="button"
                className="variation__select"
                onClick={() => onSelect(variation)}
              >
                {tags}
              </button>
            ) : (
              tags
            )}

            {variation.personal_note ? (
              <p className="variation__note" data-testid="variation-note">
                {variation.personal_note.trim()}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * La variation qui porte l'image mise en avant d'abord, cette image en tête ;
 * puis les autres dans l'ordre du fichier. Dans une variation : œuvre entière,
 * détail, étude, contexte, puis l'ordre du fichier.
 */
function orderSlides(variations: LoadedVariation[], leadingVariation: string | null): Slide[] {
  const featured = variations.find((variation) => variation.id === leadingVariation);
  const ordered = featured
    ? [featured, ...variations.filter((variation) => variation !== featured)]
    : variations;

  return ordered.flatMap((variation) => {
    const lead = variation === featured ? variation.featuredImage : null;
    const rest = byKind(variation.images.filter((image) => image.file !== lead?.file));
    return [...(lead ? [lead] : []), ...rest].map((image) => ({ image, variation }));
  });
}

function byKind(images: LoadedImage[]): LoadedImage[] {
  return [...images].sort((a, b) => IMAGE_KINDS.indexOf(a.kind) - IMAGE_KINDS.indexOf(b.kind));
}

/** Les diapositives d'une même variation se suivent : on les regroupe pour les vignettes. */
function groupByVariation(slides: Slide[]) {
  const groups: { variation: LoadedVariation; first: number; count: number }[] = [];
  slides.forEach((slide, position) => {
    const last = groups.at(-1);
    if (last && last.variation.id === slide.variation.id) last.count += 1;
    else groups.push({ variation: slide.variation, first: position, count: 1 });
  });
  return groups;
}

function describe(image: LoadedImage, title: string): string {
  return image.caption ?? `${title} — ${IMAGE_KIND_LABELS[image.kind]}`;
}

export default Carousel;
