import { createRef } from "react";
import { placeholder } from "./fixture-placeholder.js";
import { ZoomableImage } from "./ZoomableImage.js";

/**
 * L'image seule, hors du carrousel : la loupe au survol de la souris, le
 * pincement et le double tap en émulation tactile.
 */
function zoomable(width: number, height: number, label: string, maxWidth: string) {
  return (
    <ZoomableImage
      imageRef={createRef<HTMLImageElement>()}
      src={placeholder(width, height, label)}
      alt={`Image de fixture ${label}`}
      style={{ maxWidth, width: "100%", height: "auto" }}
    />
  );
}

export default {
  "portrait A4": zoomable(210, 297, "山", "20rem"),
  "détail très allongé": zoomable(120, 900, "居", "6rem"),
};
