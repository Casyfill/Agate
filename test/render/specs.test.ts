/**
 * Layer 2 (ADR-0001 D8): every fixture spec in test-vault/charts is compiled, fed rows in
 * the D4 shape, and rendered to SVG with real Vega. Small specs are snapshotted whole; the
 * world map (190 KB of paths) is snapshotted as a hash plus shape count.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as vega from "vega";
import * as vl from "vega-lite";
import { describe, expect, it } from "vitest";
import { defaultRows } from "../fixtures/rows";
import { ensureNamedData, withInitialValues } from "../../src/core/spec";

const root = fileURLToPath(new URL("../..", import.meta.url));
const chartsDir = join(root, "test-vault/charts");
const vaultDir = join(root, "test-vault");

const loader = vega.loader();
loader.load = async (uri: string) => readFileSync(join(vaultDir, uri), "utf8");

const warnings: string[] = [];
const quietLogger = {
  level() {
    return this;
  },
  warn(...a: unknown[]) {
    warnings.push(a.join(" "));
    return this;
  },
  info() {
    return this;
  },
  debug() {
    return this;
  },
  error(...a: unknown[]) {
    warnings.push("ERROR " + a.join(" "));
    return this;
  },
};

async function renderFixture(name: string): Promise<string> {
  const raw = JSON.parse(readFileSync(join(chartsDir, name), "utf8")) as Record<string, unknown>;
  const isVL = typeof raw.$schema === "string" && /vega-lite/.test(raw.$schema);
  const mode = isVL ? "vega-lite" : "vega";
  let spec = ensureNamedData(raw, mode, "base");
  spec = withInitialValues(spec, mode, "base", defaultRows);
  if (spec.width === "container") spec = { ...spec, width: 500 }; // no DOM to measure
  const vgSpec = isVL ? vl.compile(spec as never, { logger: quietLogger }).spec : spec;
  const view = new vega.View(vega.parse(vgSpec), { renderer: "none", loader, logger: quietLogger });
  const svg = await view.toSVG();
  view.finalize();
  return svg;
}

const fixtures = readdirSync(chartsDir).filter((f) => f.endsWith(".json")).sort();

describe("fixture specs render headlessly with D4 rows", () => {
  for (const name of fixtures) {
    it(name, async () => {
      warnings.length = 0;
      const svg = await renderFixture(name);
      const shapes = (svg.match(/<(path|rect|circle|line)\b/g) ?? []).length;
      expect(shapes).toBeGreaterThan(0);
      // Rows were injected before the first run, so no empty-extent warnings may appear.
      expect(warnings.filter((w) => /Infinite extent/.test(w))).toEqual([]);
      if (svg.length > 50_000) {
        const hash = createHash("sha256").update(svg).digest("hex").slice(0, 16);
        expect({ hash, shapes }).toMatchSnapshot();
      } else {
        expect(svg).toMatchSnapshot();
      }
    });
  }
});
