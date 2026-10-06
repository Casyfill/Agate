import { defineConfig, globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
  // Build output, vendored vault, docs, and Node-side tooling scripts are not plugin code.
  globalIgnores([
    "main.js",
    "node_modules/",
    "test-vault/",
    "docs/",
    "**/__snapshots__/",
    "*.mjs",
    "*.mts",
    "scripts/",
  ]),
  ...obsidianmd.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        // src/ resolves through ./tsconfig.json, test/ through ./test/tsconfig.json (obsidian -> mock).
        projectService: true,
      },
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      // Product and feature names the sentence-case rule would otherwise lowercase.
      "obsidianmd/ui/sentence-case": [
        "warn",
        { brands: ["Agate", "Bases", "Vega", "Vega-Lite", "Obsidian", "obsidian-vega", "vega-embed"], acronyms: ["URLs", "SVG", "PNG", "JSON", "YAML"] },
      ],
    },
  },
  {
    // The logger is the single, gated console access point (see the comment in the file).
    files: ["src/util/log.ts"],
    rules: { "obsidianmd/rule-custom-message": "off" },
  },
  {
    files: ["test/**/*.ts"],
    rules: {
      // Tests and the obsidian mock are not shipped; relax rules aimed at plugin code.
      "obsidianmd/no-plugin-as-component": "off",
      "obsidianmd/no-static-styles-assignment": "off",
      "obsidianmd/rule-custom-message": "off",
      "obsidianmd/no-nodejs-modules": "off",
      "obsidianmd/no-global-this": "off",
      "obsidianmd/ui/sentence-case": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-base-to-string": "off",
    },
  },
]);
