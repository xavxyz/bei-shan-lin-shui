import { isMap, isScalar, isSeq, parseDocument, YAMLMap, YAMLSeq } from "yaml";

export type Conversion = { text: string; converted: number };

/**
 * Convertit un plan de l'ancienne forme — une `version:` par pièce, ses
 * `variations:` à plat à côté — vers `versions: [...]`, chaque version portant
 * ses variations, comme le frontmatter.
 *
 * Conversion mécanique sur l'arbre YAML et non sur les données : les nœuds sont
 * déplacés avec leurs commentaires, rien de ce que le calligraphe a écrit ne se
 * perd. Une pièce déjà convertie n'est pas touchée : on peut la rejouer sur un
 * plan arbitré à moitié de chaque forme.
 */
export function convertPlanToVersions(text: string): Conversion {
  const document = parseDocument(text);
  if (document.errors.length > 0) {
    throw new Error(
      `plan illisible : ${document.errors.map((error) => error.message).join(" ; ")}`,
    );
  }

  const pieces = document.get("pieces", true);
  let converted = 0;

  if (isSeq(pieces)) {
    for (const piece of pieces.items) {
      if (isMap(piece) && convertPiece(piece)) converted += 1;
    }
  }

  if (converted === 0) return { text, converted };
  return { text: document.toString({ lineWidth: 0, blockQuote: "literal" }), converted };
}

function convertPiece(piece: YAMLMap): boolean {
  if (piece.has("versions")) return false;

  const versionPair = piece.items.find(
    (pair) => isScalar(pair.key) && pair.key.value === "version",
  );
  if (!versionPair || !isMap(versionPair.value)) return false;
  const version = versionPair.value;

  /* Les variations rejoignent leur version, à la fin, avec leurs commentaires. */
  const variationsIndex = piece.items.findIndex(
    (pair) => isScalar(pair.key) && pair.key.value === "variations",
  );
  if (variationsIndex >= 0) {
    const [variations] = piece.items.splice(variationsIndex, 1);
    version.items.push(variations!);
  }

  const versions = new YAMLSeq();
  versions.items.push(version);
  /* La clé garde sa place et ses commentaires ; seul son nom change. */
  if (isScalar(versionPair.key)) versionPair.key.value = "versions";
  versionPair.value = versions;

  return true;
}
