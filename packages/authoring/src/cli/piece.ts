#!/usr/bin/env node
import { resolve } from "node:path";
import { text } from "node:stream/consumers";
import { parse } from "yaml";
import { addVariation } from "../add-variation.js";
import { addVersion } from "../add-version.js";
import { attachToProject } from "../attach-to-project.js";
import { availableSlug, createPiece } from "../create-piece.js";
import { setPieceGloss, setProjectGloss } from "../gloss.js";
import { describeOnHold } from "../on-hold.js";
import type { Outcome } from "../piece-file.js";
import { setPieceStatus, setVariationStatus } from "../statuses.js";
import { setVersionTranslation } from "../translation.js";

/**
 * Les écritures des skills de saisie. Chaque commande vérifie la pièce obtenue
 * avant d'écrire : un refus n'écrit rien. Les champs viennent en YAML sur
 * l'entrée standard, sous la forme de `@bsls/schema`.
 */
const USAGE = `usage : piece <commande> [--content <racine>]

  slug <titre>                          slug que prendrait une nouvelle pièce
  creer                < brouillon.yaml  pièce au statut idea, version v1
  version <slug>       < version.yaml    nouvelle version, à la suite
  variation <slug> <version> < variation.yaml
                                        nouvelle variation d'une version
  glose <slug>         < glose.yaml      écrit la glose de la pièce (gloss: …)
  glose-projet <projet> < glose.yaml     écrit la glose du projet (gloss: …)
  traduction <slug> <version> < traduction.yaml
                                        écrit la traduction de la version,
                                        une ligne par colonne (translation: […])
  rattacher <slug> <projet>             ajoute un projet à la pièce
  statut <slug> <statut>                change le statut de la pièce
  statut-variation <slug> <variation> <statut>
                                        change le statut d'une variation
  veille                                présente les pièces en veille
`;

async function main(argv: string[]): Promise<number> {
  const contentAt = argv.indexOf("--content");
  const root = resolve(contentAt === -1 ? "content" : (argv[contentAt + 1] ?? "content"));
  const args =
    contentAt === -1 ? argv : argv.filter((_, i) => i !== contentAt && i !== contentAt + 1);
  const [command, ...rest] = args;

  switch (`${command}/${rest.length}`) {
    case "slug/1":
      return done({ ok: true, slug: await availableSlug(root, rest[0]!) }, (r) => r.slug);
    case "creer/0":
      return done(await createPiece(root, await stdinYaml()), (r) => `pièce créée : ${r.file}`);
    case "version/1":
      return done(
        await addVersion(root, rest[0]!, await stdinYaml()),
        (r) => `version ajoutée : ${r.id}`,
      );
    case "variation/2":
      return done(
        await addVariation(root, rest[0]!, rest[1]!, await stdinYaml()),
        (r) => `variation ajoutée : ${r.id}`,
      );
    case "glose/1":
      return done(
        await setPieceGloss(root, rest[0]!, (await stdinYaml<Answer>())?.gloss),
        () => `glose écrite : ${rest[0]}`,
      );
    case "glose-projet/1":
      return done(
        await setProjectGloss(root, rest[0]!, (await stdinYaml<Answer>())?.gloss),
        () => `glose écrite : projet ${rest[0]}`,
      );
    case "traduction/2":
      return done(
        await setVersionTranslation(
          root,
          rest[0]!,
          rest[1]!,
          (await stdinYaml<Answer>())?.translation,
        ),
        () => `traduction écrite : ${rest[0]} ${rest[1]}`,
      );
    case "rattacher/2":
      return done(await attachToProject(root, rest[0]!, rest[1]!), () => `rattachée à ${rest[1]}`);
    case "statut/2":
      return done(
        await setPieceStatus(root, rest[0]!, rest[1]!),
        (r) => `statut : ${r.previous} → ${rest[1]}`,
      );
    case "statut-variation/3":
      return done(
        await setVariationStatus(root, rest[0]!, rest[1]!, rest[2]!),
        (r) => `statut de ${rest[1]} : ${r.previous} → ${rest[2]}`,
      );
    case "veille/0":
      return done(await describeOnHold(root), (r) => r.text.trimEnd());
    default:
      process.stderr.write(USAGE);
      return 2;
  }
}

/** Une réponse du calligraphe sur l'entrée standard : `gloss: …` ou `translation: […]`. */
type Answer = { gloss?: unknown; translation?: unknown } | null;

async function stdinYaml<T>(): Promise<T> {
  return parse(await text(process.stdin)) as T;
}

function done<T extends object>(outcome: Outcome<T>, describe: (result: T) => string): number {
  if (!outcome.ok) {
    process.stderr.write(`refusé, rien n'a été écrit :\n${outcome.message}\n`);
    return 1;
  }
  process.stdout.write(`${describe(outcome)}\n`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
