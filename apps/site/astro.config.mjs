// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { contentImages } from "./src/integrations/content-images.js";

export default defineConfig({
  integrations: [react(), contentImages()],
  devToolbar: { enabled: false },
});
