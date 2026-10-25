let count = 0;

/**
 * Un identifiant de popover pinyin, unique dans tout le build, donc dans chaque
 * page : le compteur ne fait que croître d'une page à l'autre.
 */
export function nextPinyinId(): string {
  count += 1;
  return `pinyin-${count}`;
}
