import { mergeConfig, type Config } from "vega";
import * as vegaThemes from "vega-themes";
import type { ThemeSource } from "./types";

/**
 * The dynamic `obsidian` theme: a Vega config derived from the CSS variables of the
 * active Obsidian theme at call time, so it follows light/dark and community themes.
 */
export function obsidianTheme(): Config {
  const cs = getComputedStyle(document.body);
  const v = (name: string, fallback: string): string => {
    const raw = cs.getPropertyValue(name).trim();
    return raw.length > 0 ? raw : fallback;
  };

  const text = v("--text-normal", "#222");
  const muted = v("--text-muted", "#777");
  const faint = v("--text-faint", "#999");
  const border = v("--background-modifier-border", "#ccc");
  const accent = v("--color-accent", "#7c3aed");
  const font = v("--font-interface", "sans-serif");
  const textSize = parseFloat(v("--font-text-size", "16px")) || 16;

  // Obsidian's named colours make a category palette that matches the theme.
  const category = [
    accent,
    v("--color-blue", "#086ddd"),
    v("--color-green", "#08b94e"),
    v("--color-orange", "#ec7500"),
    v("--color-red", "#e93147"),
    v("--color-purple", "#7852ee"),
    v("--color-cyan", "#00bfbc"),
    v("--color-yellow", "#e0ac00"),
    v("--color-pink", "#d53984"),
  ];

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

/** Built-in themes: the dynamic Obsidian theme plus the static ones shipped by vega-themes. */
export function builtinThemes(): Map<string, ThemeSource> {
  const map = new Map<string, ThemeSource>();
  map.set("obsidian", obsidianTheme);
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
