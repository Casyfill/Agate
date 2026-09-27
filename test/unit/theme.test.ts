// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { builtinThemes, composeConfig, materialize, obsidianTheme } from "../../src/core/theme";

describe("themes (D5, D11)", () => {
  it("ships the dynamic obsidian theme plus vega-themes, without the version export", () => {
    const names = [...builtinThemes().keys()];
    expect(names).toContain("obsidian");
    expect(names).toContain("quartz");
    expect(names).toContain("dark");
    expect(names).not.toContain("version");
  });

  it("derives the obsidian theme from CSS variables at call time", () => {
    document.body.style.setProperty("--text-normal", "rgb(1, 2, 3)");
    document.body.style.setProperty("--color-accent", "rgb(9, 8, 7)");
    const cfg = obsidianTheme() as { axis: { titleColor: string }; mark: { color: string }; range: { category: string[] } };
    expect(cfg.axis.titleColor).toBe("rgb(1, 2, 3)");
    expect(cfg.mark.color).toBe("rgb(9, 8, 7)");
    expect(cfg.range.category[0]).toBe("rgb(9, 8, 7)");

    document.body.style.setProperty("--color-accent", "rgb(4, 4, 4)");
    expect((obsidianTheme() as { mark: { color: string } }).mark.color).toBe("rgb(4, 4, 4)");
  });

  it("falls back to defaults when a variable is missing", () => {
    document.body.style.removeProperty("--text-muted");
    const cfg = obsidianTheme() as { axis: { labelColor: string } };
    expect(cfg.axis.labelColor).toBe("#777");
  });

  it("materializes functions and merges overrides in order", () => {
    expect(materialize(undefined)).toEqual({});
    expect(materialize(() => ({ background: "red" }))).toEqual({ background: "red" });
    const merged = composeConfig(
      { background: "a", axis: { labelColor: "x", titleColor: "y" } },
      { axis: { labelColor: "z" } },
      undefined,
      { background: "b" },
    );
    expect(merged).toMatchObject({ background: "b", axis: { labelColor: "z", titleColor: "y" } });
  });
});
