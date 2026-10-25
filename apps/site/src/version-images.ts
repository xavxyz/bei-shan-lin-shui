import type { LoadedVersion } from "@bsls/schema";

/** Une version a une œuvre à montrer dès qu'une de ses variations a une image. */
export function hasImage(version: LoadedVersion): boolean {
  return version.variations.some((variation) => variation.images.length > 0);
}
