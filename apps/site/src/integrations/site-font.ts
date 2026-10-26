import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import {
  FALLBACK_LICENSE,
  TW_KAI_LICENSE,
  publishedTexts,
  subsetSiteFonts,
  type SiteFonts,
} from "@bsls/site-font";
import { contentRoot } from "../content-root.js";
import { readContent } from "../read-content.js";
import { FALLBACK_FONT_URL, SITE_FONT_URL, SITE_TITLE, siteFontFace } from "../site.js";

/** Le module que `Layout.astro` importe : les déclarations des polices du site. */
const FONT_FACE_MODULE = "virtual:bsls/site-font-face";
const RESOLVED_FONT_FACE_MODULE = `\0${FONT_FACE_MODULE}`;

/** TW-Kai et sa secours réduites à ce que le site montre : le contenu, et le titre du site. */
async function siteFontsFor(): Promise<SiteFonts> {
  const content = await readContent();
  return subsetSiteFonts([
    ...publishedTexts(content),
    { owner: "le titre du site (apps/site/src/site.ts)", text: SITE_TITLE },
  ]);
}

/**
 * Sert le chinois du site en TW-Kai, réduite aux caractères publiés
 * (ADR 0005), et dans sa police de secours ce que TW-Kai ne dessine pas
 * (ADR 0006). Au build, les polices sont tirées avant les pages : un caractère
 * qu'aucune ne dessine casse le build, en nommant la pièce. En développement,
 * elles sont retirées à chaque demande, et leurs déclarations à chaque édition
 * du contenu.
 */
export function siteFont(): AstroIntegration {
  let built: SiteFonts | undefined;
  return {
    name: "bsls:site-font",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: "bsls:site-font-face",
                resolveId: (id) =>
                  id === FONT_FACE_MODULE ? RESOLVED_FONT_FACE_MODULE : undefined,
                async load(id) {
                  if (id !== RESOLVED_FONT_FACE_MODULE) return undefined;
                  const fonts = built ?? (await siteFontsFor());
                  return `export default ${JSON.stringify(siteFontFace(fonts.fallback?.characters))};`;
                },
                configureServer(server) {
                  if (command !== "dev") return;
                  server.watcher.add(contentRoot);
                  server.watcher.on("all", (_event, path) => {
                    if (!path.startsWith(contentRoot)) return;
                    const module = server.moduleGraph.getModuleById(RESOLVED_FONT_FACE_MODULE);
                    if (module) server.moduleGraph.invalidateModule(module);
                  });
                  server.middlewares.use((req, res, next) => {
                    if (req.url !== SITE_FONT_URL && req.url !== FALLBACK_FONT_URL) return next();
                    siteFontsFor().then(({ twKai, fallback }) => {
                      const data = req.url === SITE_FONT_URL ? twKai : fallback?.font;
                      if (!data) return next();
                      res.setHeader("Content-Type", "font/woff2");
                      res.end(data);
                    }, next);
                  });
                },
              },
            ],
          },
        });
      },
      "astro:build:start": async () => {
        built = await siteFontsFor();
      },
      "astro:build:done": async ({ dir }) => {
        const { twKai, fallback } = built!;
        const serve = async (url: string, font: Buffer, license: string) => {
          const target = join(fileURLToPath(dir), url.slice(1));
          await mkdir(dirname(target), { recursive: true });
          await writeFile(target, font);
          await copyFile(license, join(dirname(target), basename(license)));
        };
        await serve(SITE_FONT_URL, twKai, TW_KAI_LICENSE);
        if (fallback) await serve(FALLBACK_FONT_URL, fallback.font, FALLBACK_LICENSE);
      },
    },
  };
}
