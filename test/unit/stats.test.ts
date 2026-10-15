import { describe, expect, it } from "vitest";
import { changeOf, computeStats, firstMarkData, isStatsSpec } from "../../src/core/stats";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { AnySpec } from "../../src/core/types";
import { vaultDir, vaultRows } from "../fixtures/vault";

const spec = {
  usermeta: { agate: { output: "stats" } },
  data: { name: "base", values: [{ note: { rating: 4 } }, { note: { rating: 2 } }, { note: { rating: 5 } }] },
  transform: [
    // Vega-Lite's aggregate reads "note.rating" as a flat field name; copy nested fields out first.
    { calculate: "datum.note.rating", as: "rating" },
    { aggregate: [{ op: "count", as: "n" }, { op: "mean", field: "rating", as: "avg" }] },
    { fold: ["n", "avg"], as: ["key", "raw"] },
    { calculate: "datum.key === 'n' ? 'books' : 'mean rating'", as: "label" },
    { calculate: "datum.key === 'n' ? format(datum.raw, 'd') : format(datum.raw, '.1f')", as: "value" },
  ],
  mark: "text",
  encoding: { text: { field: "value" } },
} as unknown as AnySpec;

describe("stats output (experimental)", () => {
  it("is opted into with usermeta.agate.output", () => {
    expect(isStatsSpec(spec)).toBe(true);
    expect(isStatsSpec({ mark: "text" })).toBe(false);
  });

  it("gives a change its direction (no + next to the up arrow) and judges it, down being good when the row says so", () => {
    expect(changeOf(0.4, undefined)).toEqual({ change: "0.4", direction: "up", good: true });
    expect(changeOf(-3, undefined)).toEqual({ change: "−3", direction: "down", good: false });
    expect(changeOf(-3, "down")).toEqual({ change: "−3", direction: "down", good: true });
    expect(changeOf(0, undefined)).toEqual({ change: "±0", direction: "flat" });
    expect(changeOf("+12%", undefined)).toEqual({ change: "12%", direction: "up", good: true });
    expect(changeOf("-5%", undefined)).toEqual({ change: "-5%", direction: "down", good: false });
    expect(changeOf(null, undefined)).toEqual({});
  });

  it("finds the dataset behind the first mark, inside groups too", () => {
    expect(firstMarkData({ marks: [{ type: "group", marks: [{ type: "text", from: { data: "x" } }] }] })).toBe("x");
  });

  it("computes the test vault's book stats (tests/Surfaces/13 Stats)", async () => {
    const raw = JSON.parse(readFileSync(join(vaultDir, "tests/charts/stats-row-html.vl.json"), "utf8")) as AnySpec;
    const books = vaultRows((p) => p.startsWith("tests/Library/") && p.endsWith(".md") && /^\s*- book$/m.test(readFileSync(join(vaultDir, p), "utf8")));
    const spec = { ...raw, data: { name: "base", values: books } };
    expect(await computeStats(spec, "vega-lite", {})).toEqual([
      { value: "15", label: "books" },
      { value: "4.0", label: "mean rating" },
      { value: "4,918", label: "pages" },
      { value: "2020", label: "newest" },
    ]);
  });

  it("computes the stats with their changes (tests/Surfaces/13 Stats, section 3)", async () => {
    const raw = JSON.parse(readFileSync(join(vaultDir, "tests/charts/stats-change.vl.json"), "utf8")) as AnySpec;
    const books = vaultRows((p) => p.startsWith("tests/Library/") && p.endsWith(".md") && /^\s*- book$/m.test(readFileSync(join(vaultDir, p), "utf8")));
    const stats = await computeStats({ ...raw, data: { name: "base", values: books } }, "vega-lite", {});
    expect(stats.map((s) => [s.label, s.value, s.change, s.good])).toMatchSnapshot();
    expect(stats[2].good).toBe(stats[2].direction === "down");
  });

  it("aggregates in Vega and returns value/label rows", async () => {
    expect(await computeStats(spec, "vega-lite", {})).toEqual([
      { value: "3", label: "books" },
      { value: "3.7", label: "mean rating" },
    ]);
  });
});
