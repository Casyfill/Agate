/**
 * Layer 2 (ADR-0001 D8): every fixture spec in demo-vault/tests/charts is compiled, fed rows in
 * the D4 shape, and rendered to SVG with real Vega. Small specs are snapshotted whole; the
 * world map (190 KB of paths) is snapshotted as a hash plus shape count.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import * as vega from "vega";
import * as vl from "vega-lite";
import { describe, expect, it } from "vitest";
import { defaultRows } from "../fixtures/rows";
import { marketColumns, marketLabels, marketRows, marketsFixtureDir } from "../fixtures/markets";
import { ensureNamedData, withInitialValues, withSignalValues } from "../../src/core/spec";
import { expandRowData, rowDataDefs } from "../../src/core/data/rowdata";
import { cellsDatasetName, tableCells } from "../../src/core/data/table";
import { edgesDatasetName, linkEdges, pathTree, treeDatasetName } from "../../src/core/data/structure";
import { vaultResolvedLinks, vaultRows } from "../fixtures/vault";
import type { Row } from "../../src/core/types";

/** Which test notes each example charts, by spec file name. Everything else charts the Library fixture. */
function rowsFor(name: string, hasRowData: boolean): Row[] {
  if (hasRowData) return marketRows();
  const md = (folder: string) => (p: string) => p.startsWith(`tests/${folder}/`) && p.endsWith(".md");
  if (name.startsWith("link-")) return vaultRows(md("Ideas"));
  if (name.startsWith("stats-")) return vaultRows((p) => md("Library")(p) && /^\s*- book$/m.test(readFileSync(join(vaultDir, p), "utf8")));
  if (name.startsWith("travel-")) return vaultRows((p) => md("Trips")(p) || md("Places")(p));
  if (name.startsWith("mood-")) return vaultRows(md("Journal"));
  if (name.startsWith("vault-")) return vaultRows((p) => p.startsWith("tests/"));
  return defaultRows;
}

/** A stand-in for the obsidian theme in dark mode, for AGATE_PREVIEW_DARK=1 previews only. */
const previewDark = {
  background: "#1e1e1e",
  axis: { labelColor: "#b3b3b3", titleColor: "#dadada", domainColor: "#444", tickColor: "#444", gridColor: "#333" },
  legend: { labelColor: "#b3b3b3", titleColor: "#dadada" },
  style: { "guide-label": { fill: "#b3b3b3" }, "guide-title": { fill: "#dadada" }, text: { fill: "#dadada" } },
  range: { category: ["#a68af9", "#027aff", "#44cf6e", "#e9973f", "#fb464c", "#7852ee", "#00bfbc", "#e0ac00", "#d53984"] },
};

const root = fileURLToPath(new URL("../..", import.meta.url));
const chartsDir = join(root, "demo-vault/tests/charts");
const vaultDir = join(root, "demo-vault");

const loader = vega.loader();
// `markets/…` is the offline stand-in for FRED (test/fixtures/markets); everything else is the vault.
const readUri = (uri: string): string =>
  uri.startsWith("markets/")
    ? readFileSync(join(marketsFixtureDir, uri.slice("markets/".length)), "utf8")
    : readFileSync(join(vaultDir, uri), "utf8");
loader.load = async (uri: string) => readUri(uri);

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
  // Specs with per-row data (D12) chart tests/Markets; the rest chart the Library rows.
  const defs = rowDataDefs(raw);
  const baseRows = rowsFor(name, defs.length > 0);
  const datasets: Record<string, Row[]> = { base: baseRows };
  for (const def of defs) {
    const { records, errors } = await expandRowData(baseRows, def, { load: async (u) => readUri(u) });
    expect(errors).toEqual([]);
    datasets[def.name] = records;
  }
  const cells = cellsDatasetName(raw);
  if (cells) datasets[cells] = tableCells(baseRows, marketColumns, (id) => marketLabels[id] ?? id);
  const edges = edgesDatasetName(raw);
  if (edges) datasets[edges] = linkEdges(baseRows, vaultResolvedLinks(baseRows));
  const tree = treeDatasetName(raw);
  if (tree) datasets[tree] = pathTree(baseRows, "demo-vault");
  const dark = env.AGATE_PREVIEW_DARK === "1";
  let spec = withSignalValues(raw, mode, { agateDark: dark });
  for (const [name, rows] of Object.entries(datasets)) {
    spec = ensureNamedData(spec, mode, name);
    spec = withInitialValues(spec, mode, name, rows);
  }
  if (spec.width === "container") spec = { ...spec, width: 500 }; // no DOM to measure
  const config = dark ? previewDark : undefined;
  const vgSpec = isVL ? vl.compile(spec as never, { logger: quietLogger, config: config as never }).spec : spec;
  const view = new vega.View(vega.parse(vgSpec, isVL ? undefined : config), { renderer: "none", loader, logger: quietLogger });
  const svg = await view.toSVG();
  view.finalize();
  // AGATE_PREVIEW=/some/dir npm test writes every fixture's SVG there, for eyeballing.
  const out = env.AGATE_PREVIEW;
  if (out) writeFileSync(join(out, name.replace(/\.json$/, ".svg")), svg);
  return svg;
}

/** Specs whose layout needs a real canvas to measure text (none at the moment). */
const CANVAS_ONLY = new Set<string>();

const fixtures = readdirSync(chartsDir).filter((f) => f.endsWith(".json")).sort();

describe("fixture specs render headlessly with D4 rows", () => {
  for (const name of fixtures) {
    it(name, async () => {
      warnings.length = 0;
      // Round every number to one decimal: force layouts and map projections run thousands of
      // float steps, and Node builds differ in the last bit (laptop vs CI). Sub-pixel noise is not a change.
      const svg = (await renderFixture(name)).replace(/-?\d+\.\d+(e-?\d+)?/g, (n) => {
        const r = Math.round(Number(n) * 10) / 10;
        return Object.is(r, -0) ? "0" : String(r);
      });
      const shapes = (svg.match(/<(path|rect|circle|line)\b/g) ?? []).length;
      expect(shapes).toBeGreaterThan(0);
      // Rows were injected before the first run, so no empty-extent warnings may appear.
      expect(warnings.filter((w) => /Infinite extent/.test(w))).toEqual([]);
      // No Vega errors, except layouts that need a real canvas to measure text.
      if (!CANVAS_ONLY.has(name)) expect(warnings.filter((w) => w.startsWith("ERROR"))).toEqual([]);
      if (name.startsWith("vault-")) {
        // Charts of the whole test vault change with every file added to the repo; check structure, not bytes.
        expect((svg.match(/<path\b/g) ?? []).length).toBeGreaterThan(50);
      } else if (svg.length > 50_000) {
        const hash = createHash("sha256").update(svg).digest("hex").slice(0, 16);
        expect({ hash, shapes }).toMatchSnapshot();
      } else {
        expect(svg).toMatchSnapshot();
      }
    });
  }
});
