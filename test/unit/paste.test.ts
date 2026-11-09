import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkPastedSpec, extractSpecText, pastedFileName } from "../../src/core/paste";

const VL = "https://vega.github.io/schema/vega-lite/v6.json";
const bar = {
  $schema: VL,
  title: "Books by genre",
  data: { name: "base" },
  mark: "bar",
  encoding: { x: { field: "note.genre", type: "nominal" }, y: { aggregate: "count" } },
};
const ids = ["note.genre", "note.rating", "file.name"];
const check = (text: string) => checkPastedSpec({ text, propertyIds: ids, datasetName: "base" });

describe("extractSpecText", () => {
  it("unwraps a ```json fence and drops the prose around it", () => {
    const reply = "Here is your chart:\n\n```json\n{\"mark\": \"bar\"}\n```\n\nLet me know!";
    expect(extractSpecText(reply)).toBe('{"mark": "bar"}');
  });

  it("unwraps a bare ``` fence", () => {
    expect(extractSpecText("```\n{\"a\": 1}\n```")).toBe('{"a": 1}');
  });

  it("takes the outermost braces when there is prose but no fence", () => {
    expect(extractSpecText('Sure! {"a": {"b": 1}} Hope that helps.')).toBe('{"a": {"b": 1}}');
  });

  it("leaves plain JSON alone", () => {
    expect(extractSpecText('  {"a": 1}\n')).toBe('{"a": 1}');
  });
});

describe("checkPastedSpec", () => {
  it("accepts a clean Vega-Lite spec for this base", () => {
    const r = check(JSON.stringify(bar));
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
    expect(r.mode).toBe("vega-lite");
  });

  it("accepts a fenced reply", () => {
    expect(check("```json\n" + JSON.stringify(bar, null, 2) + "\n```").errors).toEqual([]);
  });

  it("rejects text that isn't JSON", () => {
    expect(check("I can't help with that.").errors[0]).toMatch(/Not valid JSON|doesn't look like/);
  });

  it("rejects an empty clipboard", () => {
    expect(check("   ").errors[0]).toMatch(/empty/);
  });

  it("rejects JSON that isn't a chart", () => {
    expect(check('{"name": "x", "version": 2}').errors[0]).toMatch(/doesn't look like/);
  });

  it("rejects a spec Vega-Lite can't compile", () => {
    const broken = { ...bar, mark: "barr" };
    expect(check(JSON.stringify(broken)).errors[0]).toMatch(/Vega-Lite rejects it/);
  });

  it("warns about fields this base doesn't have", () => {
    const typo = { ...bar, encoding: { x: { field: "note.genr", type: "nominal" } } };
    const r = check(JSON.stringify(typo));
    expect(r.errors).toEqual([]);
    expect(r.warnings.join(" ")).toContain("note.genr");
  });

  it("doesn't flag file properties Bases always has", () => {
    const withMtime = { ...bar, encoding: { x: { field: "file.mtime", type: "temporal" } } };
    expect(check(JSON.stringify(withMtime)).warnings).toEqual([]);
  });

  it("warns when the spec inlines its own rows", () => {
    const inline = { ...bar, data: { values: [{ a: 1 }] } };
    expect(check(JSON.stringify(inline)).warnings.join(" ")).toMatch(/inlines/);
  });

  it("warns when the spec reads another dataset", () => {
    const other = { ...bar, data: { name: "notes" } };
    expect(check(JSON.stringify(other)).warnings.join(" ")).toMatch(/never reads the "base" dataset/);
  });

  it("is fine with no data at all (Agate injects the base)", () => {
    const { data: _data, ...noData } = bar;
    expect(check(JSON.stringify(noData)).warnings).toEqual([]);
  });

  it("warns, but still accepts, a spec without $schema", () => {
    const { $schema: _s, ...noSchema } = bar;
    const r = check(JSON.stringify(noSchema));
    expect(r.errors).toEqual([]);
    expect(r.warnings[0]).toMatch(/No "\$schema"/);
  });
});

describe("pastedFileName", () => {
  it("slugs the title", () => {
    expect(pastedFileName(bar, "vega-lite")).toBe("books-by-genre.vl.json");
  });

  it("reads a title object and uses .vg.json for Vega", () => {
    expect(pastedFileName({ title: { text: "Reading network" } }, "vega")).toBe("reading-network.vg.json");
  });

  it("falls back to chart", () => {
    expect(pastedFileName({}, "vega-lite")).toBe("chart.vl.json");
  });
});

describe("every demo-vault chart passes the check", () => {
  const dirs = ["demo-vault/charts", "demo-vault/tests/charts"];
  const files = dirs.flatMap((d) =>
    readdirSync(d)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(d, f)),
  );
  it.each(files)("%s", (file) => {
    const r = checkPastedSpec({ text: readFileSync(file, "utf8"), propertyIds: [], datasetName: "base" });
    expect(r.errors).toEqual([]);
  });
});

describe("checkPastedSpec usermeta.agate", () => {
  it("warns on unknown keys", () => {
    const r = check(JSON.stringify({ ...bar, usermeta: { agate: { opne: "click" } } }));
    expect(r.warnings.some((w) => w.includes('"opne"'))).toBe(true);
  });
});
