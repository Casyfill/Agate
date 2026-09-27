import { describe, expect, it } from "vitest";
import { FakeApp } from "obsidian";
import {
  declaredDatasetNames,
  detectMode,
  ensureNamedData,
  isBareSpec,
  loadSpecFile,
  parseBlock,
  parseJsonOrYaml,
  referencedProperties,
  resolveVaultFile,
  withInitialValues,
} from "../../src/core/spec";

describe("parseJsonOrYaml", () => {
  it("parses JSON, including tab-indented JSON that YAML would reject", () => {
    expect(parseJsonOrYaml('{\n\t"a": 1\n}')).toEqual({ a: 1 });
  });
  it("parses YAML", () => {
    expect(parseJsonOrYaml("a: 1\nb: [x, y]")).toEqual({ a: 1, b: ["x", "y"] });
  });
  it("falls back to YAML for JSON-ish input with comments", () => {
    expect(parseJsonOrYaml("{a: 1} # trailing comment")).toEqual({ a: 1 });
  });
  it("returns undefined for blank input", () => {
    expect(parseJsonOrYaml("   \n")).toBeUndefined();
  });
});

describe("isBareSpec / parseBlock", () => {
  it("treats a document with a spec marker as a spec", () => {
    expect(isBareSpec({ mark: "bar" })).toBe(true);
    expect(isBareSpec({ $schema: "x" })).toBe(true);
    expect(isBareSpec({ marks: [] })).toBe(true);
  });
  it("treats envelope keys as an envelope", () => {
    expect(isBareSpec({ spec: "a.json", base: "b.base" })).toBe(false);
    expect(isBareSpec({ spec: { mark: "bar" } })).toBe(false);
  });
  it("wraps a bare spec into { spec }", () => {
    const env = parseBlock('{"mark": "bar", "encoding": {}}');
    expect(env.spec).toEqual({ mark: "bar", encoding: {} });
    expect(env.base).toBeUndefined();
  });
  it("keeps an envelope as is and forces mode for aliases", () => {
    const env = parseBlock("spec: charts/a.vl.json\nbase: Lib/B.base\ntheme: quartz", "vega");
    expect(env).toMatchObject({ spec: "charts/a.vl.json", base: "Lib/B.base", theme: "quartz", mode: "vega" });
  });
  it("rejects empty and non-object blocks", () => {
    expect(() => parseBlock("")).toThrow(/Empty block/);
    expect(() => parseBlock("- a\n- b")).toThrow(/mapping/);
  });
});

describe("detectMode", () => {
  it("uses $schema first", () => {
    expect(detectMode({ $schema: "https://vega.github.io/schema/vega-lite/v6.json", marks: [] })).toBe("vega-lite");
    expect(detectMode({ $schema: "https://vega.github.io/schema/vega/v6.json", mark: "bar" })).toBe("vega");
  });
  it("then the explicit mode, then structure, defaulting to Vega-Lite", () => {
    expect(detectMode({ marks: [] }, "vega-lite")).toBe("vega-lite");
    expect(detectMode({ marks: [], scales: [] })).toBe("vega");
    expect(detectMode({ mark: "bar" })).toBe("vega-lite");
    expect(detectMode({})).toBe("vega-lite");
  });
});

describe("dataset helpers", () => {
  it("adds a named data source when the spec has none", () => {
    expect(ensureNamedData({ mark: "bar" }, "vega-lite", "base")).toEqual({ mark: "bar", data: { name: "base" } });
    expect(ensureNamedData({ marks: [] }, "vega", "base")).toEqual({ marks: [], data: [{ name: "base" }] });
  });
  it("leaves declared data alone", () => {
    const vl = { data: { url: "x.csv" }, mark: "bar" };
    expect(ensureNamedData(vl, "vega-lite", "base")).toBe(vl);
    const vg = { data: [{ name: "base" }, { name: "other" }] };
    expect(ensureNamedData(vg, "vega", "base")).toBe(vg);
  });
  it("inlines initial rows only into the empty named dataset", () => {
    const rows = [{ a: 1 }];
    expect(withInitialValues({ data: { name: "base" } }, "vega-lite", "base", rows)).toEqual({
      data: { name: "base", values: rows },
    });
    const withUrl = { data: { name: "base", url: "x.csv" } };
    expect(withInitialValues(withUrl, "vega-lite", "base", rows)).toBe(withUrl);
    expect(
      withInitialValues({ data: [{ name: "base" }, { name: "d", source: "base" }] }, "vega", "base", rows).data,
    ).toEqual([{ name: "base", values: rows }, { name: "d", source: "base" }]);
  });
  it("lists declared dataset names", () => {
    expect(declaredDatasetNames({ data: { name: "base" } }, "vega-lite")).toEqual(["base"]);
    expect(declaredDatasetNames({ data: [{ name: "a" }, { url: "x" }, { name: "b" }] }, "vega")).toEqual(["a", "b"]);
    expect(declaredDatasetNames({}, "vega-lite")).toEqual([]);
  });
});

describe("referencedProperties", () => {
  it("finds field strings and datum expressions anywhere in the spec", () => {
    const spec = {
      transform: [
        { filter: "isValid(datum.note.rating) && datum.formula.age > 1" },
        { calculate: "year(toDate(datum.note.published))", as: "y" },
      ],
      encoding: {
        x: { field: "note.pages" },
        tooltip: [{ field: "file.name" }, { field: "y" }],
      },
      layer: [{ encoding: { color: { field: "note.genre" } } }],
    };
    expect(referencedProperties(spec).sort()).toEqual(
      ["file.name", "formula.age", "note.genre", "note.pages", "note.published", "note.rating"].sort(),
    );
  });
  it("ignores unrelated strings", () => {
    expect(referencedProperties({ mark: "bar", title: "note.taking is fun", x: "file.csv here" })).toEqual([]);
  });
});

describe("vault resolution", () => {
  const app = new FakeApp({
    "charts/a.vl.json": '{"mark": "bar"}',
    "charts/bad.json": "[1, 2]",
    "Notes/Sub/b.md": "",
  });

  it("resolves by exact path, link path, and relative to the source note", () => {
    expect(resolveVaultFile(app, "charts/a.vl.json", null)?.path).toBe("charts/a.vl.json");
    expect(resolveVaultFile(app, "[[charts/a.vl.json]]", "Notes/x.md")?.path).toBe("charts/a.vl.json");
    expect(resolveVaultFile(app, "Sub/b.md", "Notes/x.md")?.path).toBe("Notes/Sub/b.md");
    expect(resolveVaultFile(app, "nope.json", null)).toBeNull();
  });

  it("loads and validates a spec file", async () => {
    await expect(loadSpecFile(app, "charts/a.vl.json", null)).resolves.toEqual({ mark: "bar" });
    await expect(loadSpecFile(app, "charts/bad.json", null)).rejects.toThrow(/not an object/);
    await expect(loadSpecFile(app, "missing.json", null)).rejects.toThrow(/not found/);
  });
});
