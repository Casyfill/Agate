import vegaEmbed, { type EmbedOptions, type Result } from "vega-embed";
import type { Config } from "vega";
import type { Loader } from "vega";
import type { AnySpec, ResolvedChartOptions, ResolvedSpec, Row } from "./types";
import {
  cloneSpec,
  declaredDatasetNames,
  ensureNamedData,
  notePathOf,
  openOnEvent,
  withInitialValues,
  withSignalValues,
} from "./spec";
import { errorMessage, type Logger } from "../util/log";
import { quietAriaLabels } from "./aria";
import { themeColors } from "./theme";
import { containerSignals, isBounce } from "./resize";
import { computeStats, isStatsSpec } from "./stats";

export interface RenderInput {
  resolved: ResolvedSpec;
  options: ResolvedChartOptions;
  config: Config;
  loader: Loader;
  /** Rows per dataset name, injected after embed. */
  datasets: Record<string, Row[]>;
  /** Opens a note by vault path; used when the spec sets `usermeta.agate.open`. */
  openNote?: (path: string, newLeaf: boolean) => void;
}

/**
 * A single-view Vega-Lite spec with no width fills its container; that is what a note
 * or a Bases pane wants. Composite specs (facet, repeat, concat) do not support
 * container sizing, so they are left alone.
 */
function defaultToContainerWidth(spec: AnySpec, mode: "vega" | "vega-lite"): AnySpec {
  if (mode !== "vega-lite") return spec;
  if (spec.width !== undefined) return spec;
  const single = ("mark" in spec || "layer" in spec) && !("facet" in spec) && !("repeat" in spec);
  if (!single) return spec;
  if (spec.encoding && typeof spec.encoding === "object") {
    const enc = spec.encoding as Record<string, unknown>;
    // Row/column encodings turn a single view into a facet.
    if ("row" in enc || "column" in enc || "facet" in enc) return spec;
  }
  const autosize = spec.autosize ?? { type: "fit-x", contains: "padding" };
  return { ...spec, width: "container", autosize };
}

/** Signals a spec can declare to learn about its surroundings (see withSignalValues). */
function environmentSignals(): Record<string, unknown> {
  return { agateDark: document.body.classList.contains("theme-dark"), agateColors: themeColors() };
}

function stopBubbling(evt: Event): void {
  evt.stopPropagation();
}

declare global {
  interface Window {
    /** Debug-only counter of live Vega views, to catch leaks (ADR-0001 D8). */
    __agateViews?: number;
  }
}

/**
 * Owns one vega-embed result inside a host element. Re-embeds only when the spec or
 * rendering options change; otherwise pushes new rows into the existing View so
 * selections survive a Bases filter change (ADR-0001 D10).
 */
export class AgateRenderer {
  private result: Result | null = null;
  private embedKey = "";
  private chartEl: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private ariaObserver: MutationObserver | null = null;
  private lastWidth = 0;
  private prevWidth = 0;
  private lastResizeAt = 0;
  private resizeTimer: number | null = null;
  private generation = 0;

  constructor(
    private readonly hostEl: HTMLElement,
    private readonly log: Logger,
    private readonly isDebug: () => boolean,
  ) {
    hostEl.addClass("agate-host");
  }

  async render(input: RenderInput): Promise<void> {
    const gen = ++this.generation;
    const { resolved, options } = input;
    const env = environmentSignals();
    const key = JSON.stringify([
      env,
      resolved.spec,
      resolved.mode,
      options.theme,
      options.renderer,
      options.actions,
      options.interactive,
      input.config,
    ]);

    // Same spec, same look: a data update is enough (never for static charts, which are finalized).
    if (this.result && options.interactive && key === this.embedKey) {
      try {
        await this.setData(input.datasets);
      } catch (err) {
        this.showError(err);
      }
      return;
    }

    this.destroyView();
    this.hostEl.empty();
    this.chartEl = this.hostEl.createDiv({ cls: "agate-chart" });

    try {
      let spec = cloneSpec(resolved.spec);
      const datasetNames = Object.keys(input.datasets);
      for (const name of datasetNames) {
        spec = ensureNamedData(spec, resolved.mode, name);
        // First run already sees the rows; later updates go through view.data().
        spec = withInitialValues(spec, resolved.mode, name, input.datasets[name]);
      }
      spec = defaultToContainerWidth(spec, resolved.mode);
      spec = withSignalValues(spec, resolved.mode, env);

      // Experimental: a stats spec renders as HTML numbers, not as a chart.
      if (isStatsSpec(resolved.spec)) {
        const stats = await computeStats(spec, resolved.mode, input.config, input.loader);
        if (gen !== this.generation) return;
        this.chartEl.empty();
        this.chartEl.addClass("agate-stats");
        for (const s of stats) {
          const cell = this.chartEl.createDiv({ cls: "agate-stat" });
          const top = cell.createDiv({ cls: "agate-stat-top" });
          top.createSpan({ cls: "agate-stat-value", text: s.value });
          if (s.change) {
            const cls = ["agate-stat-change", `is-${s.direction ?? "flat"}`];
            if (s.good !== undefined) cls.push(s.good ? "is-good" : "is-bad");
            top.createSpan({ cls: cls.join(" "), text: s.change });
          }
          cell.createDiv({ cls: "agate-stat-label", text: s.label });
          if (s.note) cell.createDiv({ cls: "agate-stat-note", text: s.note });
        }
        return;
      }

      const embedOptions: EmbedOptions = {
        mode: resolved.mode,
        config: input.config,
        renderer: options.renderer,
        actions: options.actions
          ? { export: true, source: true, compiled: false, editor: false }
          : false,
        loader: input.loader,
        hover: options.interactive,
        downloadFileName: "agate-chart",
      };

      const result = await vegaEmbed(this.chartEl, spec, embedOptions);
      this.isolateHover(this.chartEl);
      this.ariaObserver?.disconnect();
      this.ariaObserver = quietAriaLabels(this.chartEl);
      const openOn = openOnEvent(resolved.spec);
      const openNote = input.openNote;
      if (openOn && openNote && options.interactive) {
        result.view.addEventListener(openOn, (evt, item) => {
          const path = notePathOf(item?.datum);
          if (!path) return;
          const e = evt as MouseEvent;
          openNote(path, e.metaKey || e.ctrlKey);
        });
      }
      if (gen !== this.generation) {
        // A newer render started while we were embedding; drop this one.
        result.finalize();
        return;
      }
      this.result = result;
      this.embedKey = key;
      this.bumpCounter(+1);

      const declared = new Set(declaredDatasetNames(spec, resolved.mode));
      const missing = datasetNames.filter((n) => !declared.has(n));
      if (missing.length > 0) {
        this.log.warn("datasets not declared in spec, rows will not be injected:", missing);
      }

      if (!options.interactive) {
        // Static picture: keep the DOM, drop Vega's listeners and timers.
        result.view.finalize();
        this.log.debug("static render, view finalized");
      } else {
        this.observeResize(this.chartEl);
      }
    } catch (err) {
      if (gen === this.generation) this.showError(err);
    }
  }

