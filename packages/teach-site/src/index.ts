import { access, copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { FALLBACK_LICENSE, TW_KAI_LICENSE, subsetSiteFonts } from "@bsls/site-font";

/**
 * Ce que le site de `teach/` publie : l'accueil, les leçons, les références,
 * leurs composants, et les ressources. La mission, les notes et les acquis
 * restent au dépôt.
 */
const HOME = "index.html";
const LISTED_DIRS = ["lessons", "reference"];
const PUBLISHED_DIRS = [...LISTED_DIRS, "assets"];
const PUBLISHED_FILES = [HOME, "RESOURCES.md"];

/** Où `assets/course.css` cherche les polices, avant de retomber sur celles du dépôt. */
const FONTS_DIR = "assets/fonts";
const TW_KAI_FILE = "tw-kai.woff2";
const FALLBACK_FILE = "lxgw-wenkai-tc.woff2";

/** Les caractères que les polices de `teach/` dessinent : le chinois et sa ponctuation. */
const CHINESE = /[\p{Script=Han}　-〿＀-￯]/gu;

/**
 * Construit dans `outDir` le site statique de l'espace d'apprentissage
 * `teachDir` : les fichiers publiés, et TW-Kai réduite aux caractères chinois
 * qu'ils écrivent (avec sa police de secours s'il le faut, et leurs licences).
 * L'accueil, `teach/index.html`, s'écrit à la main ; une leçon ou une
 * référence qu'il ne lie pas fait échouer le build. Retourne les pages qu'il lie.
 */
export async function buildTeachSite(teachDir: string, outDir: string): Promise<string[]> {
  await access(join(teachDir, HOME)).catch(() => {
    throw new Error(`${HOME} : l'accueil de teach/ manque.`);
  });
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const dir of PUBLISHED_DIRS) {
    await cp(join(teachDir, dir), join(outDir, dir), { recursive: true }).catch(missingIsFine);
  }
  for (const file of PUBLISHED_FILES) {
    await copyFile(join(teachDir, file), join(outDir, file)).catch(missingIsFine);
  }

  const pages = await listedPages(outDir);
  await writeFile(join(outDir, "_headers"), "/*.md\n  Content-Type: text/plain; charset=utf-8\n");
  await writeFonts(outDir);
  return pages;
}

function missingIsFine(error: NodeJS.ErrnoException): void {
  if (error.code !== "ENOENT") throw error;
}

/** Les leçons et références publiées, triées ; chacune doit être liée par l'accueil. */
async function listedPages(outDir: string): Promise<string[]> {
  const home = await readFile(join(outDir, HOME), "utf8");
  const pages: string[] = [];
  for (const dir of LISTED_DIRS) {
    const names = await readdir(join(outDir, dir)).catch(() => [] as string[]);
    pages.push(...names.filter((name) => name.endsWith(".html")).map((name) => `${dir}/${name}`));
  }
  pages.sort();
  const unlisted = pages.filter((path) => !home.includes(`href="${path}"`));
  if (unlisted.length > 0) {
    throw new Error(
      `${HOME} : l'accueil ne lie pas ces pages :\n${unlisted.map((path) => `  ${path}`).join("\n")}`,
    );
  }
  return pages;
}

/** Les fichiers de `outDir` dont le chinois doit être dessiné. */
async function chineseTexts(outDir: string) {
  const entries = await readdir(outDir, { recursive: true, withFileTypes: true });
  const files = entries.filter((entry) => entry.isFile() && /\.(html|js|css)$/.test(entry.name));
  return Promise.all(
    files.map(async (entry) => {
      const path = join(entry.parentPath, entry.name);
      const text = (await readFile(path, "utf8")).match(CHINESE)?.join("") ?? "";
      return { owner: relative(outDir, path), text };
    }),
  );
}

async function writeFonts(outDir: string): Promise<void> {
  const fonts = await subsetSiteFonts(await chineseTexts(outDir));
  const dir = join(outDir, FONTS_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, TW_KAI_FILE), fonts.twKai);
  await copyFile(TW_KAI_LICENSE, join(dir, basename(TW_KAI_LICENSE)));
  if (fonts.fallback) {
    await writeFile(join(dir, FALLBACK_FILE), fonts.fallback.font);
    await copyFile(FALLBACK_LICENSE, join(dir, basename(FALLBACK_LICENSE)));
  }
}
