import { mergeConfig, type Config } from "vega";
import * as vegaThemes from "vega-themes";
import type { ThemeSource } from "./types";
import { colorDistance, mixColors, parseColor, resolvePalette, type ResolvedPalette, type ThemeContext } from "./palettes";

/**
 * The active Obsidian theme's colours, read from its CSS variables. Specs get them as the
 * `agateColors` signal; the `obsidian` theme below builds its config from them.
 */
export function themeColors(): Record<string, string> {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fallback: string): string => {
    const raw = cs.getPropertyValue(name).trim();
    return raw.length > 0 ? raw : fallback;
  };
  return {
    text: v("--text-normal", "#222"),
    muted: v("--text-muted", "#777"),
    faint: v("--text-faint", "#999"),
    background: v("--background-primary", "#fff"),
    border: v("--background-modifier-border", "#ccc"),
    accent: v("--color-accent", "#7c3aed"),
    red: v("--color-red", "#e93147"),
    orange: v("--color-orange", "#ec7500"),
    yellow: v("--color-yellow", "#e0ac00"),
    green: v("--color-green", "#08b94e"),
    cyan: v("--color-cyan", "#00bfbc"),
    blue: v("--color-blue", "#086ddd"),
    purple: v("--color-purple", "#7852ee"),
    pink: v("--color-pink", "#d53984"),
  };
}

/** The active Obsidian theme's fonts, read from its CSS variables. Used by the theme-generation prompt. */
export function themeFonts(): { interface: string; text: string; mono: string; textSize: number } {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fallback: string): string => {
    const raw = cs.getPropertyValue(name).trim();
    return raw.length > 0 ? raw : fallback;
  };
  return {
    interface: v("--font-interface", "sans-serif"),
    text: v("--font-text", "serif"),
    mono: v("--font-monospace", "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"),
    textSize: parseFloat(cs.getPropertyValue("--font-text-size")) || 16,
  };
}

/**
 * The dynamic `obsidian` theme: a Vega config derived from the CSS variables of the
 * active Obsidian theme at call time, so it follows light/dark and community themes.
 */
export function obsidianTheme(): Config {
  const c = themeColors();
  const { text, muted, faint, border, accent } = c;
  const cs = getComputedStyle(document.body);
  const font = cs.getPropertyValue("--font-interface").trim() || "sans-serif";
  const textSize = parseFloat(cs.getPropertyValue("--font-text-size")) || 16;

  // Obsidian's named colours make a category palette that matches the theme. Many themes use one
  // of them as the accent (Nord's is its red; the default accent is all but its purple), so drop
  // colours too close to one already in, or two categories look the same.
  const category = distinct([accent, c.blue, c.green, c.orange, c.red, c.purple, c.cyan, c.yellow, c.pink]);

  const labelFontSize = Math.round(textSize * 0.7);
  const titleFontSize = Math.round(textSize * 0.8);

  return {
    // Transparent so the chart sits on whatever pane, embed or card holds it.
    background: "transparent",
    font,
    title: { color: text, font, fontSize: Math.round(textSize * 0.95), subtitleColor: muted, anchor: "start" },
    axis: {
      labelColor: muted,
      titleColor: text,
      domainColor: border,
      tickColor: border,
      gridColor: border,
      gridOpacity: 0.6,
      labelFont: font,
      titleFont: font,
      labelFontSize,
      titleFontSize,
    },
    legend: {
      labelColor: muted,
      titleColor: text,
      labelFont: font,
      titleFont: font,
      labelFontSize,
      titleFontSize,
    },
    header: { labelColor: text, titleColor: text, labelFont: font, titleFont: font },
    view: { stroke: "transparent" },
    mark: { color: accent },
    // Vega-Lite gives text marks a black default of their own; follow the theme's text colour instead.
    text: { color: text },
    range: { category },
    style: {
      "guide-label": { fill: muted, font, fontSize: labelFontSize },
      "guide-title": { fill: text, font, fontSize: titleFontSize },
      text: { fill: text, font },
      cell: { stroke: faint, strokeOpacity: 0 },
    },
  } as Config;
}

