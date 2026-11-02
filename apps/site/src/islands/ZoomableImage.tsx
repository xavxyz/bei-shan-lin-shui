import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";

export type ZoomableImageProps = {
  src: string;
  alt: string;
  /** L'image elle-même, que le pilote clavier du carrousel observe. */
  imageRef: RefObject<HTMLImageElement>;
  style?: CSSProperties;
};

/** Diamètre de la loupe, en pixels. */
const LOUPE_SIZE = 224;
/** Grossissement de la loupe. */
const LOUPE_POWER = 3;
/** Zoom d'un double tap ; le pincement va jusqu'à la taille réelle du scan, au moins ×2. */
const DOUBLE_TAP_SCALE = 2.5;
/** Deux taps plus rapprochés que cela, dans le temps et l'espace, font un double tap. */
const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 24;
/** En deçà, un pincement relâché revient à l'image entière. */
const SNAP_BACK = 1.05;

type View = { scale: number; x: number; y: number };
const WHOLE: View = { scale: 1, x: 0, y: 0 };
type Point = { x: number; y: number };

/**
 * L'image affichée du carrousel, à regarder de près. À la souris, une loupe
 * ronde suit le pointeur au survol. Au doigt, le pincement zoome l'image dans
 * son cadre autour du point pincé ; zoomée, elle se parcourt d'un doigt sans
 * changer d'image, et un double tap zoome ou revient à l'image entière. Une
 * autre image repart entière. La molette et le défilement restent à la page.
 */
