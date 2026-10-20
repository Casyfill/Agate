/**
 * The agate-chart skill (skills/agate-chart) documents Agate for AI agents. These checks fail when
 * Agate gains something the skill doesn't mention, or the skill points at a file that is gone.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { builtinRecipes } from "../../src/recipes";
import { builtinThemes } from "../../src/core/theme";

const root = fileURLToPath(new URL("../..", import.meta.url));
const skillDir = join(root, "skills/agate-chart");
const read = (rel: string) => readFileSync(join(skillDir, rel), "utf8");
const all = ["SKILL.md", ...readdirSync(join(skillDir, "reference")).map((f) => `reference/${f}`)].map(read).join("\n");

/** usermeta.agate keys Agate reads, found in the source the way it reads them. */
function agateKeysInSource(): string[] {
  const keys = new Set<string>();
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (p.endsWith(".ts")) {
        const text = readFileSync(p, "utf8");
        for (const m of text.matchAll(/\.agate\??\.(\w+)/g)) keys.add(m[1]);
        for (const m of text.matchAll(/datasetName\(spec, "(\w+)"\)/g)) keys.add(m[1]);
      }
    }
  };
  walk(join(root, "src"));
  // Authoring bookkeeping, not something a spec asks for.
  keys.delete("recipe");
  keys.delete("fromRecipe");
  // app.plugins.plugins.agate.api: the plugin's API object, not a spec key.
  keys.delete("api");
  return [...keys].sort();
}

describe("agate-chart skill", () => {
  it("has a name and description the agent can match on", () => {
    const fm = /^---\n([\s\S]*?)\n---/.exec(read("SKILL.md"))?.[1] ?? "";
    expect(fm).toMatch(/^name: agate-chart$/m);
    expect(fm).toMatch(/^description: .{80,}/m);
  });

  it("lists every usermeta.agate key in SKILL.md's table and explains it in extras.md", () => {
    const keys = agateKeysInSource();
    expect(keys).toEqual(expect.arrayContaining(["cells", "edges", "open", "output", "rowData", "textures", "tree"]));
    for (const k of keys) {
      expect(read("SKILL.md"), k).toContain(`| \`${k}`);
      expect(read("reference/extras.md"), k).toContain(`\`${k}`);
    }
  });

  it("covers every built-in recipe", () => {
    for (const r of builtinRecipes()) expect(read("reference/examples.md"), r.id).toContain(`| ${r.name} |`);
  });

  it("names every texture shape and every theme", () => {
    const shapes = [...readFileSync(join(root, "src/core/textures.ts"), "utf8").matchAll(/^ {2}(\w+): \(s\) =>/gm)].map((m) => m[1]);
    expect(shapes.length).toBeGreaterThan(5);
    for (const s of shapes) expect(read("reference/extras.md"), s).toContain(`"${s}"`);
    for (const t of builtinThemes().keys()) expect(read("reference/look.md"), t).toContain(`\`${t}\``);
  });

  it("points only at repo files that exist", () => {
    const paths = new Set<string>();
    for (const m of all.matchAll(/raw\.githubusercontent\.com\/Casyfill\/Agate\/main\/([^)\s]+)/g)) paths.add(decodeURIComponent(m[1]));
    for (const m of all.matchAll(/`((?:demo-vault|src|docs)\/[^`\s]+\.(?:json|ts))`/g)) paths.add(m[1]);
    expect(paths.size).toBeGreaterThan(10);
    for (const p of paths) expect(existsSync(join(root, p)), p).toBe(true);
  });
});
