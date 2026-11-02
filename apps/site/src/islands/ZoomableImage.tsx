import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";
import "./ZoomableImage.css";

export type ZoomableImageProps = {
  src: string;
  alt: string;
  /** L'image elle-même, que son hôte observe (le pilote clavier du carrousel). */
  imageRef: RefObject<HTMLImageElement>;
  /** Classe de l'image, qui en fixe la taille dans son hôte. */
  className?: string;
  "data-testid"?: string;
  style?: CSSProperties;
};

/** Diamètre de la loupe, en pixels. */
const LOUPE_SIZE = 224;
/** Grossissement de la loupe. */
const LOUPE_POWER = 3;
/** Zoom d'un double tap. */
const DOUBLE_TAP_SCALE = 2.5;
/** Deux taps plus rapprochés que cela, en millisecondes et en pixels, font un double tap. */
const DOUBLE_TAP_DELAY = 300;
const DOUBLE_TAP_DISTANCE = 24;
/** Un doigt qui bouge moins que cela, en pixels, tape encore. */
const TAP_SLOP = 6;
/** En deçà, un pincement relâché revient à l'image entière. */
const SNAP_BACK = 1.05;

type View = { scale: number; x: number; y: number };
const WHOLE: View = { scale: 1, x: 0, y: 0 };
type Point = { x: number; y: number };
/** Deux doigts posés : leur écart et leur milieu. */
type Span = { distance: number; middle: Point };
/** Un pincement en cours : l'écart de départ, et la vue qu'il transforme. */
type Pinch = Span & { from: View };
/** Un tap : quand et où il a eu lieu. */
type Tap = { at: number; point: Point };

function isZoomed(view: View): boolean {
  return view.scale > 1;
}

/** Un point de l'écran, dans le repère de `element`. */
function pointIn(element: Element, at: { clientX: number; clientY: number }): Point {
  const box = element.getBoundingClientRect();
  return { x: at.clientX - box.left, y: at.clientY - box.top };
}

function spanOf(a: Point, b: Point): Span {
  return {
    distance: Math.hypot(a.x - b.x, a.y - b.y),
    middle: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
  };
}

/**
 * L'image affichée du carrousel, à regarder de près. À la souris, une loupe
 * ronde suit le pointeur au survol. Au doigt, le pincement zoome l'image dans
 * son cadre autour du point pincé ; zoomée, elle se parcourt d'un doigt et
 * retient le `pointerup` (le carrousel n'y voit pas de glissement), et un
 * double tap zoome ou revient à l'image entière. Une autre image repart
 * entière. La molette et le défilement restent à la page.
 */
