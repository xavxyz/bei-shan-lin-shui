import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import sharp from "sharp";

/** A4 à 300 dpi : la taille de numérisation du calligraphe, et le plafond du dépôt. */
export const MAX_WIDTH = 2480;
export const MAX_HEIGHT = 3508;
export const QUALITY = 92;

/**
 * Range un scan auprès de sa pièce, en JPEG qualité 92 : un fichier par prise
 * de vue, le site se chargeant des vignettes. Une image déjà plus petite n'est
 * jamais agrandie.
 */
export async function normalizeImage(source: string, target: string): Promise<void> {
  await mkdir(dirname(target), { recursive: true });
  await sharp(source)
    .rotate()
    .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: QUALITY })
    .toFile(target);
}
