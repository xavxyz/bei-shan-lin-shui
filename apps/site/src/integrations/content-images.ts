import { cp, mkdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import {
  CONTENT_IMAGES_BASE,
  contentImageDirectories,
  resolveContentImagePath,
} from "@bsls/content";
import { contentRoot } from "../content-root.js";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Les images vivent avec le contenu, hors du répertoire du site : cette
 * intégration les sert en développement et les copie dans le build, sous les
 * URL que le content layer publie. C'est lui, et non le site, qui sait où
 * elles sont rangées sur le disque.
 */
export function contentImages(): AstroIntegration {
  return {
    name: "bsls:content-images",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            plugins: [
              {
                name: "bsls:serve-content-images",
                configureServer(server) {
                  server.middlewares.use((req, res, next) => {
                    const path = resolveContentImagePath(contentRoot, req.url ?? "");
                    if (!path) return next();
                    res.setHeader(
                      "Content-Type",
                      MIME_TYPES[extname(path)] ?? "application/octet-stream",
                    );
                    createReadStream(path)
                      .on("error", () => {
                        res.statusCode = 404;
                        res.end();
                      })
                      .pipe(res);
                  });
                },
              },
            ],
          },
        });
      },
      "astro:build:done": async ({ dir }) => {
        const target = join(fileURLToPath(dir), CONTENT_IMAGES_BASE.slice(1));
        for (const { slug, directory } of await contentImageDirectories(contentRoot)) {
          await mkdir(join(target, slug), { recursive: true });
          await cp(directory, join(target, slug), { recursive: true }).catch(() => {});
        }
      },
    },
  };
}
