/**
 * Un compte dit en français : `1 colonne`, `2 colonnes`, `2 lignes
 * horizontales`. Chaque mot donné prend la marque du pluriel ; ce qui ne
 * s'accorde pas (`de contenu`) s'écrit après.
 */
export function plural(count: number, words: string): string {
  return `${count} ${count > 1 ? words.replace(/(\S+)/g, "$1s") : words}`;
}
