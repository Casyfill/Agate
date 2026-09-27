import { describe, expect, it } from "vitest";
import { parseYaml, stringifyYaml } from "obsidian";
import { synthesizeBaseConfig } from "../../src/core/synthesize";

const baseConfig = parseYaml(`
filters:
  and:
    - file.hasTag("book")
formulas:
  age: today().year - published.year
properties:
  note.rating: { displayName: Rating }
summaries:
  avg: values.mean()
views:
  - type: table
    name: Table
    filters:
      and: [ "rating > 3" ]
    order: [file.name, rating]
    sort: [{ property: rating, direction: DESC }]
    groupBy: { property: genre, direction: ASC }
    limit: 10
    summaries: { rating: Average }
  - type: agate
    name: Chart
    specFile: charts/x.vl.json
`) as Record<string, unknown>;

describe("synthesizeBaseConfig (D3 Surface B → A)", () => {
  it("carries the base's global sections and adds one agate view with the spec file", () => {
    const out = synthesizeBaseConfig({
      baseConfig,
      baseName: "Books",
      envelope: { spec: "charts/a.vl.json" },
      resolvedSpecPath: "charts/a.vl.json",
      viewType: "agate",
    });
    expect(Object.keys(out).sort()).toEqual(["filters", "formulas", "properties", "summaries", "views"]);
    expect(out.views).toEqual([{ type: "agate", name: "Agate (Books)", specFile: "charts/a.vl.json" }]);
  });

  it("copies view-level query keys from the named view, not its type or spec", () => {
    const out = synthesizeBaseConfig({
      baseConfig,
      baseName: "Books",
      envelope: { spec: { mark: "bar" }, view: "Table", theme: "quartz", interactive: false },
      viewType: "agate",
    });
    const view = (out.views as Array<Record<string, unknown>>)[0];
    expect(view).toEqual({
      type: "agate",
      name: "Agate (Books)",
      filters: { and: ["rating > 3"] },
      order: ["file.name", "rating"],
      groupBy: { property: "genre", direction: "ASC" },
      limit: 10,
      sort: [{ property: "rating", direction: "DESC" }],
      summaries: { rating: "Average" },
      spec: { mark: "bar" },
      theme: "quartz",
      interactive: false,
    });
  });

  it("fails clearly on a missing view, missing spec file, or no spec", () => {
    const common = { baseConfig, baseName: "Books", viewType: "agate" };
    expect(() => synthesizeBaseConfig({ ...common, envelope: { spec: { mark: "bar" }, view: "Nope" } })).toThrow(
      /View "Nope" not found. Views: Table, Chart/,
    );
    expect(() =>
      synthesizeBaseConfig({ ...common, envelope: { spec: "missing.json" }, resolvedSpecPath: null }),
    ).toThrow(/Spec file not found: missing.json/);
    expect(() => synthesizeBaseConfig({ ...common, envelope: { base: "x" } })).toThrow(/needs a spec/);
  });

  it("round-trips through YAML as a ```base block would", () => {
    const out = synthesizeBaseConfig({
      baseConfig,
      baseName: "Books",
      envelope: { spec: { mark: "bar", encoding: { x: { field: "note.rating" } } } },
      viewType: "agate",
    });
    const yaml = stringifyYaml(out);
    expect(parseYaml(yaml)).toEqual(out);
    expect(yaml).toContain("type: agate");
  });
});
