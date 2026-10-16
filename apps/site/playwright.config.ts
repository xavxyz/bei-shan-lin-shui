import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "node:url";

const fixtureContent = fileURLToPath(new URL("./tests/fixtures/content", import.meta.url));
const publicPort = 4321;
// Loin de 4321 : `astro preview` se rabat sur le port suivant quand le sien est
// pris, et l'on servirait alors le site public à la place du site admin.
const adminPort = 4391;
const adminSpecs = /admin\.spec\.ts$/;

/** Un build réel des fixtures, servi tel quel ; `env` en fixe le mode. */
function builtSite(port: number, env: Record<string, string> = {}) {
  return {
    command: `pnpm build && pnpm preview --port ${port}`,
    url: `http://localhost:${port}`,
    env: { CONTENT_ROOT: fixtureContent, ASTRO_TELEMETRY_DISABLED: "1", ...env },
    reuseExistingServer: false,
    timeout: 180_000,
  };
}

export default defineConfig({
  testDir: "./tests/e2e",
  // Un contenu invalide doit casser le build : on le vérifie avant tout test.
  globalSetup: "./tests/verify-invalid-build.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "on-first-retry",
  },
  // Deux sites, deux builds réels des mêmes fixtures : le site public, et le
  // même en mode admin, qui montre aussi les pièces non publiées.
  projects: [
    {
      name: "public",
      testIgnore: adminSpecs,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${publicPort}` },
    },
    {
      name: "admin",
      testMatch: adminSpecs,
      use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${adminPort}` },
    },
  ],
  webServer: [builtSite(publicPort), builtSite(adminPort, { BSLS_ADMIN: "1" })],
});
