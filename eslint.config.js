// @ts-check
import { defineConfig } from "eslint/config";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

// Une seule règle : un nom local ne masque ni un import, ni un nom d'une portée
// englobante. `no-shadow` de base ne connaît pas les types de TypeScript.
export default defineConfig(
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/dist-*/",
      "**/.astro/",
      "**/.netlify/",
      "**/cosmos-export/",
      "**/test-results/",
      "**/playwright-report/",
      "grilles/",
      "imports/",
      ".claude/worktrees/",
    ],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: { parser: tseslint.parser },
  },
  // Le frontmatter et les <script> des composants Astro, lus en TypeScript.
  ...astro.configs["flat/base"],
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.astro"],
    plugins: { "@typescript-eslint": tseslint.plugin },
    rules: {
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "error",
    },
  },
);
