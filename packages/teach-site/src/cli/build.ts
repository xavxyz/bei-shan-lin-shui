#!/usr/bin/env node
import { resolve } from "node:path";
import { buildTeachSite } from "../index.js";

/**
 * Construit le site statique de l'espace d'apprentissage, celui que Netlify
 * publie (`teach/netlify.toml`).
 *
 * usage : build-teach <teach> <sortie>
 */
const [teachDir, outDir, ...rest] = process.argv.slice(2);
if (!teachDir || !outDir || rest.length > 0) {
  process.stderr.write("usage : build-teach <teach> <sortie>\n");
  process.exit(2);
}

try {
  const pages = await buildTeachSite(resolve(teachDir), resolve(outDir));
  process.stdout.write(`${outDir} : accueil et ${pages.length} pages.\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}
