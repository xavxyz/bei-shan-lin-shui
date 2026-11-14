declare module "subset-font" {
  export default function subsetFont(
    font: Buffer | Uint8Array,
    text: string | undefined,
    options?: { targetFormat?: "sfnt" | "woff" | "woff2"; keepAllGlyphs?: boolean },
  ): Promise<Buffer>;
}
