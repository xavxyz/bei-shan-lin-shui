import type { LoadedImage, LoadedVariation, LoadedVersion } from "@bsls/schema";

/**
 * La règle de mise en avant, seule et pure : ni disque ni Node. Le content
 * layer s'en sert au chargement, le site et ses îlots l'importent par
 * `@bsls/content/featured` sans tirer le système de fichiers dans le navigateur.
 */

/**
 * Une variation montre en premier l'image explicitement mise en avant ; à
 * défaut la première œuvre entière, à défaut sa première image.
 */
export function pickFeaturedImage(images: LoadedImage[]): LoadedImage | null {
  return (
    images.find((image) => image.featured) ??
    images.find((image) => image.kind === "work") ??
    images[0] ??
    null
  );
}

/**
 * Une version se montre par ses variations retenues avant les autres, chacune
 * dans l'ordre du fichier : la première qui a une image mène.
 */
export function featuredVariation(variations: LoadedVariation[]): LoadedVariation | undefined {
  const kept = variations.filter((variation) => variation.status === "kept");
  const rest = variations.filter((variation) => variation.status !== "kept");
  return [...kept, ...rest].find((variation) => variation.featuredImage);
}

/** Une pièce se montre par son travail le plus récent : dernière version d'abord. */
export function pickFeaturedVariation(versions: LoadedVersion[]): LoadedVariation | null {
  for (const version of [...versions].reverse()) {
    const leading = featuredVariation(version.variations);
    if (leading) return leading;
  }
  return null;
}
