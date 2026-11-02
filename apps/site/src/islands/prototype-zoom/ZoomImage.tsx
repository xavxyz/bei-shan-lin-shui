/*
 * PROTOTYPE — à jeter. L'image du carrousel, zoomable selon la variante :
 * A plein écran (molette, pincement, glisser, double-clic), B loupe au survol,
 * C zoom en place au clic. En production : l'image seule.
 */
import {
  forwardRef,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { reportState, useZoomVariant } from "./variant.js";

type Props = {
  src: string;
  alt: string;
  className: string;
  style?: CSSProperties;
  "data-testid"?: string;
};

export const ZoomImage = forwardRef<HTMLImageElement, Props>(function Zoomable(props, ref) {
  const variant = useZoomVariant();
  if (variant === "A") return <LightboxZoom {...props} imageRef={ref} />;
  if (variant === "B") return <LoupeZoom {...props} imageRef={ref} />;
  if (variant === "C") return <InPlaceZoom {...props} imageRef={ref} />;
  return <img {...props} ref={ref} draggable={false} />;
});

type VariantProps = Props & { imageRef: React.ForwardedRef<HTMLImageElement> };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/* ───────────── A — Plein écran ───────────── */

function LightboxZoom({ imageRef, ...props }: VariantProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        {...props}
        ref={imageRef}
        draggable={false}
        className={`${props.className} pz-zoomable`}
        onClick={() => setOpen(true)}
        title="Agrandir"
      />
      {open
        ? createPortal(
            <Lightbox src={props.src} alt={props.alt} onClose={() => setOpen(false)} />,
            document.body,
          )
        : null}
    </>
  );
}

