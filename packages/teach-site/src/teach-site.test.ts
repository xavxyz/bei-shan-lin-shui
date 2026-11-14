import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildTeachSite } from "./index.js";

/** Écrit un vrai espace d'apprentissage dans un répertoire temporaire. */
async function writeTeach(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "teach-"));
  for (const [path, text] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true });
    await writeFile(join(root, path), text);
  }
  return root;
}

const page = (title: string, body = "") =>
  `<!doctype html><html><head><title>${title}</title></head><body>${body}</body></html>`;

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

describe("buildTeachSite", () => {
  it("publie leçons, références et ressources, avec un accueil qui les liste dans l'ordre", async () => {
    const teach = await writeTeach({
      "lessons/0002-horizontal.html": page("Leçon 2 — L'horizontal"),
      "lessons/0001-vertical.html": page("Leçon 1 — Le vertical", '<p class="cn">懸針</p>'),
      "reference/glossaire.html": page("Glossaire"),
      "assets/course.css": "body {}",
      "RESOURCES.md": "# Ressources",
    });
    const out = join(teach, "dist");

    await buildTeachSite(teach, out);

    const index = await readFile(join(out, "index.html"), "utf8");
    expect(index.indexOf("Leçon 1 — Le vertical")).toBeLessThan(
      index.indexOf("Leçon 2 — L'horizontal"),
    );
    expect(index).toContain('href="lessons/0001-vertical.html"');
    expect(index).toContain('href="reference/glossaire.html"');
    expect(index).toContain('href="RESOURCES.md"');
    expect(await readFile(join(out, "RESOURCES.md"), "utf8")).toBe("# Ressources");
    expect(await exists(join(out, "assets/course.css"))).toBe(true);
  });

  it("ne publie ni la mission, ni les notes, ni les acquis", async () => {
    const teach = await writeTeach({
      "lessons/0001-vertical.html": page("Leçon 1"),
      "MISSION.md": "# Mission",
      "NOTES.md": "# Notes",
      "learning-records/0001-acquis.md": "# Acquis",
    });
    const out = join(teach, "dist");

    await buildTeachSite(teach, out);

    expect(await exists(join(out, "MISSION.md"))).toBe(false);
    expect(await exists(join(out, "NOTES.md"))).toBe(false);
    expect(await exists(join(out, "learning-records"))).toBe(false);
  });

  it("sert TW-Kai réduite au chinois des pages, avec sa licence", async () => {
    const teach = await writeTeach({
      "lessons/0001-vertical.html": page("Leçon 1", "<p>努過直而力敗</p>"),
    });
    const out = join(teach, "dist");

    await buildTeachSite(teach, out);

    const font = await readFile(join(out, "assets/fonts/tw-kai.woff2"));
    expect(font.subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(font.length).toBeLessThan(200_000);
    expect(await exists(join(out, "assets/fonts/TW-Kai.OFL.txt"))).toBe(true);
  });

  it("refuse une page sans titre, en la nommant", async () => {
    const teach = await writeTeach({ "lessons/0001-vertical.html": "<p>sans titre</p>" });

    await expect(buildTeachSite(teach, join(teach, "dist"))).rejects.toThrow(
      "lessons/0001-vertical.html",
    );
  });
});
