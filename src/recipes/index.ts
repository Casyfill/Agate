// Built-in recipes (ADR-0001 D13), bundled into main.js. Each file is a Vega or Vega-Lite
// spec with usermeta.agate.recipe and {{role}} placeholders; see src/core/recipes.ts.
import type { AnySpec } from "../core/types";
import { parseRecipe, type Recipe } from "../core/recipes";
import r0 from "./timeline.json";
import r1 from "./bar-by-category.json";
import r2 from "./scatter.json";
import r3 from "./histogram.json";
import r4 from "./line-over-time.json";
import r5 from "./calendar-heatmap.json";
import r6 from "./vault-sunburst.json";
import r7 from "./link-graph.json";
import r8 from "./link-arcs.json";
import r9 from "./travel-globe.json";
import r10 from "./sankey.json";
import r11 from "./beeswarm.json";

const RAW: Array<[string, unknown]> = [
  ["timeline", r0],
  ["bar-by-category", r1],
  ["scatter", r2],
  ["histogram", r3],
  ["line-over-time", r4],
  ["calendar-heatmap", r5],
  ["vault-sunburst", r6],
  ["link-graph", r7],
  ["link-arcs", r8],
  ["travel-globe", r9],
  ["sankey", r10],
  ["beeswarm", r11],
];

/** Built-in recipes in picker order: simple charts first, then the gallery layouts. */
export function builtinRecipes(): Recipe[] {
  return RAW.map(([id, spec]) => parseRecipe(spec as AnySpec, "built-in", id)).filter((r): r is Recipe => r !== null);
}
