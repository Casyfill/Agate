import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";
import { statSync } from "fs";

const banner = `/*
Agate: Vega and Vega-Lite charts over Obsidian Bases.
Bundled with esbuild from src/; see docs/ in the repository.
*/
`;

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: banner },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2020",
  platform: "browser",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  minify: prod,
  outfile: "main.js",
  define: {
    "process.env.NODE_ENV": prod ? '"production"' : '"development"',
  },
});

if (prod) {
  await context.rebuild();
  const bytes = statSync("main.js").size;
  console.log(`main.js: ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  process.exit(0);
} else {
  await context.watch();
}
