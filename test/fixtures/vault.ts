import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { Row } from "../../src/core/types";

const root = fileURLToPath(new URL("../..", import.meta.url));
export const vaultDir = join(root, "test-vault");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(relative(vaultDir, full));
  }
  return out;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const WIKILINK = /\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g;

/**
 * Rows in the D4 shape for test-vault files, the way the Bases view would build them:
 * `file` from the path and size, `note` from the frontmatter, `file.tags` from `tags`.
 * Formulas are not evaluated; pass them in when a spec needs one.
 */
export function vaultRows(include: (path: string) => boolean, formulas?: (note: Record<string, unknown>) => Row): Row[] {
  return walk(vaultDir)
    .filter(include)
    .sort()
    .map((path) => {
      const ext = path.split(".").pop() ?? "";
      const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
      const name = path.split("/").pop()!.replace(/\.[^.]+$/, "");
      const text = ext === "md" ? readFileSync(join(vaultDir, path), "utf8") : "";
      const note = (parse(FRONTMATTER.exec(text)?.[1] ?? "") ?? {}) as Record<string, unknown>;
      const tags = Array.isArray(note.tags) ? note.tags.map((t) => `#${String(t)}`) : [];
      return {
        file: { name, path, ext, folder, size: statSync(join(vaultDir, path)).size, tags },
        note,
        formula: formulas ? formulas(note) : {},
      };
    });
}

/** `metadataCache.resolvedLinks` for the given rows: wikilinks in the body and frontmatter, resolved by basename. */
export function vaultResolvedLinks(rows: Row[]): Record<string, Record<string, number>> {
  const byName = new Map<string, string>();
  for (const p of walk(vaultDir)) byName.set(p.split("/").pop()!.replace(/\.md$/, ""), p);
  const out: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const path = (row.file as { path: string }).path;
    if (!path.endsWith(".md")) continue;
    const links: Record<string, number> = {};
    for (const m of readFileSync(join(vaultDir, path), "utf8").matchAll(WIKILINK)) {
      const target = byName.get(m[1].trim().split("/").pop()!);
      if (target) links[target] = (links[target] ?? 0) + 1;
    }
    out[path] = links;
  }
  return out;
}
