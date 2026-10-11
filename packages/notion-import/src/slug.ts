import { pinyin } from "pinyin-pro";

/** Un slug publié ne changera plus : on le garde tapable et lisible. */
const MAX_LENGTH = 60;
const FALLBACK = "sans-titre";

/**
 * Dérive du titre l'identifiant stable de la pièce : pinyin sans tons pour le
 * chinois, mots latins conservés tels quels, tout le reste écarté.
 */
export function deriveSlug(title: string): string {
  const romanized = title.replace(
    /\p{Script=Han}+/gu,
    (run) => ` ${pinyin(run, { toneType: "none" })} `,
  );

  const slug = romanized
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (slug === "") return FALLBACK;
  return truncate(slug);
}

/** On coupe sur une frontière de syllabe : un slug tronqué au milieu ne se lit plus. */
function truncate(slug: string): string {
  if (slug.length <= MAX_LENGTH) return slug;
  const cut = slug.slice(0, MAX_LENGTH + 1);
  const boundary = cut.lastIndexOf("-");
  return boundary > 0 ? cut.slice(0, boundary) : cut.slice(0, MAX_LENGTH);
}

/**
 * Deux titres peuvent donner le même pinyin ; deux pièces ne peuvent pas
 * partager une URL. Le doublon est suffixé, jamais le premier arrivé.
 */
export function disambiguate(slug: string, taken: ReadonlySet<string>): string {
  if (!taken.has(slug)) return slug;
  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${slug}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
}
