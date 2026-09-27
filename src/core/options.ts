import type { ChartOptions, ResolvedChartOptions } from "./types";

/** The subset of vault settings that option resolution needs (ADR-0001 D11). */
export interface OptionDefaults {
  theme: string;
  renderer: "svg" | "canvas";
  actions: boolean;
  interactive: boolean;
  datasetName: string;
}

/**
 * Per-chart options over vault defaults (D11 precedence steps 2 to 4). A per-chart theme
 * that is not a known theme falls back to the vault default rather than erroring.
 */
export function resolveChartOptions(
  opts: ChartOptions,
  defaults: OptionDefaults,
  knownThemes: Iterable<string>,
): ResolvedChartOptions {
  const themes = new Set(knownThemes);
  return {
    theme: opts.theme && themes.has(opts.theme) ? opts.theme : defaults.theme,
    renderer: opts.renderer === "svg" || opts.renderer === "canvas" ? opts.renderer : defaults.renderer,
    actions: typeof opts.actions === "boolean" ? opts.actions : defaults.actions,
    interactive: typeof opts.interactive === "boolean" ? opts.interactive : defaults.interactive,
    dataset: opts.dataset && opts.dataset.trim() ? opts.dataset.trim() : defaults.datasetName,
  };
}