export function ZoomableImage({ src, alt, imageRef, style }: ZoomableImageProps) {
  const [loupe, setLoupe] = useState<Point | null>(null);
  const [view, setView] = useState<View>(WHOLE);
  const viewRef = useRef(view);
  viewRef.current = view;
  const frame = useRef<HTMLSpanElement>(null);
  /** Un pincement a eu lieu depuis le premier doigt posé : ce geste n'est pas un glissement. */
  const pinched = useRef(false);

  useEffect(() => {
    setView(WHOLE);
    setLoupe(null);
  }, [src]);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;

    let pinch: { distance: number; middle: Point; from: View } | null = null;
    let pan: Point | null = null;
    let tap: { at: number; point: Point } | null = null;
    let moved = false;

    /** Un point de l'écran, dans le repère du cadre. */
    function local(touch: Touch): Point {
      const box = element!.getBoundingClientRect();
      return { x: touch.clientX - box.left, y: touch.clientY - box.top };
    }

    /** De l'image entière à la taille réelle du scan, au moins ×2. */
    function boundedScale(scale: number): number {
      const img = imageRef.current;
      if (!img) return 1;
      return Math.min(Math.max(scale, 1), Math.max(2, img.naturalWidth / img.offsetWidth));
    }

    /** L'image couvre toujours son cadre : ni plus petite, ni décollée d'un bord. */
    function bounded(next: View): View {
      const img = imageRef.current;
      if (!img) return WHOLE;
      const width = img.offsetWidth;
      const height = img.offsetHeight;
      const scale = boundedScale(next.scale);
      return {
        scale,
        x: Math.min(0, Math.max(width - width * scale, next.x)),
        y: Math.min(0, Math.max(height - height * scale, next.y)),
      };
    }

    /** Zoome à `scale` en gardant sous `point` ce qui était sous `anchor` dans `from`. */
    function zoomedAround(from: View, anchor: Point, point: Point, scale: number): View {
      const x = (anchor.x - from.x) / from.scale;
      const y = (anchor.y - from.y) / from.scale;
      const to = boundedScale(scale);
      return bounded({ scale: to, x: point.x - x * to, y: point.y - y * to });
    }

    function onTouchStart(event: TouchEvent) {
      moved = false;
      if (event.touches.length === 1) {
        pinched.current = false;
        pan = viewRef.current.scale > 1 ? local(event.touches[0]!) : null;
      } else if (event.touches.length === 2) {
        const [a, b] = [local(event.touches[0]!), local(event.touches[1]!)];
        pinched.current = true;
        pan = null;
        pinch = {
          distance: Math.hypot(a.x - b.x, a.y - b.y),
          middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
          from: viewRef.current,
        };
      }
    }

    function onTouchMove(event: TouchEvent) {
      moved = true;
      if (event.touches.length === 2 && pinch) {
        event.preventDefault();
        const [a, b] = [local(event.touches[0]!), local(event.touches[1]!)];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const scale = (pinch.from.scale * distance) / pinch.distance;
        setView(zoomedAround(pinch.from, pinch.middle, middle, scale));
      } else if (event.touches.length === 1 && pan && viewRef.current.scale > 1) {
        event.preventDefault();
        const point = local(event.touches[0]!);
        const { scale, x, y } = viewRef.current;
        setView(bounded({ scale, x: x + point.x - pan.x, y: y + point.y - pan.y }));
        pan = point;
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) pinch = null;
      // Un doigt reste après le pincement : il parcourt l'image.
      if (event.touches.length === 1 && viewRef.current.scale > 1) pan = local(event.touches[0]!);
      if (event.touches.length > 0) return;

      pan = null;
      if (viewRef.current.scale < SNAP_BACK) setView(WHOLE);
      if (pinched.current || moved || event.changedTouches.length !== 1) {
        tap = null;
        return;
      }

      const point = local(event.changedTouches[0]!);
      const now = event.timeStamp;
      const twice =
        tap &&
        now - tap.at < DOUBLE_TAP_DELAY &&
        Math.hypot(point.x - tap.point.x, point.y - tap.point.y) < DOUBLE_TAP_DISTANCE;
      if (!twice) {
        tap = { at: now, point };
        return;
      }
      tap = null;
      event.preventDefault();
      setView(
        viewRef.current.scale > 1
          ? WHOLE
          : zoomedAround(viewRef.current, point, point, DOUBLE_TAP_SCALE),
      );
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd, { passive: false });
    element.addEventListener("touchcancel", onTouchEnd, { passive: false });
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  function onPointerMove(event: PointerEvent) {
    if (event.pointerType !== "mouse" || viewRef.current.scale > 1) return;
    const box = event.currentTarget.getBoundingClientRect();
    setLoupe({ x: event.clientX - box.left, y: event.clientY - box.top });
  }

  // Zoomée ou pincée, l'image retient le doigt : le carrousel n'y voit pas de glissement.
  function onPointerUp(event: PointerEvent) {
    if (event.pointerType === "touch" && (pinched.current || viewRef.current.scale > 1))
      event.stopPropagation();
  }

  const img = imageRef.current;
  const isZoomed = view.scale > 1;

  return (
    <span
      className="zoomable"
      onPointerMove={onPointerMove}
      onPointerLeave={() => setLoupe(null)}
      onPointerUp={onPointerUp}
    >
      <span className="zoomable__frame" ref={frame} data-zoomed={isZoomed ? "true" : undefined}>
        <img
          className="carousel__image"
          data-testid="carousel-image"
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          style={{
            ...style,
            transform: isZoomed
              ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
              : undefined,
          }}
        />
      </span>

      {loupe && img ? (
        <span
          className="zoomable__loupe"
          data-testid="carousel-loupe"
          aria-hidden="true"
          style={{
            width: LOUPE_SIZE,
            height: LOUPE_SIZE,
            left: loupe.x - LOUPE_SIZE / 2,
            top: loupe.y - LOUPE_SIZE / 2,
            backgroundImage: `url("${src}")`,
            backgroundSize: `${img.offsetWidth * LOUPE_POWER}px ${img.offsetHeight * LOUPE_POWER}px`,
            backgroundPosition: `${LOUPE_SIZE / 2 - loupe.x * LOUPE_POWER}px ${LOUPE_SIZE / 2 - loupe.y * LOUPE_POWER}px`,
          }}
        />
      ) : null}
    </span>
  );
}