  private async setData(datasets: Record<string, Row[]>): Promise<void> {
    if (!this.result) return;
    const view = this.result.view;
    let touched = false;
    for (const [name, rows] of Object.entries(datasets)) {
      try {
        view.data(name, rows);
        touched = true;
      } catch (err) {
        this.log.warn(`dataset "${name}" not found in spec:`, errorMessage(err));
      }
    }
    if (touched) await view.runAsync();
  }

  /**
   * Obsidian listens for `mouseover` at the document level to drive hover-link previews and
   * calls `isShown()` on the event target, a method it adds to HTMLElement only. Vega's SVG
   * marks are SVGElements, so that handler either throws or, once past the check, opens a
   * page preview of the embedding note under the chart's tooltip. Vega listens on the
   * SVG/canvas element inside, so stopping the event at the chart element changes nothing
   * for the chart and keeps Obsidian's handler out of it. Replaces the M0 prototype shim.
   */
  private isolateHover(el: HTMLElement): void {
    el.addEventListener("mouseover", stopBubbling);
    el.addEventListener("mouseout", stopBubbling);
  }

  private observeResize(el: HTMLElement): void {
    if (typeof ResizeObserver === "undefined") return;
    this.resizeObserver?.disconnect();
    this.lastWidth = el.clientWidth;
    this.resizeObserver = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === 0 || w === this.lastWidth) return;
      // A chart that resizes can toggle the pane's scrollbar, which hands it back the width it just
      // left (A → B → A). Following that bounce is a loop; the first move is enough.
      if (isBounce(w, this.prevWidth, Date.now() - this.lastResizeAt)) return;
      this.prevWidth = this.lastWidth;
      this.lastWidth = w;
      this.lastResizeAt = Date.now();
      if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        this.resizeTimer = null;
        const result = this.result;
        if (!result) return;
        // `width: "container"` (Vega-Lite, and Vega specs written the same way) reads containerSize()
        // only on window resize, and pane resizes never fire one. Set this chart's container-sized
        // signals directly; a window-wide resize event would re-measure every chart and the workspace.
        const box = result.view.container();
        for (const name of containerSignals(result.vgSpec)) {
          if (box) result.view.signal(name, name === "width" ? box.clientWidth : box.clientHeight);
        }
        result.view.resize();
        void result.view.runAsync();
      }, 80);
    });
    this.resizeObserver.observe(el);
  }

  showError(err: unknown): void {
    this.destroyView();
    this.hostEl.empty();
    const box = this.hostEl.createDiv({ cls: "agate-error" });
    box.createDiv({ cls: "agate-error-title", text: "Agate could not render this chart" });
    const message = errorMessage(err);
    box.createEl("pre", { cls: "agate-error-message", text: message });
    const copy = box.createEl("button", { cls: "agate-error-copy", text: "Copy error" });
    copy.addEventListener("click", () => {
      // Pasted into an LLM together with the spec, this is usually enough to get a fix.
      void navigator.clipboard.writeText(`Agate (Vega) error:\n${message}`).then(() => copy.setText("Copied"));
    });
    this.log.warn("render error:", err);
  }

  destroy(): void {
    this.generation++;
    this.destroyView();
    this.hostEl.empty();
  }

  private destroyView(): void {
    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
      this.resizeTimer = null;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.ariaObserver?.disconnect();
    this.ariaObserver = null;
    if (this.result) {
      try {
        this.result.finalize();
      } catch (err) {
        this.log.debug("finalize failed", err);
      }
      this.result = null;
      this.bumpCounter(-1);
    }
    this.embedKey = "";
    this.chartEl = null;
  }

  private bumpCounter(delta: number): void {
    if (!this.isDebug()) return;
    window.__agateViews = (window.__agateViews ?? 0) + delta;
    this.log.debug("live views:", window.__agateViews);
  }
}
