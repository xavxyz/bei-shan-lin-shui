import { loadContent } from "@bsls/content";
import { writeTree } from "@bsls/content/test-support";
import { PROJECT_FILE } from "./content-tree.js";

/**
 * Une pièce écrite à la main, avec ce qu'un humain y laisse : commentaires,
 * listes en ligne, blocs littéraux. Découpée en morceaux pour que les tests
 * vérifient que chacun survit à l'octet près.
 */
export const YONG_HEAD = `title: 永草書
slug: yong-cao-shu
status: on-hold
projects: [ge-zhi-yan-jiu]
versions:
`;

export const YONG_V1 = `  - id: v1
    date: 2026-06-21 # date du papier : 丙午夏至
    format: A4
    columns: [永，丙午夏至]
    intention: |
      Exploration sans modèle du caractère 永 en cursive.
    variations:
      - id: v1a
        script: caoshu
        status: kept
        images:
          - file: v1a.jpg
            kind: work # work | detail | study | context
            capture: photo # scan | photo
            featured: true
`;

export const YONG_TAIL = `translation: |
  Les 8 mouvements fondamentaux de l'éternité.
published: true
`;

export const YONG = `---\n${YONG_HEAD}${YONG_V1}${YONG_TAIL}---\n`;

export async function yongTree(piece = YONG): Promise<string> {
  return writeTree({
    "projects/ge-zhi-yan-jiu.yaml": PROJECT_FILE,
    "pieces/yong-cao-shu/piece.md": piece,
    "pieces/yong-cao-shu/images/v1a.jpg": "",
  });
}

export async function loadYong(root: string) {
  const loaded = await loadContent(root, { includeUnpublished: true });
  if (!loaded.ok) throw new Error(JSON.stringify(loaded.errors));
  return loaded.content.pieces.find((piece) => piece.slug === "yong-cao-shu");
}
