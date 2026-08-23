import { cp, mkdir, readdir } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import { CONTENT_IMAGES_BASE, contentRoot } from "../content-root.js";

const MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

/**
 * Les images vivent avec le contenu, hors du répertoire du site : cette
 * intégration les sert en développement et les copie dans le build, sous
 * `/content-images/<slug>/<fichier>`, l'URL que le content layer publie.
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
                    const path = resolveImagePath(req.url ?? "");
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
        for (const slug of await pieceSlugs()) {
          const images = join(contentRoot, "pieces", slug, "images");
          if (!(await exists(images))) continue;
          await mkdir(join(target, slug), { recursive: true });
          await cp(images, join(target, slug), { recursive: true });
        }
      },
    },
  };
}

/** Traduit une URL `/content-images/<slug>/<fichier>` en chemin disque, ou rien. */
function resolveImagePath(url: string): string | undefined {
  const pathname = url.split("?")[0] ?? "";
  if (!pathname.startsWith(`${CONTENT_IMAGES_BASE}/`)) return undefined;

  const relative = normalize(decodeURIComponent(pathname.slice(CONTENT_IMAGES_BASE.length + 1)));
  if (relative.startsWith("..")) return undefined;

  const [slug, ...rest] = relative.split("/");
  if (!slug || rest.length !== 1) return undefined;

  return join(contentRoot, "pieces", slug, "images", rest[0]!);
}

async function pieceSlugs(): Promise<string[]> {
  const entries = await readdir(join(contentRoot, "pieces"), { withFileTypes: true }).catch(
    () => [],
  );
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function exists(path: string): Promise<boolean> {
  return readdir(path).then(
    () => true,
    () => false,
  );
}
