import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixtureContent = fileURLToPath(new URL("./tests/fixtures/content", import.meta.url));
const port = 4321;

export default defineConfig({
  testDir: "./tests/e2e",
  // Un contenu invalide doit casser le build : on le vérifie avant tout test.
  globalSetup: "./tests/verify-invalid-build.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Le site est vérifié sur un build réel, produit à partir des fixtures de contenu.
  webServer: {
    command: `pnpm build && pnpm preview --port ${port}`,
    url: `http://localhost:${port}`,
    env: { CONTENT_ROOT: fixtureContent, ASTRO_TELEMETRY_DISABLED: "1" },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
