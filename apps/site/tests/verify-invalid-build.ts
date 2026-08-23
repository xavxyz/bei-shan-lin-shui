import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const site = fileURLToPath(new URL("..", import.meta.url));
const invalidContent = fileURLToPath(new URL("./fixtures/invalid-content", import.meta.url));

/**
 * Un contenu invalide casse le build, jamais la production : on l'établit avant
 * de lancer la suite, faute de quoi les tests vérifieraient un site fantôme.
 */
export default async function verifyInvalidContentFailsTheBuild(): Promise<void> {
  const outDir = fileURLToPath(new URL("../dist-invalid", import.meta.url));
  const env = {
    ...process.env,
    CONTENT_ROOT: invalidContent,
    ASTRO_TELEMETRY_DISABLED: "1",
  };

  const outcome = await run("pnpm", ["exec", "astro", "build", "--outDir", outDir], {
    cwd: site,
    env,
  }).then(
    () => ({ failed: false, output: "" }),
    (error: { stdout?: string; stderr?: string }) => ({
      failed: true,
      output: `${error.stdout ?? ""}${error.stderr ?? ""}`,
    }),
  );

  if (!outcome.failed) {
    throw new Error("le build a réussi sur des fixtures invalides, alors qu'il devait échouer");
  }
  if (!outcome.output.includes("pieces/shan-ju-qiu-ming/piece.md")) {
    throw new Error(`le build a échoué sans désigner le fichier fautif :\n${outcome.output}`);
  }
}
