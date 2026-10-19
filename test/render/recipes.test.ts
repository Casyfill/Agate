/**
 * Every built-in recipe (D13), filled with properties from test notes, renders headlessly
 * without Vega errors; suggestions cover every required role; leaving optional roles empty
 * still yields a valid chart.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as vega from "vega";
import * as vl from "vega-lite";
import { describe, expect, it } from "vitest";
import { builtinRecipes } from "../../src/recipes";
import { fillRecipe, inferPropertyTypes, missingRoles, parseRecipe, suggestMapping } from "../../src/core/recipes";
import { ensureNamedData, withInitialValues } from "../../src/core/spec";
import { computeStats, isStatsSpec } from "../../src/core/stats";
import { edgesDatasetName, linkEdges, pathTree, treeDatasetName } from "../../src/core/data/structure";
import type { AnySpec, Row } from "../../src/core/types";
import { vaultDir, vaultResolvedLinks, vaultRows } from "../fixtures/vault";

const md = (...folders: string[]) => (p: string) => folders.some((f) => p.startsWith(`tests/${f}/`)) && p.endsWith(".md");
const library = () => vaultRows(md("Library"));
const journal = () => vaultRows(md("Journal"));
const ideas = () => vaultRows(md("Ideas"));
const travel = () => vaultRows(md("Trips", "Places"));

/** Rows and a full mapping per recipe; `sparse` leaves the optional roles empty. */
const CASES: Record<string, { rows: () => Row[]; full: Record<string, string>; sparse?: Record<string, string> }> = {
  timeline: { rows: library, full: { date: "note.published", row: "note.genre" }, sparse: { date: "note.published" } },
  stats: { rows: library, full: { number: "note.pages", date: "note.published", category: "note.genre" }, sparse: {} },
  bars: { rows: library, full: { category: "note.genre", colour: "note.status" }, sparse: { category: "note.genre" } },
  scatter: { rows: library, full: { x: "note.pages", y: "note.rating", colour: "note.genre", size: "note.pages" }, sparse: { x: "note.pages", y: "note.rating" } },
  histogram: { rows: library, full: { value: "note.pages" } },
  line: { rows: journal, full: { date: "note.date", value: "note.mood" } },
  calendar: { rows: journal, full: { date: "note.date" } },
  sunburst: { rows: () => vaultRows((p) => p.startsWith("tests/")), full: {} },
  graph: { rows: ideas, full: { colour: "note.topic" }, sparse: {} },
  arcs: { rows: ideas, full: { date: "note.created", colour: "note.topic" }, sparse: { date: "note.created" } },
  globe: {
    rows: travel,
    full: { lat: "note.lat", lon: "note.lon", from: "note.from", to: "note.to", date: "note.date", group: "note.trip" },
    sparse: { lat: "note.lat", lon: "note.lon", from: "note.from", to: "note.to" },
  },
  sankey: { rows: library, full: { stage1: "note.genre", stage2: "note.status", stage3: "note.rating" } },
  beeswarm: { rows: journal, full: { date: "note.date", row: "note.mood", colour: "note.energy", size: "note.sleep" }, sparse: { date: "note.date", row: "note.mood" } },
};

const loader = vega.loader();
loader.load = async (uri: string) => readFileSync(join(vaultDir, uri), "utf8");

async function render(spec: AnySpec, rows: Row[]): Promise<{ svg: string; errors: string[] }> {
  const errors: string[] = [];
  const logger = {
    level() {
      return this;
    },
    warn() {
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
  const isVL = typeof spec.$schema === "string" && /vega-lite/.test(spec.$schema);
  const mode = isVL ? "vega-lite" : "vega";
  const datasets: Record<string, Row[]> = { base: rows };
  const edges = edgesDatasetName(spec);
  if (edges) datasets[edges] = linkEdges(rows, vaultResolvedLinks(rows));
  const tree = treeDatasetName(spec);
  if (tree) datasets[tree] = pathTree(rows, "demo-vault");
  let s = spec;
  for (const [name, values] of Object.entries(datasets)) {
    s = ensureNamedData(s, mode, name);
    s = withInitialValues(s, mode, name, values);
  }
  const vgSpec = isVL ? vl.compile(s as never, { logger }).spec : s;
  const view = new vega.View(vega.parse(vgSpec), { renderer: "none", loader, logger });
  const svg = await view.toSVG();
  view.finalize();
  return { svg, errors };
}

const recipes = builtinRecipes();

describe("built-in recipes", () => {
  it("are all covered here, with unique ids", () => {
    const ids = recipes.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(Object.keys(CASES).sort());
  });

  for (const recipe of recipes) {
    const c = CASES[recipe.id];
    describe(recipe.id, () => {
      it("suggests a property for every required role", () => {
        if (!c) return;
        const rows = c.rows();
        const ids = [...new Set(rows.flatMap((r) => Object.keys(r.note as object).map((k) => `note.${k}`)))];
        const mapping = suggestMapping(recipe, inferPropertyTypes(rows, ids));
        expect(missingRoles(recipe, mapping)).toEqual([]);
      });

      for (const variant of ["full", "sparse"] as const) {
        const mapping = c?.[variant];
        if (!mapping) continue;
        it(`renders (${variant})`, async () => {
          const roles = Object.fromEntries(Object.keys(recipe.roles).map((k) => [k, mapping[k] ?? null]));
          const spec = fillRecipe(recipe, roles);
          const { svg, errors } = await render(spec, c.rows());
          expect(errors).toEqual([]);
          expect(svg).not.toMatch(/\{\{/);
          // A stats recipe is note text, not a chart; its numbers are checked on their own below.
          if (!isStatsSpec(spec)) expect((svg.match(/<(path|rect|circle|line|text)\b/g) ?? []).length).toBeGreaterThan(5);
        });
      }
    });
  }

  it("stats: the numbers Agate shows, and only the parts that were mapped", async () => {
    const recipe = recipes.find((r) => r.id === "stats")!;
    const rows = library();
    const run = async (m: Record<string, string | null>) => {
      let s = fillRecipe(recipe, { number: null, date: null, category: null, ...m });
      s = withInitialValues(ensureNamedData(s, "vega-lite", "base"), "vega-lite", "base", rows);
      return computeStats(s, "vega-lite", {}, loader);
    };
    const full = await run({ number: "note.pages", date: "note.published", category: "note.genre" });
    expect(full.map((r) => r.label)).toEqual(["notes", "total pages", "latest published", "most common genre"]);
    expect(full[0].value).toBe(String(rows.length));
    const pages = rows.reduce((a, r) => a + (Number((r.note as { pages?: number }).pages) || 0), 0);
    expect(full[1].value).toBe(pages.toLocaleString("en-US"));
    expect((await run({})).map((r) => r.label)).toEqual(["notes"]);
  });

  it("a user recipe from the test vault's recipe folder parses and renders", async () => {
    const raw = JSON.parse(readFileSync(join(vaultDir, "tests/charts/recipes/count-by-decade.vl.json"), "utf8")) as AnySpec;
    const recipe = parseRecipe(raw, "tests/charts/recipes/count-by-decade.vl.json", "x")!;
    expect(recipe.id).toBe("decades");
    const { svg, errors } = await render(fillRecipe(recipe, { date: "note.published", stack: "note.genre" }), library());
    expect(errors).toEqual([]);
    expect(svg).toContain("1960");
  });
});
