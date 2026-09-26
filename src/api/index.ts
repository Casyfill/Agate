import * as vega from "vega";
import * as vegaLite from "vega-lite";
import type { Config } from "vega";
import type AgatePlugin from "../main";
import type {
  AnySpec,
  ChartOptions,
  DataSchemeProvider,
  SpecPreprocessor,
  ThemeSource,
} from "../core/types";
import { AgateRenderer } from "../core/render";
import { detectMode } from "../core/spec";

/**
 * Public surface for other plugins (ADR-0001 D7). Reach it as
 * `app.plugins.plugins.agate?.api`, or listen for `app.workspace.on('agate:ready', api => …)`.
 *
 * Add-ons must not bundle Vega: use `api.vega` so registrations land in the instance
 * that renders the charts.
 */
export interface AgateAPI {
  readonly apiVersion: 1;
  readonly vegaVersion: string;
  readonly vega: typeof vega;
  readonly vegaLite: typeof vegaLite;

  registerDataScheme(scheme: string, provider: DataSchemeProvider): () => void;
  registerExpressionFunction(name: string, fn: (...args: unknown[]) => unknown): () => void;
  registerTheme(name: string, theme: ThemeSource): () => void;
  registerSpecPreprocessor(fn: SpecPreprocessor): () => void;

  /** Render a spec into an element you own. Call the returned handle's destroy() on unload. */
  render(
    el: HTMLElement,
    spec: AnySpec,
    options?: ChartOptions & { datasets?: Record<string, Record<string, unknown>[]>; sourcePath?: string },
  ): Promise<{ destroy: () => void }>;
}

export function createApi(plugin: AgatePlugin): AgateAPI {
  return {
    apiVersion: 1,
    vegaVersion: vega.version,
    vega,
    vegaLite,

    registerDataScheme(scheme, provider) {
      const key = scheme.toLowerCase().replace(/:\/\/$/, "");
      if (plugin.schemes.has(key)) throw new Error(`Agate: data scheme "${key}" is already registered`);
      plugin.schemes.set(key, provider);
      return () => {
        if (plugin.schemes.get(key) === provider) plugin.schemes.delete(key);
      };
    },

    registerExpressionFunction(name, fn) {
      const previous = vega.expressionFunction(name) as unknown;
      vega.expressionFunction(name, fn as never);
      return () => {
        if (typeof previous === "function") vega.expressionFunction(name, previous as never);
        else vega.expressionFunction(name, undefined as never);
      };
    },

    registerTheme(name, theme) {
      const previous = plugin.themes.get(name);
      plugin.themes.set(name, theme);
      plugin.emitSettingsChanged();
      return () => {
        if (previous) plugin.themes.set(name, previous);
        else plugin.themes.delete(name);
        plugin.emitSettingsChanged();
      };
    },

    registerSpecPreprocessor(fn) {
      plugin.preprocessors.push(fn);
      return () => {
        const i = plugin.preprocessors.indexOf(fn);
        if (i >= 0) plugin.preprocessors.splice(i, 1);
      };
    },

    async render(el, spec, options = {}) {
      const renderer = new AgateRenderer(el, plugin.log, () => plugin.settings.debug);
      const mode = detectMode(spec, options.mode);
      const sourcePath = options.sourcePath ?? null;
      const processed = plugin.preprocess(spec, { mode, sourcePath, surface: "api" });
      const resolved = plugin.resolveOptions(options);
      const config: Config = await plugin.resolveConfig(resolved.theme);
      await renderer.render({
        resolved: { mode, spec: processed, specPath: null },
        options: resolved,
        config,
        loader: plugin.makeLoader(sourcePath),
        datasets: options.datasets ?? {},
      });
      return { destroy: () => renderer.destroy() };
    },
  };
}