type View = { scale: number; x: number; y: number };
const FIT: View = { scale: 1, x: 0, y: 0 };

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [view, setView] = useState<View>(FIT);
  const overlay = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<number | null>(null);
  const moved = useRef(false);

  useEffect(() => setView(FIT), [src]);
  useEffect(() => {
    reportState({
      ouvert: true,
      zoom: `${Math.round(view.scale * 100)} %`,
      décalage: `${Math.round(view.x)}, ${Math.round(view.y)}`,
    });
  }, [view]);
  useEffect(() => () => reportState({ ouvert: false }), []);

  /** Zoome autour d'un point de l'écran, qui reste sous le pointeur. */
  function zoomAt(scale: number, clientX: number, clientY: number) {
    setView((current) => {
      const next = clamp(scale, 1, 12);
      if (next === 1) return FIT;
      const box = overlay.current!.getBoundingClientRect();
      const px = clientX - (box.left + box.width / 2);
      const py = clientY - (box.top + box.height / 2);
      const ratio = next / current.scale;
      return { scale: next, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  }

  useEffect(() => {
    const element = overlay.current!;
    function onWheel(event: WheelEvent) {
      event.preventDefault();

      zoomAt(
        viewRef.current.scale * Math.exp(-event.deltaY * 0.0025),
        event.clientX,
        event.clientY,
      );
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "+" || event.key === "=") zoomCenter(1.5);
      if (event.key === "-") zoomCenter(1 / 1.5);
      if (event.key === "0") setView(FIT);
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, []);

  const viewRef = useRef(view);
  viewRef.current = view;

  function zoomCenter(by: number) {
    const box = overlay.current!.getBoundingClientRect();
    zoomAt(viewRef.current.scale * by, box.left + box.width / 2, box.top + box.height / 2);
  }

  /** Échelle où un pixel de l'image vaut un pixel de l'écran. */
  function actualSize() {
    const img = image.current!;
    return (img.naturalWidth / img.getBoundingClientRect().width) * viewRef.current.scale;
  }

  function onPointerDown(event: ReactPointerEvent) {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    moved.current = false;
    if (pointers.current.size === 2) pinch.current = spread();
  }

  function spread() {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a!.x - b!.x, a!.y - b!.y);
  }

  function onPointerMove(event: ReactPointerEvent) {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const dx = event.clientX - last.x;
    const dy = event.clientY - last.y;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;

    if (pointers.current.size === 2 && pinch.current) {
      const now = spread();
      const [a, b] = [...pointers.current.values()];
      zoomAt(viewRef.current.scale * (now / pinch.current), (a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
      pinch.current = now;
    } else if (pointers.current.size === 1 && viewRef.current.scale > 1) {
      setView((current) => ({ ...current, x: current.x + dx, y: current.y + dy }));
    }
  }

  function onPointerUp(event: ReactPointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  return (
    <div className="pz-lightbox" role="dialog" aria-modal="true" aria-label={alt}>
      <div
        ref={overlay}
        className="pz-lightbox__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(event) => {
          // Un clic sur le fond, sans glisser et sans zoom, referme.
          if (!moved.current && event.target === event.currentTarget && view.scale === 1) onClose();
        }}
        onDoubleClick={(event) => {
          if (viewRef.current.scale > 1) setView(FIT);
          else zoomAt(Math.max(actualSize(), 2.5), event.clientX, event.clientY);
        }}
        style={{ cursor: view.scale > 1 ? "grab" : "zoom-in" }}
      >
        <img
          ref={image}
          src={src}
          alt={alt}
          draggable={false}
          className="pz-lightbox__image"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>
      <div className="pz-lightbox__tools">
        <button type="button" onClick={() => zoomCenter(1 / 1.5)} aria-label="Dézoomer">
          −
        </button>
        <span className="pz-lightbox__scale">{Math.round(view.scale * 100)} %</span>
        <button type="button" onClick={() => zoomCenter(1.5)} aria-label="Zoomer">
          +
        </button>
        <button type="button" onClick={() => setView(FIT)}>
          Ajuster
        </button>
        <button
          type="button"
          onClick={() => {
            const box = overlay.current!.getBoundingClientRect();
            zoomAt(actualSize(), box.left + box.width / 2, box.top + box.height / 2);
          }}
        >
          Taille réelle
        </button>
      </div>
      <button type="button" className="pz-lightbox__close" onClick={onClose} aria-label="Fermer">
        ×
      </button>
    </div>
  );
}

/* ───────────── B — Loupe ───────────── */

const LENS = 224; // diamètre en px

function LoupeZoom({ imageRef, ...props }: VariantProps) {
  const [lens, setLens] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
    touch: boolean;
  } | null>(null);
  const [power, setPower] = useState(3);
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    reportState(
      lens
        ? {
            loupe: "visible",
            grossissement: `${power}×`,
            point: `${Math.round(lens.x)}, ${Math.round(lens.y)}`,
          }
        : { loupe: "cachée", grossissement: `${power}×` },
    );
  }, [lens, power]);

  useEffect(() => {
    const element = wrapper.current!;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      setPower((current) =>
        clamp(Math.round((current - Math.sign(event.deltaY) * 0.5) * 2) / 2, 1.5, 8),
      );
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function place(event: ReactPointerEvent, touch: boolean) {
    const box = wrapper.current!.querySelector("img")!.getBoundingClientRect();
    setLens({
      x: clamp(event.clientX - box.left, 0, box.width),
      y: clamp(event.clientY - box.top, 0, box.height),
      w: box.width,
      h: box.height,
      touch,
    });
  }

  const lensStyle: CSSProperties | undefined = lens
    ? {
        width: LENS,
        height: LENS,
        left: lens.x - LENS / 2,
        // Au doigt, la loupe passe au-dessus pour qu'il ne la cache pas.
        top: lens.y - LENS / 2 - (lens.touch ? LENS * 0.75 : 0),
        backgroundImage: `url("${props.src}")`,
        backgroundSize: `${lens.w * power}px ${lens.h * power}px`,
        backgroundPosition: `${-(lens.x * power - LENS / 2)}px ${-(lens.y * power - LENS / 2)}px`,
      }
    : undefined;

  return (
    <span
      ref={wrapper}
      className="pz-loupe"
      onPointerMove={(event) => {
        if (event.pointerType === "mouse" || lens?.touch)
          place(event, event.pointerType !== "mouse");
      }}
      onPointerLeave={() => setLens(null)}
      onPointerDown={(event) => {
        if (event.pointerType === "mouse") return;
        // Au doigt : la loupe tant que l'appui dure, sans tourner la page.
        event.stopPropagation();
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        place(event, true);
      }}
      onPointerUp={(event) => {
        if (event.pointerType === "mouse") return;
        event.stopPropagation();
        setLens(null);
      }}
    >
      <img {...props} ref={imageRef} draggable={false} />
      {lens ? <span className="pz-loupe__lens" style={lensStyle} aria-hidden="true" /> : null}
      <span className="pz-loupe__hint">loupe {power}× · molette pour régler</span>
    </span>
  );
}

/* ───────────── C — Zoom en place ───────────── */

function InPlaceZoom({ imageRef, ...props }: VariantProps) {
  const [zoom, setZoom] = useState<{ ox: number; oy: number } | null>(null);
  const [power, setPower] = useState(2.5);
  const frame = useRef<HTMLSpanElement>(null);
  const down = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => setZoom(null), [props.src]);
  useEffect(() => {
    reportState(
      zoom
        ? { zoom: `${power}×`, origine: `${Math.round(zoom.ox)} %, ${Math.round(zoom.oy)} %` }
        : { zoom: "aucun" },
    );
  }, [zoom, power]);

  useEffect(() => {
    const element = frame.current!;
    function onWheel(event: WheelEvent) {
      if (!zoomRef.current) return;
      event.preventDefault();
      setPower((current) =>
        clamp(Math.round((current - Math.sign(event.deltaY) * 0.5) * 2) / 2, 1.5, 8),
      );
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  function origin(event: ReactPointerEvent | React.MouseEvent) {
    const box = frame.current!.getBoundingClientRect();
    return {
      ox: clamp(((event.clientX - box.left) / box.width) * 100, 0, 100),
      oy: clamp(((event.clientY - box.top) / box.height) * 100, 0, 100),
    };
  }

  return (
    <span
      ref={frame}
      className="pz-inplace"
      data-zoomed={zoom ? "true" : undefined}
      onPointerDown={(event) => {
        down.current = { x: event.clientX, y: event.clientY };
        // Zoomée, l'image se parcourt au doigt : pas de changement d'image.
        if (zoom) {
          event.stopPropagation();
          (event.currentTarget as Element).setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={(event) => {
        if (!zoom) return;
        if (event.pointerType !== "mouse" && !down.current) return;
        setZoom(origin(event));
      }}
      onPointerUp={(event) => {
        if (zoom) event.stopPropagation();
      }}
      onClick={(event) => {
        const start = down.current;
        down.current = null;
        // Un glissement (changement d'image) n'est pas un clic.
        if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6 && !zoom)
          return;
        if (
          zoom &&
          (event.nativeEvent as PointerEvent).pointerType !== "mouse" &&
          start &&
          Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6
        )
          return;
        setZoom(zoom ? null : origin(event));
      }}
    >
      <img
        {...props}
        ref={imageRef}
        draggable={false}
        style={{
          ...props.style,
          transformOrigin: zoom ? `${zoom.ox}% ${zoom.oy}%` : undefined,
          transform: zoom ? `scale(${power})` : undefined,
        }}
      />
    </span>
  );
}
