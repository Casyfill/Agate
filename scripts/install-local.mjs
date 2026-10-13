// Links (or copies) the built plugin into a vault's .obsidian/plugins/agate/.
//
//   npm run install:local                       -> demo-vault/
//   AGATE_VAULT=/path/to/vault npm run install:local
//
// Symlinks mean `npm run dev` rebuilds are picked up without re-running this.
// Where symlinks are not permitted (some Windows setups) it falls back to copying,
// and you must re-run it after each build.

import { existsSync, mkdirSync, rmSync, symlinkSync, copyFileSync, lstatSync } from "fs";
import { resolve, join } from "path";

const repo = resolve(import.meta.dirname, "..");
const vault = resolve(process.env.AGATE_VAULT ?? join(repo, "demo-vault"));
const target = join(vault, ".obsidian", "plugins", "agate");
const files = ["main.js", "manifest.json", "styles.css"];

if (!existsSync(join(repo, "main.js"))) {
  console.error("main.js not found. Run `npm run build` or `npm run dev` first.");
  process.exit(1);
}

mkdirSync(target, { recursive: true });

for (const name of files) {
  const src = join(repo, name);
  const dst = join(target, name);
  if (existsSync(dst) || isBrokenLink(dst)) rmSync(dst, { force: true });
  try {
    symlinkSync(src, dst, "file");
    console.log(`linked  ${dst} -> ${src}`);
  } catch (err) {
    copyFileSync(src, dst);
    console.log(`copied  ${dst}  (symlink failed: ${err.code ?? err.message})`);
  }
}

console.log(`\nAgate installed into ${vault}\nIn Obsidian: Settings → Community plugins → enable "Agate" (reload if it was already enabled).`);

function isBrokenLink(p) {
  try {
    lstatSync(p);
    return !existsSync(p);
  } catch {
    return false;
  }
}
