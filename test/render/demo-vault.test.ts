/**
 * Every chart in demo-vault/charts renders headlessly against the demo vault's own notes, the
 * way its base would hand them over: rows filtered by `type`, per-row data read from the vault,
 * links and the folder tree computed from the files. No snapshots: the demo vault is generated
 * and meant to change; the test guards against broken specs.
 *
 * AGATE_PREVIEW=/some/dir writes each chart's SVG there (AGATE_PREVIEW_DARK=1 for a dark config).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { env } from "node:process";
import * as vega from "vega";
import * as vl from "vega-lite";
import { describe, expect, it } from "vitest";
import { expandRowData, rowDataDefs } from "../../src/core/data/rowdata";
import { cellsDatasetName, tableCells } from "../../src/core/data/table";
import { edgesDatasetName, linkEdges, pathTree, treeDatasetName } from "../../src/core/data/structure";
import { ensureNamedData, withInitialValues, withSignalValues } from "../../src/core/spec";
import type { AnySpec, Row } from "../../src/core/types";
import { vaultDir, vaultResolvedLinks, vaultRows } from "../fixtures/vault";

const chartsDir = join(vaultDir, "charts");
const ofType = (...types: string[]) => (): Row[] =>
  vaultRows((p) => p.endsWith(".md"), undefined, vaultDir).filter((r) => types.includes(String((r.note as { type?: unknown }).type)));

/** Which notes each chart's base selects, and the visible properties for table layouts. */
const ROWS: Record<string, () => Row[]> = {
  "hike-dashboard.vl.json": ofType("hike-day"),
  "travel-globe.vg.json": ofType("trip", "place"),
  "countries-visited.vl.json": ofType("trip", "place"),
  "boardgame-collection.vl.json": ofType("boardgame", "play"),
  "boardgame-plays.vl.json": ofType("boardgame", "play"),
  "project-gantt.vl.json": ofType("project"),
  "meetings-heatmap.vl.json": ofType("meeting"),
  "people-graph.vg.json": ofType("meeting", "person", "project"),
  "habit-grid.vl.json": ofType("journal"),
  "mood-beeswarm.vg.json": ofType("journal"),
  "reading-journey.vg.json": ofType("book"),
  "campaign-1812.vg.json": ofType("battle"),
  "vault-sunburst.vg.json": () => vaultRows((p) => p.startsWith("notes/"), undefined, vaultDir),
};

const previewDark = {
  background: "#1e1e1e",
  axis: { labelColor: "#b3b3b3", titleColor: "#dadada", domainColor: "#444", tickColor: "#444", gridColor: "#333" },
  legend: { labelColor: "#b3b3b3", titleColor: "#dadada" },
  view: { stroke: "transparent" },
  style: { "guide-label": { fill: "#b3b3b3" }, "guide-title": { fill: "#dadada" }, text: { fill: "#dadada" } },
  mark: { color: "#a68af9" },
  text: { color: "#dadada" },
  range: { category: ["#a68af9", "#027aff", "#44cf6e", "#e9973f", "#fb464c", "#7852ee", "#00bfbc", "#e0ac00", "#d53984"] },
};

const loader = vega.loader();
loader.load = async (uri: string) => readFileSync(join(vaultDir, uri), "utf8");

async function render(name: string, rows: Row[]): Promise<{ svg: string; errors: string[] }> {
  const raw = JSON.parse(readFileSync(join(chartsDir, name), "utf8")) as AnySpec;
  const isVL = typeof raw.$schema === "string" && /vega-lite/.test(raw.$schema);
  const mode = isVL ? "vega-lite" : "vega";
  const datasets: Record<string, Row[]> = { base: rows };
  for (const def of rowDataDefs(raw)) {
    const { records, errors } = await expandRowData(rows, def, { load: async (u) => readFileSync(join(vaultDir, u), "utf8") });
    expect(errors).toEqual([]);
    datasets[def.name] = records;
  }
  const cells = cellsDatasetName(raw);
  if (cells) datasets[cells] = tableCells(rows, ["file.name"], (id) => id);
  const edges = edgesDatasetName(raw);
  if (edges) datasets[edges] = linkEdges(rows, vaultResolvedLinks(rows, vaultDir));
  const tree = treeDatasetName(raw);
  if (tree) datasets[tree] = pathTree(rows, "demo-vault");

  const dark = env.AGATE_PREVIEW_DARK === "1";
  let spec = withSignalValues(raw, mode, { agateDark: dark });
  for (const [n, values] of Object.entries(datasets)) {
    spec = ensureNamedData(spec, mode, n);
    spec = withInitialValues(spec, mode, n, values);
  }
  if (spec.width === "container") spec = { ...spec, width: 600 };

  const errors: string[] = [];
  const logger = {
    level() {
      return this;
    },
    warn(...a: unknown[]) {
      if (a.join(" ").includes("Infinite extent")) errors.push(a.join(" "));
      return this;
    },
    info() {
      return this;
    },
    debug() {
      return this;
    },
    error(...a: unknown[]) {
      errors.push(a.map(String).join(" "));
      return this;
    },
  };
  const config = dark ? previewDark : undefined;
  const vg = isVL ? vl.compile(spec as never, { logger, config: config as never }).spec : spec;
  const view = new vega.View(vega.parse(vg, isVL ? undefined : (config as never)), { renderer: "none", loader, logger });
  const svg = await view.toSVG();
  view.finalize();
  if (env.AGATE_PREVIEW) writeFileSync(join(env.AGATE_PREVIEW, `demo-${name.replace(/\.json$/, ".svg")}`), svg);
  return { svg, errors };
}

const charts = readdirSync(chartsDir).filter((f) => f.endsWith(".json")).sort();

describe("demo vault charts", () => {
  it("every chart has a row selection here", () => {
    expect(charts.filter((c) => !(c in ROWS))).toEqual([]);
  });

  for (const name of charts) {
    it(name, async () => {
      const rows = ROWS[name]?.() ?? [];
      expect(rows.length).toBeGreaterThan(0);
      const { svg, errors } = await render(name, rows);
      expect(errors).toEqual([]);
      expect((svg.match(/<(path|rect|line|text)\b/g) ?? []).length).toBeGreaterThan(20);
    });
  }
});
