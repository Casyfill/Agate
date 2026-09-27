import { describe, expect, it } from "vitest";
import { resolveChartOptions } from "../../src/core/options";

const defaults = { theme: "obsidian", renderer: "svg" as const, actions: false, interactive: true, datasetName: "base" };
const themes = ["obsidian", "quartz", "dark"];

describe("resolveChartOptions (D11 precedence)", () => {
  it("returns vault defaults when nothing is set per chart", () => {
    expect(resolveChartOptions({}, defaults, themes)).toEqual({
      theme: "obsidian",
      renderer: "svg",
      actions: false,
      interactive: true,
      dataset: "base",
    });
  });

  it("lets per-chart options win", () => {
    expect(
      resolveChartOptions(
        { theme: "quartz", renderer: "canvas", actions: true, interactive: false, dataset: " rows " },
        defaults,
        themes,
      ),
    ).toEqual({ theme: "quartz", renderer: "canvas", actions: true, interactive: false, dataset: "rows" });
  });

  it("falls back for unknown themes, bad renderers and blank dataset names", () => {
    const r = resolveChartOptions(
      { theme: "nope", renderer: "webgl" as unknown as "svg", dataset: "  " },
      defaults,
      themes,
    );
    expect(r.theme).toBe("obsidian");
    expect(r.renderer).toBe("svg");
    expect(r.dataset).toBe("base");
  });

  it("treats false as a value, not as unset", () => {
    expect(resolveChartOptions({ interactive: false }, defaults, themes).interactive).toBe(false);
    expect(resolveChartOptions({ actions: false }, { ...defaults, actions: true }, themes).actions).toBe(false);
  });
});
