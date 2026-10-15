// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { builtinThemes, composeConfig, instrumentTheme, materialize, obsidianTheme, themeColors } from "../../src/core/theme";

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

  it("derives the instrument theme from the Obsidian theme: monospace, ink marks, accent brushes", () => {
    document.body.style.setProperty("--font-monospace", "JetBrains Mono");
    document.body.style.setProperty("--text-normal", "rgb(236, 239, 244)");
    document.body.style.setProperty("--color-accent", "rgb(191, 97, 106)");
    const cfg = instrumentTheme() as { font: string; mark: { color: string }; axis: { domain: boolean }; range: { category: string[] }; selection: { interval: { mark: { fill: string } } } };
    expect(builtinThemes().has("instrument")).toBe(true);
    expect(cfg.font).toBe("JetBrains Mono");
    expect(cfg.mark.color).toBe("rgb(236, 239, 244)");
    expect(cfg.axis.domain).toBe(false);
    expect(cfg.range.category[0]).toBe("rgb(236, 239, 244)");
    expect(cfg.selection.interval.mark.fill).toBe("rgb(191, 97, 106)");
  });

  it("does not repeat the accent in the category palette when it is one of the named colours", () => {
    document.body.style.setProperty("--color-accent", "rgb(191, 97, 106)");
    document.body.style.setProperty("--color-red", "rgb(191, 97, 106)");
    const { range } = obsidianTheme() as { range: { category: string[] } };
    expect(range.category.filter((x) => x === "rgb(191, 97, 106)")).toHaveLength(1);
  });

  it("exposes the theme colours by role for the agateColors signal", () => {
    document.body.style.setProperty("--background-primary", "rgb(30, 30, 46)");
    document.body.style.setProperty("--color-yellow", "rgb(249, 226, 175)");
    expect(themeColors()).toMatchObject({ background: "rgb(30, 30, 46)", yellow: "rgb(249, 226, 175)", blue: "#086ddd" });
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
