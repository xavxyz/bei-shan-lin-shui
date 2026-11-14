import { copyFile, cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { FALLBACK_LICENSE, TW_KAI_LICENSE, subsetSiteFonts } from "@bsls/site-font";

/**
 * Ce que le site de `teach/` publie : les leçons, les références, leurs
 * composants, et les ressources. La mission, les notes et les acquis restent
 * au dépôt.
 */
const PUBLISHED_DIRS = ["lessons", "reference", "assets"];
const PUBLISHED_FILES = ["RESOURCES.md"];

/** Où `assets/course.css` cherche les polices, avant de retomber sur celles du dépôt. */
const FONTS_DIR = "assets/fonts";
const TW_KAI_FILE = "tw-kai.woff2";
const FALLBACK_FILE = "lxgw-wenkai-tc.woff2";

/** Les caractères que les polices de `teach/` dessinent : le chinois et sa ponctuation. */
const CHINESE = /[\p{Script=Han}　-〿＀-￯]/gu;

/** Une page publiée, et le titre que l'accueil lui donne. */
type Page = { path: string; title: string };

/**
 * Construit dans `outDir` le site statique de l'espace d'apprentissage
 * `teachDir` : les fichiers publiés, une page d'accueil qui liste leçons et
 * références, et TW-Kai réduite aux caractères chinois qu'ils écrivent (avec
 * sa police de secours s'il le faut, et leurs licences). Retourne les pages
 * listées par l'accueil.
 */
export async function buildTeachSite(teachDir: string, outDir: string): Promise<Page[]> {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  for (const dir of PUBLISHED_DIRS) {
    await cp(join(teachDir, dir), join(outDir, dir), { recursive: true }).catch(missingIsFine);
  }
  for (const file of PUBLISHED_FILES) {
    await copyFile(join(teachDir, file), join(outDir, file)).catch(missingIsFine);
  }

  const lessons = await pagesOf(outDir, "lessons");
  const references = await pagesOf(outDir, "reference");
  await writeFile(join(outDir, "index.html"), indexPage(lessons, references));
  await writeFile(join(outDir, "_headers"), "/*.md\n  Content-Type: text/plain; charset=utf-8\n");

  await writeFonts(outDir);
  return [...lessons, ...references];
}

function missingIsFine(error: NodeJS.ErrnoException): void {
  if (error.code !== "ENOENT") throw error;
}

/** Les pages HTML d'un dossier publié, triées par nom, avec leur `<title>`. */
async function pagesOf(outDir: string, dir: string): Promise<Page[]> {
  const names = (await readdir(join(outDir, dir)).catch(() => [] as string[]))
    .filter((name) => name.endsWith(".html"))
    .sort();
  return Promise.all(
    names.map(async (name) => {
      const path = `${dir}/${name}`;
      const html = await readFile(join(outDir, path), "utf8");
      const title = /<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim();
      if (!title)
        throw new Error(`${path} : la page n'a pas de <title>, l'accueil ne peut pas la nommer.`);
      return { path, title };
    }),
  );
}

function indexPage(lessons: Page[], references: Page[]): string {
  const list = (pages: Page[]) =>
    pages.map(({ path, title }) => `<li><a href="${path}">${title}</a></li>`).join("\n");
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>La limpidité du régulier</title>
<link rel="stylesheet" href="assets/course.css">
</head>
<body>
<main>
<p class="kicker">Espace d'apprentissage</p>
<h1>La limpidité du régulier</h1>
<h2>Leçons</h2>
<ul>
${list(lessons)}
</ul>
<h2>Références</h2>
<ul>
${list(references)}
<li><a href="RESOURCES.md">Ressources</a></li>
</ul>
</main>
</body>
</html>
`;
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
