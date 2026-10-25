import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pieceFile } from "@bsls/content";

export async function readPieceFile(root: string, slug: string): Promise<string> {
  return readFile(join(root, pieceFile(slug)), "utf8");
}

export const PROJECT_FILE = `title: 戈之研究
gloss: Explorations personnelles
`;
