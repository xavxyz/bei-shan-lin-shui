import { lstat, readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** Ce que le parcours ne visite jamais : dépendances, historique, sorties, worktrees. */
const SKIPPED = new Set(["node_modules", ".git", "dist", "dist-admin", ".astro", "worktrees"]);

export type RepoFile = { path: string; text: string };

/**
 * Les fichiers du dépôt sous `dirs`, chemins relatifs à `root` avec des `/`,
 * triés. Un lien symbolique n'est pas suivi : `AGENTS.md` pointe sur
 * `CLAUDE.md`, qui est lu pour lui.
 */
export async function repoFiles(
  root: string,
  dirs: string[],
  keep: (path: string) => boolean,
): Promise<RepoFile[]> {
  const paths: string[] = [];
  for (const dir of dirs) await walk(root, join(root, dir), keep, paths);
  paths.sort();
  return Promise.all(
    paths.map(async (path) => ({ path, text: await readFile(join(root, path), "utf8") })),
  );
}

async function walk(
  root: string,
  at: string,
  keep: (path: string) => boolean,
  paths: string[],
): Promise<void> {
  const stats = await lstat(at).catch(() => undefined);
  if (stats === undefined || stats.isSymbolicLink()) return;
  if (stats.isFile()) {
    const path = relative(root, at).split(sep).join("/");
    if (keep(path)) paths.push(path);
    return;
  }
  if (!stats.isDirectory()) return;
  for (const name of await readdir(at)) {
    if (!SKIPPED.has(name)) await walk(root, join(at, name), keep, paths);
  }
}

/** Le numéro de ligne d'un décalage dans le texte. */
export function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) if (text[i] === "\n") line++;
  return line;
}
