import { describe, expect, it } from "vitest";
import {
  candidatesFor,
  exprAccessor,
  fillRecipe,
  inferPropertyTypes,
  missingRoles,
  parseRecipe,
  suggestFileName,
  suggestMapping,
} from "../../src/core/recipes";
import type { Row } from "../../src/core/types";

const raw = {
  $schema: "https://vega.github.io/schema/vega-lite/v6.json",
  usermeta: {
    agate: {
      open: "click",
      recipe: {
        id: "timeline",
        name: "Timeline",
        description: "Notes by date",
        roles: {
          date: { label: "When", types: ["date"], prefer: ["published", "created"] },
          group: { label: "Colour by", types: ["text"], optional: true },
        },
      },
    },
  },
  data: { name: "base" },
  mark: "point",
  transform: [{ filter: "isValid({{date.expr}})" }],
  encoding: {
    x: { field: "{{date}}", type: "temporal", title: "{{date.label}}" },
    color: { field: "{{group}}", type: "nominal" },
    tooltip: [{ field: "file.name" }, { field: "{{group}}" }],
  },
};

const rows: Row[] = [
  { file: { name: "A" }, note: { published: "2020-01-02", created: "2021-03-04T10:00", genre: "x", pages: 3, tags: ["a"], up: "[[B]]" } },
  { file: { name: "B" }, note: { published: "2019-05-06", genre: "y", pages: 7, tags: [], up: null } },
];

describe("recipes (D13)", () => {
  const recipe = parseRecipe(raw, "built-in", "fallback")!;

  it("parses roles and strips the recipe metadata from the spec", () => {
    expect(recipe).toMatchObject({ id: "timeline", name: "Timeline", extension: "vl.json" });
    expect(Object.keys(recipe.roles)).toEqual(["date", "group"]);
    expect((recipe.spec.usermeta as { agate: Record<string, unknown> }).agate).toEqual({ open: "click" });
    expect(parseRecipe({ mark: "bar" }, "x", "x")).toBeNull();
    expect(() => parseRecipe({ usermeta: { agate: { recipe: {} } } }, "x.json", "x")).toThrow(/name is required/);
  });

  it("infers property types from values", () => {
    const ids = ["note.published", "note.created", "note.genre", "note.pages", "note.tags", "note.up", "note.none"];
    expect(inferPropertyTypes(rows, ids).map((p) => [p.id, p.type])).toEqual([
      ["note.published", "date"],
      ["note.created", "date"],
      ["note.genre", "text"],
      ["note.pages", "number"],
      ["note.tags", "list"],
      ["note.up", "link"],
      ["note.none", null],
    ]);
  });

  it("suggests preferred names first and leaves optional roles empty", () => {
    const props = inferPropertyTypes(rows, ["note.created", "note.published", "note.genre"]);
    expect(candidatesFor(recipe.roles.date, props).map((p) => p.id)).toEqual(["note.created", "note.published"]);
    expect(suggestMapping(recipe, props)).toEqual({ date: "note.published", group: null });
  });

  it("fills placeholders, quoting property names safely in expressions", () => {
    const spec = fillRecipe(recipe, { date: "note.my date", group: "note.genre" }) as Record<string, any>;
    expect(spec.encoding.x).toEqual({ field: "note.my date", type: "temporal", title: "my date" });
    expect(spec.encoding.color.field).toBe("note.genre");
    expect(spec.transform[0].filter).toBe('isValid(datum["note"]["my date"])');
    expect(spec.usermeta.agate).toEqual({ open: "click", fromRecipe: { id: "timeline", roles: { date: "note.my date", group: "note.genre" } } });
    expect(exprAccessor("formula.age")).toBe('datum["formula"]["age"]');
  });

  it("drops channels of unset optional roles and refuses unset required ones", () => {
    const spec = fillRecipe(recipe, { date: "note.published", group: null }) as Record<string, any>;
    expect(spec.encoding.color).toBeUndefined();
    expect(spec.encoding.tooltip).toEqual([{ field: "file.name" }]);
    expect(missingRoles(recipe, { date: null, group: null })).toEqual(["date"]);
    expect(() => fillRecipe(recipe, { date: null, group: null })).toThrow(/Pick a property for: When/);
  });

  it("names the file after the recipe and the first property", () => {
    expect(suggestFileName(recipe, { date: "note.published", group: null })).toBe("timeline-published.vl.json");
  });
});

describe("chart prompt (D13)", async () => {
  const { buildChartPrompt } = await import("../../src/core/prompt");
  it("lists properties with types and trims sample rows to them", () => {
    const props = inferPropertyTypes(rows, ["note.published", "note.genre"], (id) => (id === "note.genre" ? "Genre" : id));
    const text = buildChartPrompt({ viewName: "Table", datasetName: "base", properties: props, rows });
    expect(text).toContain("- `note.published` (date)");
    expect(text).toContain('- `note.genre` (text), shown as "Genre"');
    expect(text).toContain('{"file":{"name":"A"},"note":{"published":"2020-01-02","genre":"x"}}');
    expect(text).not.toContain("pages");
    expect(text).toContain('"data": {"name": "base"}');
  });

  it("reports the installed versions and the remote-data setting when given", () => {
    const env = { agate: "0.0.3", obsidian: "1.13.7", vega: "6.4.0", vegaLite: "6.4.3", vegaEmbed: "7.3.0", renderer: "svg" as const, allowRemote: false };
    const text = buildChartPrompt({ viewName: "T", datasetName: "base", properties: [], rows: [], env });
    expect(text).toContain("Vega 6.4.0, Vega-Lite 6.4.3 and vega-embed 7.3.0 (svg renderer)");
    expect(text).toContain("Agate 0.0.3 on Obsidian 1.13.7");
    expect(text).toContain("are blocked");
    expect(text).toContain("vega-lite/v6.json");
    expect(buildChartPrompt({ viewName: "T", datasetName: "base", properties: [], rows: [], env: { ...env, allowRemote: true } })).toContain("are allowed");
  });
});
