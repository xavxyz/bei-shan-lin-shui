/**
 * Identifiants locaux : `v1`, `v2`… pour les versions, `v1a`, `v1b`… pour les
 * variations d'une version. Le suivant est toujours pris après le plus grand,
 * pour qu'aucun identifiant, même retiré à la main, ne serve deux fois.
 */

export function nextVersionId(existing: string[]): string {
  const numbers = existing.map((id) => Number(/^v(\d+)/.exec(id)?.[1] ?? 0));
  return `v${Math.max(0, ...numbers) + 1}`;
}

export function nextVariationIds(versionId: string, existing: string[], count: number): string[] {
  const ranks = existing
    .filter((id) => isVariationOf(id, versionId))
    .map((id) => rank(id.slice(versionId.length)));
  const last = Math.max(0, ...ranks);
  return Array.from({ length: count }, (_, index) => versionId + letters(last + index + 1));
}

/** Une variation se nomme d'après sa version : `v2a`, `v2b`… appartiennent à `v2`, pas `v20a`. */
export function isVariationOf(id: string, versionId: string): boolean {
  return id.startsWith(versionId) && /^[a-z]+$/.test(id.slice(versionId.length));
}

/** `a` vaut 1, `z` 26, `aa` 27 : numération bijective en base 26. */
function rank(suffix: string): number {
  return [...suffix].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 96, 0);
}

function letters(value: number): string {
  let suffix = "";
  for (let rest = value; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    suffix = String.fromCharCode(97 + ((rest - 1) % 26)) + suffix;
  }
  return suffix;
}