export function ZoomableImage({
  src,
  alt,
  imageRef,
  className,
  "data-testid": testId,
  style,
}: ZoomableImageProps) {
  const [loupe, setLoupe] = useState<Point | null>(null);
  const [view, setView] = useState<View>(WHOLE);
  const viewRef = useRef(view);
  viewRef.current = view;
  const frame = useRef<HTMLSpanElement>(null);
  /** Un pincement a eu lieu depuis le premier doigt posé : ce geste n'est pas un glissement. */
  const pinched = useRef(false);

  // Une autre image repart entière, dès son premier rendu.
  const [viewedSrc, setViewedSrc] = useState(src);
  if (viewedSrc !== src) {
    setViewedSrc(src);
    setView(WHOLE);
    setLoupe(null);
  }

  useEffect(() => {
    const element = frame.current;
    if (!element) return;

    let pinch: Pinch | null = null;
    let pan: Point | null = null;
    let tap: Tap | null = null;
    /** Où le doigt s'est posé, tant qu'il peut encore taper. */
    let tapStart: Point | null = null;

    const local = (touch: Touch) => pointIn(element, touch);

    /** Entre l'image entière et la taille réelle du scan, au moins ×2. */
    function clampScale(scale: number): number {
      const image = imageRef.current;
      if (!image) return 1;
      return Math.min(Math.max(scale, 1), Math.max(2, image.naturalWidth / image.offsetWidth));
    }

    /** L'image couvre toujours son cadre : ni plus petite, ni décollée d'un bord. */
    function coveringFrame(next: View): View {
      const image = imageRef.current;
      if (!image) return WHOLE;
      const width = image.offsetWidth;
      const height = image.offsetHeight;
      const scale = clampScale(next.scale);
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
      const target = clampScale(scale);
      return coveringFrame({ scale: target, x: point.x - x * target, y: point.y - y * target });
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length === 1) {
        pinched.current = false;
        tapStart = local(event.touches[0]!);
        pan = isZoomed(viewRef.current) ? tapStart : null;
      } else if (event.touches.length === 2) {
        pinched.current = true;
        tapStart = null;
        pan = null;
        pinch = {
          ...spanOf(local(event.touches[0]!), local(event.touches[1]!)),
          from: viewRef.current,
        };
      }
    }

    function onTouchMove(event: TouchEvent) {
      const point = local(event.touches[0]!);
      if (tapStart && Math.hypot(point.x - tapStart.x, point.y - tapStart.y) > TAP_SLOP)
        tapStart = null;

      // La page défile déjà sous le premier doigt : le pincement la laisse faire.
      if (!event.cancelable) return;

      if (event.touches.length === 2 && pinch) {
        event.preventDefault();
        const { distance, middle } = spanOf(point, local(event.touches[1]!));
        const scale = (pinch.from.scale * distance) / pinch.distance;
        setView(zoomedAround(pinch.from, pinch.middle, middle, scale));
      } else if (event.touches.length === 1 && pan && isZoomed(viewRef.current)) {
        event.preventDefault();
        const { scale, x, y } = viewRef.current;
        setView(coveringFrame({ scale, x: x + point.x - pan.x, y: y + point.y - pan.y }));
        pan = point;
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (event.touches.length < 2) pinch = null;
      // Un doigt reste après le pincement : il parcourt l'image.
      if (event.touches.length === 1 && isZoomed(viewRef.current)) pan = local(event.touches[0]!);
      if (event.touches.length > 0) return;

      pan = null;
      if (viewRef.current.scale < SNAP_BACK) setView(WHOLE);
      const tapped = tapStart && !pinched.current && event.changedTouches.length === 1;
      tapStart = null;
      if (!tapped) {
        tap = null;
        return;
      }

      const point = local(event.changedTouches[0]!);
      const now = event.timeStamp;
      const isDoubleTap =
        tap &&
        now - tap.at < DOUBLE_TAP_DELAY &&
        Math.hypot(point.x - tap.point.x, point.y - tap.point.y) < DOUBLE_TAP_DISTANCE;
      if (!isDoubleTap) {
        tap = { at: now, point };
        return;
      }
      tap = null;
      event.preventDefault();
      setView(
        isZoomed(viewRef.current)
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

  // La loupe suit la souris sur l'image même : elle s'en va dès que le pointeur en sort.
  function onPointerMove(event: PointerEvent<HTMLImageElement>) {
    if (event.pointerType !== "mouse" || isZoomed(viewRef.current)) return;
    setLoupe(pointIn(event.currentTarget, event));
  }

  // Zoomée ou pincée, l'image retient le doigt : le carrousel n'y voit pas de glissement.
  function onPointerUp(event: PointerEvent) {
    if (event.pointerType === "touch" && (pinched.current || isZoomed(viewRef.current)))
      event.stopPropagation();
  }

  const image = imageRef.current;
  const zoomed = isZoomed(view);

  return (
    <span className="zoomable" onPointerUp={onPointerUp}>
      <span className="zoomable__frame" ref={frame} data-zoomed={zoomed ? "true" : undefined}>
        <img
          className={className}
          data-testid={testId}
          data-loupe={loupe ? "true" : undefined}
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setLoupe(null)}
          style={{
            ...style,
            transform: zoomed
              ? `translate(${view.x}px, ${view.y}px) scale(${view.scale})`
              : undefined,
          }}
        />
      </span>

      {loupe && image ? (
        <span
          className="zoomable__loupe"
          data-testid="loupe"
          aria-hidden="true"
          style={{
            width: LOUPE_SIZE,
            height: LOUPE_SIZE,
            left: image.offsetLeft + loupe.x - LOUPE_SIZE / 2,
            top: image.offsetTop + loupe.y - LOUPE_SIZE / 2,
            backgroundImage: `url("${src}")`,
            backgroundSize: `${image.offsetWidth * LOUPE_POWER}px ${image.offsetHeight * LOUPE_POWER}px`,
            backgroundPosition: `${LOUPE_SIZE / 2 - loupe.x * LOUPE_POWER}px ${LOUPE_SIZE / 2 - loupe.y * LOUPE_POWER}px`,
          }}
        />
      ) : null}
    </span>
  );
}
