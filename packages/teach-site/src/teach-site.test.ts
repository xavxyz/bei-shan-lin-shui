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

const page = (body = "") => `<!doctype html><html><body>${body}</body></html>`;
const home = (...paths: string[]) => page(paths.map((path) => `<a href="${path}">x</a>`).join(""));

const exists = (path: string) =>
  access(path).then(
    () => true,
    () => false,
  );

describe("buildTeachSite", () => {
  it("publie l'accueil, les leçons, les références et les ressources", async () => {
    const teach = await writeTeach({
      "index.html": home("lessons/0001-vertical.html", "reference/glossaire.html"),
      "lessons/0001-vertical.html": page('<p class="cn">懸針</p>'),
      "reference/glossaire.html": page(),
      "assets/course.css": "body {}",
      "RESOURCES.md": "# Ressources",
    });
    const out = join(teach, "dist");

    const pages = await buildTeachSite(teach, out);

    expect(pages).toEqual(["lessons/0001-vertical.html", "reference/glossaire.html"]);
    expect(await readFile(join(out, "index.html"), "utf8")).toContain("lessons/0001-vertical.html");
    expect(await readFile(join(out, "RESOURCES.md"), "utf8")).toBe("# Ressources");
    expect(await exists(join(out, "lessons/0001-vertical.html"))).toBe(true);
    expect(await exists(join(out, "assets/course.css"))).toBe(true);
  });

  it("ne publie ni la mission, ni les notes, ni les acquis", async () => {
    const teach = await writeTeach({
      "index.html": home("lessons/0001-vertical.html"),
      "lessons/0001-vertical.html": page(),
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
      "index.html": home("lessons/0001-vertical.html"),
      "lessons/0001-vertical.html": page("<p>努過直而力敗</p>"),
    });
    const out = join(teach, "dist");

    await buildTeachSite(teach, out);

    const font = await readFile(join(out, "assets/fonts/tw-kai.woff2"));
    expect(font.subarray(0, 4).toString("latin1")).toBe("wOF2");
    expect(font.length).toBeLessThan(200_000);
    expect(await exists(join(out, "assets/fonts/TW-Kai.OFL.txt"))).toBe(true);
  });

  it("refuse une leçon que l'accueil ne lie pas, en la nommant", async () => {
    const teach = await writeTeach({
      "index.html": home("lessons/0001-vertical.html"),
      "lessons/0001-vertical.html": page(),
      "lessons/0002-horizontal.html": page(),
    });

    await expect(buildTeachSite(teach, join(teach, "dist"))).rejects.toThrow(
      "lessons/0002-horizontal.html",
    );
  });

  it("refuse un espace sans accueil", async () => {
    const teach = await writeTeach({ "lessons/0001-vertical.html": page() });

    await expect(buildTeachSite(teach, join(teach, "dist"))).rejects.toThrow("index.html");
  });
});
