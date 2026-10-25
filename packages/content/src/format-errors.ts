import type { ContentError } from "./load-content.js";

/**
 * Rend les erreurs de contenu lisibles en terminal : un fichier, ses champs
 * fautifs. Les avertissements prennent la même forme, sous leur nom.
 */
export function formatContentErrors(
  errors: ContentError[],
  noun: "erreur" | "avertissement" = "erreur",
): string {
  const byFile = new Map<string, ContentError[]>();
  for (const error of errors) {
    byFile.set(error.file, [...(byFile.get(error.file) ?? []), error]);
  }

  const blocks = [...byFile.entries()].map(([file, fileErrors]) => {
    const lines = fileErrors.map(
      (error) => `  ${error.path === "" ? "(fichier)" : error.path} — ${error.message}`,
    );
    return [file, ...lines].join("\n");
  });

  const count = errors.length;
  const summary = `${count} ${noun}${count > 1 ? "s" : ""} de contenu`;
  return [...blocks, summary].join("\n\n");
}
