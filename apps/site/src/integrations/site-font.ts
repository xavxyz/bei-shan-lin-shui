import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { TW_KAI_LICENSE, publishedTexts, subsetSiteFont } from "@bsls/site-font";
import { readContent } from "../read-content.js";
import { SITE_FONT_URL, SITE_TITLE } from "../site.js";

/** TW-Kai réduite à ce que le site montre : le contenu, et le titre du site. */
async function siteFontFor(): Promise<Buffer> {
  const content = await readContent();
  return subsetSiteFont([
    ...publishedTexts(content),
    { owner: "le titre du site (apps/site/src/site.ts)", text: SITE_TITLE },
  ]);
}

/**
 * Sert le chinois du site en TW-Kai, réduite aux caractères publiés
 * (ADR 0005). Au build, la police est tirée avant les pages : un caractère
 * que TW-Kai n'a pas casse le build, en nommant la pièce. En développement,
 * elle est retirée à chaque demande, pour suivre les éditions du contenu.
 */
export function siteFont(): AstroIntegration {
  let font: Buffer | undefined;
  return {
    name: "bsls:site-font",
    hooks: {
      "astro:config:setup": ({ command, updateConfig }) => {
        if (command !== "dev") return;
        updateConfig({
          vite: {
            plugins: [
              {
                name: "bsls:serve-site-font",
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    if (req.url !== SITE_FONT_URL) return next();
                    siteFontFor().then((data) => {
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
        font = await siteFontFor();
      },
      "astro:build:done": async ({ dir }) => {
        const target = join(fileURLToPath(dir), SITE_FONT_URL.slice(1));
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, font!);
        await copyFile(TW_KAI_LICENSE, join(dirname(target), "TW-Kai.OFL.txt"));
      },
    },
  };
}