/**
 * The dynamic `instrument` theme: the `obsidian` theme redrawn as a monochrome readout, after the
 * demo vault's hike dashboard. Monospace type, ink-coloured marks and small filled dots, no axis
 * lines or ticks, dotted grids, y labels inside the plot, axis titles as small corner labels above
 * each plot, and the accent kept for selections. Colours still come from the Obsidian theme.
 */
export function instrumentTheme(): Config {
  const c = themeColors();
  const mono = getComputedStyle(document.body).getPropertyValue("--font-monospace").trim() || "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  const label = { labelFont: mono, labelFontSize: 9, labelColor: c.muted, titleFont: mono, titleFontSize: 9, titleFontWeight: 600, titleColor: c.text };
  return mergeConfig(obsidianTheme(), {
    font: mono,
    title: { font: mono, fontSize: 11, fontWeight: 600, color: c.text, subtitleFont: mono, subtitleColor: c.muted, anchor: "start" },
    axis: { ...label, domain: false, ticks: false, grid: true, gridDash: [1, 3], gridColor: c.border, gridOpacity: 0.8, labelOverlap: "greedy", labelFlush: false },
    // y axes: the title as a corner label above the plot; numeric labels inside it (category labels stay outside)
    axisY: { titleAngle: 0, titleAlign: "left", titleBaseline: "bottom", titleX: 0, titleY: -14 },
    axisYQuantitative: { labelAlign: "left", labelBaseline: "bottom", labelPadding: -2 },
    legend: { ...label, symbolType: "circle", symbolSize: 40 },
    header: { labelFont: mono, titleFont: mono },
    mark: { color: c.text },
    point: { filled: true, size: 6, strokeWidth: 0 },
    circle: { size: 6 },
    line: { strokeWidth: 1.2 },
    area: { opacity: 0.12 },
    rule: { color: c.muted },
    text: { color: c.text, font: mono },
    range: { category: [...new Set([c.text, c.accent, c.blue, c.green, c.orange, c.purple, c.cyan, c.yellow, c.pink, c.red])] },
    style: { "guide-label": { font: mono }, "guide-title": { font: mono }, text: { font: mono } },
    // Vega-Lite: interval selections (brushes) in the accent
    selection: { interval: { mark: { fill: c.accent, fillOpacity: 0.12, stroke: c.accent, strokeOpacity: 0.6 } } },
  } as Config);
}

/** Keep the first of any colours closer than `min` (OKLab ΔE ×100); exact repeats always go. */
export function distinct(colors: string[], min = 8): string[] {
  const out: string[] = [];
  for (const c of colors) {
    if (out.some((o) => o === c || (colorDistance(o, c) ?? Infinity) < min)) continue;
    out.push(c);
  }
  return out;
}

/** Theme context from the DOM alone: light/dark and body classes, no theme name. */
export function domThemeContext(): ThemeContext {
  return {
    name: "",
    classes: Array.from(document.body.classList),
    dark: document.body.classList.contains("theme-dark"),
    accent: themeColors().accent,
  };
}

/**
 * The dynamic `auto` theme: the `obsidian` theme's fonts, text and grid, with a category palette
 * made for the active Obsidian theme (Nord, Catppuccin, Minimal's color schemes, …) or, for the
 * default and unrecognized themes, a toned-down palette led by the accent's hue.
 */
/**
 * Ink tones from the theme's text toward its background, in an order where neighbors differ most.
 * Four is what e-ink panels keep apart reliably; past that Vega repeats them, so specs with more
 * series should add a shape or strokeDash encoding, or facet.
 */
export const EINK_TONES = [0, 0.6, 0.3, 0.8] as const;

/**
 * The dynamic `eink` theme, for e-ink and grayscale screens: identity by tone, outline and shape
 * instead of hue. Everything is drawn in the theme's ink (its text color) on its paper (its
 * background): no muted grays or opacity, which e-ink panels dither into fuzz; dotted ink grids;
 * 2px lines and filled points; ink outlines on bars, slices and areas so light fills keep an edge;
 * point shapes that differ per category; grayscale ramps for heatmaps.
 */
