import { mergeConfig, type Config } from "vega";
import * as vegaThemes from "vega-themes";
import type { ThemeSource } from "./types";

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
  // of them as the accent (Nord's is its red), so drop repeats or two categories share a colour.
  const category = [...new Set([accent, c.blue, c.green, c.orange, c.red, c.purple, c.cyan, c.yellow, c.pink])];

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

/** Built-in themes: the dynamic Obsidian theme plus the static ones shipped by vega-themes. */
export function builtinThemes(): Map<string, ThemeSource> {
  const map = new Map<string, ThemeSource>();
  map.set("obsidian", obsidianTheme);
  map.set("instrument", instrumentTheme);
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
