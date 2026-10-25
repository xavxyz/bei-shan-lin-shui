import { describe, expect, it } from "vitest";
import { writeTree } from "@bsls/content/test-support";
import { findBannedWords } from "./banned-words.js";

const GLOSSARY = `# Glossaire

## Langage

**Projet** : Une série de pièces montrées ensemble. _À éviter_ : collection, page-pôle

**Variation** : Une écriture complète d'une version. _À éviter_ : essai, déclinaison

**Étude** : Un morceau d'une pièce étudié séparément. _À éviter_ : exercice

**Format** : La disposition des colonnes. _À éviter_ : variante (pour un format candidat)

**Expérimentation** : Une pièce écrite pour essayer. _À éviter_ : étude

**山山** : Le 師父 du calligraphe. _À éviter_ : le professeur
`;

describe("findBannedWords", () => {
  it("signale un mot à éviter dans une skill, la doc ou le site, avec le terme à employer", async () => {
    const root = await writeTree({
      "GLOSSARY.md": GLOSSARY,
      ".claude/skills/scans/SKILL.md": "Un Exercice de traits est écarté.\n",
      "CLAUDE.md": "La page-pôle devient un projet.\n",
      "apps/site/src/pages/index.astro": "<p>Toutes les déclinaisons</p>\n",
      "docs/agents/domain.md": "Ce que dit le professeur.\n",
    });

    expect(await findBannedWords(root)).toEqual([
      ".claude/skills/scans/SKILL.md:1 — « Exercice » : dire Étude",
      "CLAUDE.md:1 — « page-pôle » : dire Projet",
      "apps/site/src/pages/index.astro:1 — « déclinaisons » : dire Variation",
      "docs/agents/domain.md:1 — « le professeur » : dire 山山",
    ]);
  });

  it("ne prend que le mot entier : « essai » n'est pas dans « essaie »", async () => {
    const root = await writeTree({
      "GLOSSARY.md": GLOSSARY,
      ".claude/skills/veille/SKILL.md": "Le calligraphe essaie un format.\n",
    });

    expect(await findBannedWords(root)).toEqual([]);
  });

  it("laisse un mot à éviter qui est lui-même un terme du glossaire", async () => {
    const root = await writeTree({
      "GLOSSARY.md": GLOSSARY,
      ".claude/skills/scans/SKILL.md": "Une étude de trois caractères.\n",
    });

    expect(await findBannedWords(root)).toEqual([]);
  });

  it("laisse un mot à éviter dans un seul sens, que le glossaire précise entre parenthèses", async () => {
    const root = await writeTree({
      "GLOSSARY.md": GLOSSARY,
      "README.md": "Une variante du build.\n",
    });

    expect(await findBannedWords(root)).toEqual([]);
  });

  it("laisse les homonymes dont un autre sens a cours : la page HTML, le dossier du Drive", async () => {
    const root = await writeTree({
      "GLOSSARY.md": `**Pièce** : Une calligraphie. _À éviter_ : œuvre, page\n\n**Projet** : Une série. _À éviter_ : dossier\n`,
      ".claude/skills/grilles/SKILL.md":
        "La page s'ouvre dans Chrome, depuis le dossier du Drive.\n",
    });

    expect(await findBannedWords(root)).toEqual([]);
  });

  it("ne lit ni le glossaire, ni les ADR qui discutent les termes, ni les textes de référence", async () => {
    const root = await writeTree({
      "GLOSSARY.md": GLOSSARY,
      "docs/adr/0005-projets.md": "Une collection de pièces n'est pas un projet.\n",
      "docs/sources/zhong-he-ji.md": "Un essai de traduction.\n",
    });

    expect(await findBannedWords(root)).toEqual([]);
  });
});