export function einkTheme(): Config {
  const c = themeColors();
  const ink = parseColor(c.text) ? mixColors(c.text, c.text, 0) : "#000000";
  const paper = parseColor(c.background) ? mixColors(c.background, c.background, 0) : "#ffffff";
  const tone = (t: number) => mixColors(ink, paper, t);
  const cs = getComputedStyle(document.body);
  const font = cs.getPropertyValue("--font-interface").trim() || "sans-serif";
  const textSize = parseFloat(cs.getPropertyValue("--font-text-size")) || 16;
  const labelFontSize = Math.round(textSize * 0.75);
  const titleFontSize = Math.round(textSize * 0.85);
  const guide = { labelColor: ink, titleColor: ink, labelFont: font, titleFont: font, labelFontSize, titleFontSize, titleFontWeight: 600 };
  const outline = { stroke: ink, strokeWidth: 1 };
  return {
    background: "transparent",
    font,
    title: { color: ink, font, fontSize: Math.round(textSize * 0.95), fontWeight: 700, subtitleColor: ink, anchor: "start" },
    axis: { ...guide, domainColor: ink, tickColor: ink, domainWidth: 1, tickWidth: 1, gridColor: ink, gridDash: [1, 5], gridOpacity: 1, gridWidth: 0.75 },
    legend: { ...guide, symbolStrokeColor: ink, symbolStrokeWidth: 1 },
    header: { labelColor: ink, titleColor: ink, labelFont: font, titleFont: font },
    view: { stroke: "transparent" },
    mark: { color: ink, opacity: 1 },
    bar: outline,
    arc: outline,
    area: { ...outline, opacity: 1 },
    line: { strokeWidth: 2 },
    trail: { opacity: 1 },
    point: { filled: true, size: 50, opacity: 1, stroke: paper, strokeWidth: 1 },
    circle: { size: 50, opacity: 1, stroke: paper, strokeWidth: 1 },
    square: { size: 50, opacity: 1, stroke: paper, strokeWidth: 1 },
    rule: { color: ink },
    text: { color: ink, font },
    range: {
      category: EINK_TONES.map(tone),
      ordinal: [tone(0.8), tone(0.6), tone(0.3), tone(0)],
      ramp: [tone(0.92), tone(0)],
      heatmap: [tone(0.92), tone(0)],
      symbol: ["circle", "square", "triangle-up", "cross", "diamond", "triangle-down"],
    },
    style: {
      "guide-label": { fill: ink, font, fontSize: labelFontSize },
      "guide-title": { fill: ink, font, fontSize: titleFontSize },
      text: { fill: ink, font },
      cell: { strokeOpacity: 0 },
    },
    // Brushes as a dashed frame: a tinted fill would dither.
    selection: { interval: { mark: { fill: paper, fillOpacity: 0, stroke: ink, strokeDash: [3, 2], strokeOpacity: 1 } } },
  } as Config;
}

export function autoTheme(context: () => ThemeContext = domThemeContext, onPalette?: (p: ResolvedPalette) => void): Config {
  const palette: ResolvedPalette = resolvePalette(context());
  onPalette?.(palette);
  if (palette.family === "eink") return einkTheme();
  const [first] = palette.colors;
  return mergeConfig(obsidianTheme(), {
    mark: { color: first },
    range: { category: palette.colors },
  } as Config);
}

/** Built-in themes: `auto`, the dynamic Obsidian themes, and the static ones shipped by vega-themes. */
export function builtinThemes(
  context: () => ThemeContext = domThemeContext,
  onPalette?: (p: ResolvedPalette) => void,
): Map<string, ThemeSource> {
  const map = new Map<string, ThemeSource>();
  map.set("auto", () => autoTheme(context, onPalette));
  map.set("obsidian", obsidianTheme);
  map.set("instrument", instrumentTheme);
  map.set("eink", einkTheme);
  for (const [name, cfg] of Object.entries(vegaThemes as Record<string, unknown>)) {
    if (name === "version" || name === "default" || typeof cfg !== "object" || cfg === null) continue;
    map.set(name, cfg);
  }
  return map;
}

export function materialize(theme: ThemeSource | undefined): Config {
  if (!theme) return {};
  return typeof theme === "function" ? theme() : theme;
}

/** Merge in order: theme, vault overrides, vault theme file. The spec's own config is merged later by Vega. */
export function composeConfig(theme: Config, ...overrides: (Config | undefined)[]): Config {
  const parts = overrides.filter((c): c is Config => !!c && typeof c === "object");
  return mergeConfig(theme, ...parts);
}
