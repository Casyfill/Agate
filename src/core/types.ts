import type { Config as VegaConfig } from "vega";

export type Mode = "vega" | "vega-lite";

/** A Vega or Vega-Lite spec. Kept loose on purpose; Vega validates it. */
export type AnySpec = Record<string, unknown>;

/** One data row handed to Vega. Shape follows ADR-0001 D4. */
export type Row = Record<string, unknown>;

export type Renderer = "svg" | "canvas";

/** Per-chart options. `undefined` means "inherit the vault default" (D11). */
export interface ChartOptions {
  theme?: string;
  renderer?: Renderer;
  actions?: boolean;
  interactive?: boolean;
  dataset?: string;
  mode?: Mode;
}

/** Fully resolved options after applying vault defaults. */
export interface ResolvedChartOptions {
  theme: string;
  renderer: Renderer;
  actions: boolean;
  interactive: boolean;
  dataset: string;
}

/** Body of an ```agate block once parsed (D3, Surface B). */
export interface AgateEnvelope extends ChartOptions {
  /** Vault path to a spec file, or an inline spec. */
  spec?: string | AnySpec;
  /** Vault path to a .base file whose query supplies the rows. */
  base?: string;
  /** Name of the view inside that base whose filters/order should apply. */
  view?: string;
  /** Inline rows, either a list (goes into `dataset`) or a map of dataset name to rows. */
  data?: Row[] | Record<string, Row[]>;
}

export interface ResolvedSpec {
  mode: Mode;
  spec: AnySpec;
  /** Vault path the spec came from, when it came from a file. */
  specPath: string | null;
}

export type ThemeSource = VegaConfig | (() => VegaConfig);

export interface SpecContext {
  mode: Mode;
  sourcePath: string | null;
  surface: "bases-view" | "code-block" | "api";
}

export type SpecPreprocessor = (spec: AnySpec, ctx: SpecContext) => AnySpec;

export interface DataSchemeContext {
  sourcePath: string | null;
}

/** Resolves a `<scheme>://…` URL into text (CSV/JSON/…) or rows. */
export type DataSchemeProvider = (
  uri: string,
  ctx: DataSchemeContext,
) => Promise<string | Row[]>;
