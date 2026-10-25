import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const site = fileURLToPath(new URL("..", import.meta.url));
const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

/** Bâtit le site sur une racine de contenu, et rend la sortie d'un build qui doit échouer. */
async function failedBuildOutput(contentRoot: string, outDir: string): Promise<string> {
  const env = { ...process.env, CONTENT_ROOT: contentRoot, ASTRO_TELEMETRY_DISABLED: "1" };
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
    throw new Error(`le build a réussi sur ${contentRoot}, alors qu'il devait échouer`);
  }
  return outcome.output;
}

/**
 * Un contenu invalide casse le build, jamais la production : on l'établit avant
 * de lancer la suite, faute de quoi les tests vérifieraient un site fantôme.
 * De même pour un caractère que ni TW-Kai ni sa police de secours ne dessine :
 * le site n'écrit ni case vide, ni police du système (ADR 0005, ADR 0006).
 */
export default async function verifyInvalidContentFailsTheBuild(): Promise<void> {
  const outDir = fileURLToPath(new URL("../dist-invalid", import.meta.url));

  const invalid = await failedBuildOutput(fixture("invalid-content"), outDir);
  if (!invalid.includes("pieces/shan-ju-qiu-ming/piece.md")) {
    throw new Error(`le build a échoué sans désigner le fichier fautif :\n${invalid}`);
  }

  const missingGlyph = await failedBuildOutput(fixture("missing-glyph-content"), outDir);
  if (!/pieces\/kun\/piece\.md \(困𮌖\).*𮌖/.test(missingGlyph)) {
    throw new Error(
      `le build a échoué sans désigner la pièce et le caractère qu'aucune police du site ne dessine :\n${missingGlyph}`,
    );
  }
}
