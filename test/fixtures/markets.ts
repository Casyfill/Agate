import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { Row } from "../../src/core/types";

const root = fileURLToPath(new URL("../..", import.meta.url));
const notesDir = join(root, "demo-vault/tests/Markets");
export const marketsFixtureDir = join(root, "test/fixtures/markets");

/**
 * Base rows for tests/Markets in the D4 shape, read from the notes' frontmatter.
 * `formula.csv` points at the offline fixture instead of FRED, the way the base formula
 * would point at a URL.
 */
export function marketRows(): Row[] {
  return readdirSync(notesDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => {
      const text = readFileSync(join(notesDir, f), "utf8");
      const fm = parse(/^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "{}") as Record<string, string>;
      const name = f.replace(/\.md$/, "");
      return {
        file: { name, path: `tests/Markets/${f}`, ext: "md", folder: "tests/Markets" },
        note: { fred: fm.fred, kind: fm.kind, region: fm.region, unit: fm.unit },
        formula: { csv: `markets/${fm.fred}.csv` },
      };
    });
}

/** Properties-menu order and display names of the Markets "Table" view. */
export const marketColumns = ["file.name", "kind", "region", "unit"];
export const marketLabels: Record<string, string> = {
  "file.name": "Name",
  "note.kind": "Kind",
  "note.region": "Region",
  "note.unit": "Unit",
};
