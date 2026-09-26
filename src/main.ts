import { Notice, Plugin, TFile } from "obsidian";
import type { Config, Loader } from "vega";
import { AgateSettingTab, DEFAULT_SETTINGS, type AgateSettings } from "./settings";
import { createLogger, errorMessage, type Logger } from "./util/log";
import { builtinThemes, composeConfig, materialize } from "./core/theme";
import { createVaultLoader } from "./core/loader";
import { parseJsonOrYaml, resolveVaultFile } from "./core/spec";
import type {
  AnySpec,
  ChartOptions,
  DataSchemeProvider,
  ResolvedChartOptions,
  SpecContext,
  SpecPreprocessor,
  ThemeSource,
} from "./core/types";
import { AGATE_VIEW_TYPE, agateViewRegistration, type AgateBasesView } from "./surfaces/bases-view";
import { registerCodeBlocks } from "./surfaces/codeblock";
import { createApi, type AgateAPI } from "./api";

export default class AgatePlugin extends Plugin {
  settings: AgateSettings = { ...DEFAULT_SETTINGS };
  log: Logger = createLogger(() => this.settings.debug);
  api!: AgateAPI;

  /** Registries fed by settings and by the API (ADR-0001 D7). */
  readonly themes: Map<string, ThemeSource> = builtinThemes();
  readonly schemes: Map<string, DataSchemeProvider> = new Map();
  readonly preprocessors: SpecPreprocessor[] = [];

  /** Most recently updated Agate Bases view; target of the debug dump command. */
  lastBasesView: AgateBasesView | null = null;

  private settingsListeners = new Set<() => void>();
  private specFileListeners = new Set<(path: string) => void>();

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new AgateSettingTab(this.app, this));
    this.installSvgIsShownGuard();

    const basesOk = this.registerBasesView(AGATE_VIEW_TYPE, agateViewRegistration(this));
    if (!basesOk) {
      this.log.warn("Bases core plugin is disabled; the Agate chart view is unavailable.");
      new Notice("Agate: enable the Bases core plugin to chart Bases data.");
    }

    registerCodeBlocks(this);

    this.addCommand({
      id: "dump-first-row",
      name: "Debug: dump first Bases row of the last rendered chart to the console",
      callback: () => {
        if (!this.lastBasesView) {
          new Notice("Agate: no Agate chart has rendered from a base yet.");
          return;
        }
        this.lastBasesView.dumpFirstRow();
        new Notice("Agate: dumped to the developer console (Cmd/Ctrl+Shift+I).");
      },
    });

    // Re-render charts whose spec file (or theme file) changed on disk.
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!(file instanceof TFile)) return;
        if (this.settings.themeFile && file.path === this.settings.themeFile) {
          this.emitSettingsChanged();
          return;
        }
        for (const cb of this.specFileListeners) cb(file.path);
      }),
    );

    this.api = createApi(this);
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.trigger("agate:ready", this.api);
    });

    this.log.info(`loaded, vega ${this.api.vegaVersion}`);
  }

  onunload(): void {
    this.settingsListeners.clear();
    this.specFileListeners.clear();
  }

  /**
   * M0 finding: Obsidian extends HTMLElement.prototype with isShown() and calls it on event
   * targets. SVG elements (every mark Vega draws with the svg renderer) are not HTMLElements,
   * so the app throws "e.isShown is not a function" when the user interacts with a chart.
   * Give SVGElement the method, answering `false`: the caller is Obsidian's hover machinery,
   * and M0 round 2 showed that answering for the HTML ancestor lets it go on to open a page
   * preview of the embedding file underneath the Vega tooltip. `false` makes it bail out,
   * which is what happened (via the exception) before the shim. Removed on unload.
   */
  private installSvgIsShownGuard(): void {
    const proto = SVGElement.prototype as unknown as { isShown?: () => boolean };
    const html = HTMLElement.prototype as unknown as { isShown?: () => boolean };
    if (typeof proto.isShown === "function" || typeof html.isShown !== "function") return;
    const shim = function (this: SVGElement): boolean {
      return false;
    };
    proto.isShown = shim;
    this.register(() => {
      if (proto.isShown === shim) delete proto.isShown;
    });
    this.log.debug("installed SVGElement.isShown shim");
  }

  // --- settings -----------------------------------------------------------

  async loadSettings(): Promise<void> {
    const stored = (await this.loadData()) as Partial<AgateSettings> | null;
    this.settings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.emitSettingsChanged();
  }

  onSettingsChanged(cb: () => void): () => void {
    this.settingsListeners.add(cb);
    return () => this.settingsListeners.delete(cb);
  }

  emitSettingsChanged(): void {
    for (const cb of this.settingsListeners) {
      try {
        cb();
      } catch (err) {
        this.log.warn("settings listener failed", err);
      }
    }
  }

  onSpecFileChanged(cb: (path: string) => void): () => void {
    this.specFileListeners.add(cb);
    return () => this.specFileListeners.delete(cb);
  }

  // --- shared chart services (used by both surfaces and the API) ----------

  themeNames(): string[] {
    return [...this.themes.keys()];
  }

  /** Per-chart options over vault defaults (ADR-0001 D11 precedence, steps 2-4). */
  resolveOptions(opts: ChartOptions): ResolvedChartOptions {
    const s = this.settings;
    return {
      theme: opts.theme && this.themes.has(opts.theme) ? opts.theme : s.theme,
      renderer: opts.renderer ?? s.renderer,
      actions: opts.actions ?? s.actions,
      interactive: opts.interactive ?? s.interactive,
      dataset: opts.dataset && opts.dataset.trim() ? opts.dataset.trim() : s.datasetName,
    };
  }

  /** Theme, then vault config overrides, then the vault theme file. */
  async resolveConfig(themeName: string): Promise<Config> {
    const theme = materialize(this.themes.get(themeName) ?? this.themes.get("obsidian"));
    let overrides: Config | undefined;
    if (this.settings.configOverrides.trim()) {
      try {
        const parsed = parseJsonOrYaml(this.settings.configOverrides);
        if (parsed && typeof parsed === "object") overrides = parsed as Config;
      } catch (err) {
        this.log.warn("config overrides are not valid JSON/YAML:", errorMessage(err));
      }
    }
    let fileConfig: Config | undefined;
    if (this.settings.themeFile.trim()) {
      const file = resolveVaultFile(this.app, this.settings.themeFile, null);
      if (file) {
        try {
          const parsed = parseJsonOrYaml(await this.app.vault.read(file));
          if (parsed && typeof parsed === "object") fileConfig = parsed as Config;
        } catch (err) {
          this.log.warn("theme file is not valid JSON/YAML:", errorMessage(err));
        }
      } else {
        this.log.warn("theme file not found:", this.settings.themeFile);
      }
    }
    return composeConfig(theme, overrides, fileConfig);
  }

  makeLoader(sourcePath: string | null): Loader {
    return createVaultLoader({
      app: this.app,
      sourcePath,
      allowRemote: this.settings.allowRemote,
      schemes: this.schemes,
    });
  }

  preprocess(spec: AnySpec, ctx: SpecContext): AnySpec {
    let out = spec;
    for (const fn of this.preprocessors) {
      try {
        out = fn(out, ctx) ?? out;
      } catch (err) {
        this.log.warn("spec preprocessor failed", err);
      }
    }
    return out;
  }
}
