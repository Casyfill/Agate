// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { EINK_TONES, autoTheme, builtinThemes, composeConfig, distinct, einkTheme, instrumentTheme, materialize, obsidianTheme, themeColors } from "../../src/core/theme";

describe("themes (D5, D11)", () => {
  it("ships the dynamic obsidian theme plus vega-themes, without the version export", () => {
    const names = [...builtinThemes().keys()];
    expect(names[0]).toBe("auto");
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

  it("drops near-identical colours, not only exact repeats (the default accent vs its purple)", () => {
    expect(distinct(["hsl(258, 88%, 66%)", "#7852ee", "#086ddd"])).toEqual(["hsl(258, 88%, 66%)", "#086ddd"]);
    expect(distinct(["#e93147", "#e93147", "var(--x)", "var(--x)"])).toEqual(["#e93147", "var(--x)"]);
  });

  it("auto keeps the obsidian chrome and swaps in the palette made for the active theme", () => {
    document.body.style.setProperty("--text-normal", "rgb(1, 2, 3)");
    const nord = autoTheme(() => ({ name: "Nord", classes: [], dark: true })) as { axis: { titleColor: string }; mark: { color: string }; range: { category: string[] } };
    expect(nord.axis.titleColor).toBe("rgb(1, 2, 3)");
    expect(nord.range.category[0]).toBe("#88c0d0");
    expect(nord.mark.color).toBe("#88c0d0");

    const seen: string[] = [];
    autoTheme(() => ({ name: "", classes: [], dark: false }), (p) => seen.push(p.variant));
    expect(seen).toEqual(["default-light"]);
  });

  it("eink draws in ink on paper: tones from the theme's text toward its background, outlines, shapes", () => {
    document.body.style.setProperty("--text-normal", "#000000");
    document.body.style.setProperty("--background-primary", "#ffffff");
    type E = { axis: { labelColor: string; gridColor: string }; bar: { stroke: string }; mark: { opacity: number }; range: { category: string[]; symbol: string[]; heatmap: string[] } };
    const cfg = einkTheme() as E;
    expect(cfg.range.category).toEqual(["#000000", "#999999", "#4d4d4d", "#cccccc"]);
    expect(cfg.range.category).toHaveLength(EINK_TONES.length);
    expect(cfg.axis.labelColor).toBe("#000000");
    expect(cfg.bar.stroke).toBe("#000000");
    expect(cfg.mark.opacity).toBe(1);
    expect(new Set(cfg.range.symbol).size).toBe(cfg.range.symbol.length);
    expect(cfg.range.heatmap.at(-1)).toBe("#000000");

    // Dark e-ink (or any theme): light ink on dark paper.
    document.body.style.setProperty("--text-normal", "rgb(230, 230, 230)");
    document.body.style.setProperty("--background-primary", "#111111");
    expect((einkTheme() as E).range.category[0]).toBe("#e6e6e6");

    // auto hands Ink the whole eink theme, not just a palette.
    const auto = autoTheme(() => ({ name: "Ink", classes: [], dark: false })) as E;
    expect(auto.bar.stroke).toBe("#e6e6e6");
    expect(builtinThemes().has("eink")).toBe(true);
  });

  it("auto reads light/dark from the body class by default", () => {
    document.body.classList.add("theme-dark");
    document.body.style.setProperty("--color-accent", "hsl(258, 88%, 66%)");
    const cfg = materialize(builtinThemes().get("auto")) as { range: { category: string[] } };
    expect(cfg.range.category[0]).toBe("#9084dd");
    // A red accent leads with the palette's red, keeping the rest of the cycle.
    document.body.style.setProperty("--color-accent", "rgb(191, 97, 106)");
    expect((materialize(builtinThemes().get("auto")) as { range: { category: string[] } }).range.category[0]).toBe("#e47b7b");
    document.body.classList.remove("theme-dark");
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
