import { describe, expect, it } from "vitest";
import { parse } from "vega";
import { compile, type TopLevelSpec } from "vega-lite";
import { specForEditor, stripInlined } from "../../src/core/editor";
import { checkPastedSpec } from "../../src/core/paste";

const rows = [{ note: { n: 1 } }, { note: { n: 2 } }, { note: { n: 3 } }];
const vl = { $schema: "https://vega.github.io/schema/vega-lite/v6.json", data: { name: "base" }, mark: "point", encoding: { x: { field: "note.n", type: "quantitative" } } };

describe("specForEditor", () => {
  it("writes Vega-Lite rows as top-level datasets, capped, and the editor can compile it", () => {
    const { spec, truncated } = specForEditor(vl, "vega-lite", { base: rows, edges: [] }, 2);
    expect(spec.datasets).toEqual({ base: rows.slice(0, 2), edges: [] });
    expect(truncated).toEqual(["base"]);
    expect(spec.usermeta).toEqual({ agate: { inlined: ["base", "edges"] } });
    expect(spec.data).toEqual({ name: "base" });
    const vg = compile(spec as unknown as TopLevelSpec).spec;
    expect(() => parse(vg)).not.toThrow();
    expect(vl).not.toHaveProperty("datasets"); // input untouched
  });

  it("fills a Vega spec's named data entries", () => {
    const vg = { $schema: "https://vega.github.io/schema/vega/v6.json", data: [{ name: "base" }], marks: [] };
    const { spec } = specForEditor(vg, "vega", { base: rows });
    expect((spec.data as Array<Record<string, unknown>>)[0].values).toEqual(rows);
  });
});

describe("stripInlined", () => {
  it("round-trips: what Paste spec saves is the spec before copying", () => {
    const withMeta = { ...vl, usermeta: { agate: { open: "click" } } };
    const { spec } = specForEditor(withMeta, "vega-lite", { base: rows });
    expect(stripInlined(JSON.parse(JSON.stringify(spec)))).toEqual(withMeta);
    const vg = { data: [{ name: "base" }, { name: "own", values: [1] }], marks: [] };
    expect(stripInlined(JSON.parse(JSON.stringify(specForEditor(vg, "vega", { base: rows }).spec)))).toEqual(vg);
  });

  it("leaves a spec's own datasets and values alone", () => {
    const own = { ...vl, datasets: { lookup: [1] }, usermeta: { agate: { inlined: ["base"] } } };
    expect(stripInlined(own)).toEqual({ ...vl, datasets: { lookup: [1] } });
  });

  it("drops the base's rows even when the marker was lost", () => {
    const { spec } = specForEditor(vl, "vega-lite", { base: rows });
    delete (spec as Record<string, unknown>).usermeta;
    expect(stripInlined(spec, "base")).toEqual(vl);
    const vg = { data: [{ name: "base", values: rows }, { name: "own", values: [1] }], marks: [] };
    expect(stripInlined(vg, "base")).toEqual({ data: [{ name: "base" }, { name: "own", values: [1] }], marks: [] });
  });

  it("is applied by Paste spec, so the pasted spec reads the base without warnings", () => {
    const text = JSON.stringify(specForEditor(vl, "vega-lite", { base: rows }).spec);
    const check = checkPastedSpec({ text, propertyIds: ["note.n"], datasetName: "base" });
    expect(check.errors).toEqual([]);
    expect(check.warnings).toEqual([]);
    expect(check.spec).toEqual(vl);
  });
});
