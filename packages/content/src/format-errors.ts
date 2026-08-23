import type { ContentError } from "./load-content.js";

/** Rend les erreurs de contenu lisibles en terminal : un fichier, ses champs fautifs. */
export function formatContentErrors(errors: ContentError[]): string {
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
  const summary = `${count} erreur${count > 1 ? "s" : ""} de contenu`;
  return [...blocks, summary].join("\n\n");
}
