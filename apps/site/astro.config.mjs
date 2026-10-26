// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { contentImages } from "./src/integrations/content-images.js";
import { siteFont } from "./src/integrations/site-font.js";
import { adminMode } from "./src/content-root.js";

export default defineConfig({
  integrations: [react(), contentImages(), siteFont()],
  devToolbar: { enabled: false },
  // Le site en mode admin est bâti à l'écart : il ne peut pas prendre la place
  // du site public dans `dist`, ni partager son cache.
  ...(adminMode ? { outDir: "./dist-admin", cacheDir: "./node_modules/.astro-admin" } : {}),
});
