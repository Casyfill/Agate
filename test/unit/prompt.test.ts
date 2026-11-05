import { describe, expect, it } from "vitest";
import { buildChartPrompt, buildThemePrompt, summarizeProperty } from "../../src/core/prompt";

const base = {
  colors: { text: "#111", background: "#fff", accent: "#7c3aed", blue: "#086ddd" },
  fonts: { interface: "Inter", text: "Georgia", mono: "Menlo", textSize: 16 },
  env: {
    agate: "1.0.0",
    obsidian: "1.13.0",
    vega: "6.2.0",
    vegaLite: "6.5.0",
    vegaEmbed: "7.0.0",
    renderer: "svg" as const,
    allowRemote: false,
  },
};

describe("buildThemePrompt", () => {
  it("includes the palette, fonts and target Vega major version", () => {
    const out = buildThemePrompt(base);
    expect(out).toContain("accent: #7c3aed");
    expect(out).toContain("blue: #086ddd");
    expect(out).toContain('interface "Inter"');
    expect(out).toContain('reading "Georgia"');
    expect(out).toContain("16px");
    expect(out).toContain("Vega v6");
    expect(out).toContain("Reply with the JSON config object only.");
  });

  it("names the configured theme file as the destination", () => {
    const out = buildThemePrompt({ ...base, themeFilePath: "themes/mine.json" });
    expect(out).toContain("themes/mine.json");
  });

  it("defaults the destination when no theme file is set", () => {
    expect(buildThemePrompt(base)).toContain("agate/theme.json");
  });

  it("includes current overrides only when present", () => {
    expect(buildThemePrompt(base)).not.toContain("My current overrides");
    const withOverrides = buildThemePrompt({ ...base, currentOverrides: '{"mark":{"color":"#e93147"}}' });
    expect(withOverrides).toContain("My current overrides");
    expect(withOverrides).toContain('{"mark":{"color":"#e93147"}}');
  });
});

describe("buildChartPrompt", () => {
  const books = {
    viewName: "Table",
    datasetName: "base",
    properties: [{ id: "note.rating", type: "number" as const, label: "Rating" }],
    rows: [{ file: { name: "Dune", path: "Books/Dune.md" }, note: { rating: 5 } }],
    env: base.env,
  };
  const trips = {
    viewName: "Trips",
    datasetName: "trips",
    properties: [{ id: "note.country", type: "text" as const, label: "note.country" }],
    rows: [{ file: { name: "Lisbon", path: "Trips/Lisbon.md" }, note: { country: "PT" } }],
    env: base.env,
  };

  it("runs from fixed text to this base's data and ends on the request", () => {
    const out = buildChartPrompt(books);
    const at = (s: string) => out.indexOf(s);
    expect(at("## How Agate feeds a spec")).toBeGreaterThan(0);
    expect(at("## Rules")).toBeGreaterThan(at("## How Agate feeds a spec"));
    expect(at("## Environment")).toBeGreaterThan(at("## Rules"));
    expect(at("## My data")).toBeGreaterThan(at("## Environment"));
    expect(at("## What I want")).toBeGreaterThan(at("## My data"));
    expect(out.trimEnd().endsWith("interaction>")).toBe(true);
  });

  it("keeps everything before the environment identical across bases", () => {
    const prefix = (s: string) => s.slice(0, s.indexOf("## Environment"));
    expect(prefix(buildChartPrompt(books))).toBe(prefix(buildChartPrompt(trips)));
    expect(prefix(buildChartPrompt(books))).not.toContain("Dune");
  });

  it("names the dataset, properties and sample rows under My data", () => {
    const out = buildChartPrompt(trips);
    const data = out.slice(out.indexOf("## My data"));
    expect(data).toContain('{"data": {"name": "trips"}}');
    expect(data).toContain("`note.country` (text)");
    expect(data).toContain('"Lisbon"');
  });
});

describe("summarizeProperty", () => {
  const rows = [
    { note: { score: 3, domain: "SQL", tags: ["a", "b"], date: "2026-08-01" } },
    { note: { score: 5, domain: "SQL", tags: ["a"], date: "2026-07-01" } },
    { note: { score: 2, domain: "ML", date: "2026-09-01" } },
    { note: { domain: "" } },
  ];
  const sum = (id: string, type: "number" | "text" | "list" | "date") => summarizeProperty({ id, label: id, type }, rows);

  it("gives ranges for numbers and dates", () => {
    expect(sum("note.score", "number")).toBe("2 to 5; empty in 1");
    expect(sum("note.date", "date")).toBe("2026-07-01 to 2026-09-01; empty in 1");
  });
  it("gives most common values for text and list items", () => {
    expect(sum("note.domain", "text")).toBe('2 distinct: "SQL" ×2, "ML" ×1; empty in 1');
    expect(sum("note.tags", "list")).toBe('2 distinct items: "a" ×2, "b" ×1; empty in 2');
  });
});
