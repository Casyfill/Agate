import { Notice, Plugin, TFile, TFolder, Vault, addIcon, apiVersion, normalizePath } from "obsidian";
import { AGATE_ICON_ID, AGATE_ICON_SVG } from "./icon";
import { CHART_VIEW_ICON_ID, CHART_VIEW_ICON_SVG } from "./chart-icon";
import { version as vegaVersion, type Config, type Loader } from "vega";
import { version as vegaLiteVersion } from "vega-lite";
import { version as vegaEmbedVersion } from "vega-embed";
import { AgateSettingTab, DEFAULT_SETTINGS, type AgateSettings } from "./settings";
import { createLogger, errorMessage, type Logger } from "./util/log";
import { builtinThemes, composeConfig, materialize } from "./core/theme";
import { createVaultLoader } from "./core/loader";
import { parseJsonOrYaml, resolveVaultFile } from "./core/spec";
import { resolveChartOptions } from "./core/options";
import { RowDataCache, expandRowData, rowDataDefs } from "./core/data/rowdata";
import { parseRecipe, type Recipe } from "./core/recipes";
import type { PromptEnvironment } from "./core/prompt";
import { builtinRecipes } from "./recipes";
import type {
  AnySpec,
  ChartOptions,
  DataSchemeProvider,
  ResolvedChartOptions,
  Row,
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

  /** Most recently updated Agate Bases view (weakly held, per the plugin guidelines); target of the debug dump command. */
  lastBasesView: WeakRef<AgateBasesView> | null = null;

  /** Remote responses behind per-row data (D12), shared by every chart in the vault. */
  readonly rowDataCache = new RowDataCache();

  private settingsListeners = new Set<() => void>();
  private specFileListeners = new Set<(path: string) => void>();

  async onload(): Promise<void> {
    await this.loadSettings();
    // Before anything that refers to the icons by id.
    addIcon(AGATE_ICON_ID, AGATE_ICON_SVG);
    addIcon(CHART_VIEW_ICON_ID, CHART_VIEW_ICON_SVG);
    this.addSettingTab(new AgateSettingTab(this.app, this));

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
        const view = this.lastBasesView?.deref();
        if (!view) {
          new Notice("Agate: no Agate chart has rendered from a base yet.");
          return;
        }
        view.dumpFirstRow();
        new Notice("Agate: dumped to the developer console (Cmd/Ctrl+Shift+I).");
      },
    });

    this.addCommand({
      id: "new-chart-from-recipe",
      name: "New chart from recipe (in the last chart view)",
      checkCallback: (checking) => {
        const view = this.lastBasesView?.deref();
        if (!view) return false;
        if (!checking) void view.openRecipePicker();
        return true;
      },
    });

    this.addCommand({
      id: "copy-chart-prompt",
      name: "Copy chart prompt for an LLM (from the last chart view)",
      checkCallback: (checking) => {
        const view = this.lastBasesView?.deref();
        if (!view) return false;
        if (!checking) void view.copyChartPrompt();
        return true;
      },
    });

    this.addCommand({
      id: "refresh-remote-data",
      name: "Refresh remote data and re-render charts",
      callback: () => {
        this.rowDataCache.clear();
        this.emitSettingsChanged();
        new Notice("Agate: remote data cleared, charts re-rendering.");
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

    this.log.debug(`loaded, vega ${this.api.vegaVersion}`);
  }

  onunload(): void {
    this.settingsListeners.clear();
    this.specFileListeners.clear();
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
    return resolveChartOptions(opts, this.settings, this.themes.keys());
  }

  /** Theme, then vault config overrides, then the vault theme file. */
  async resolveConfig(themeName: string): Promise<Config> {
    const theme = materialize(this.themes.get(themeName) ?? this.themes.get("obsidian"));
    let overrides: Config | undefined;
    if (this.settings.configOverrides.trim()) {
      try {
        const parsed = parseJsonOrYaml(this.settings.configOverrides);
        if (parsed && typeof parsed === "object") overrides = parsed;
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
          if (parsed && typeof parsed === "object") fileConfig = parsed;
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

  /**
   * The datasets a chart receives: the rows under `datasetName`, plus one dataset per
   * `usermeta.agate.rowData` entry built by loading each row's property (D12). A row that
   * fails to load is skipped with a warning; when every row fails the chart shows the error.
   */
  async buildDatasets(spec: AnySpec, datasetName: string, rows: Row[], loader: Loader): Promise<Record<string, Row[]>> {
    const datasets: Record<string, Row[]> = { [datasetName]: rows };
    for (const def of rowDataDefs(spec)) {
      if (def.name === datasetName) {
        throw new Error(`usermeta.agate.rowData "${def.name}" uses the same name as the rows dataset; pick another.`);
      }
      const { records, errors } = await expandRowData(rows, def, {
        load: (uri) => loader.load(uri),
        cache: this.rowDataCache,
      });
      if (errors.length > 0) {
        if (records.length === 0 && errors.length === rows.length) {
          const more = errors.length > 3 ? `\n… and ${errors.length - 3} more` : "";
          throw new Error(`Per-row data "${def.name}" (${def.from}) failed for every row:\n${errors.slice(0, 3).join("\n")}${more}`);
        }
        this.log.warn(`per-row data "${def.name}": ${errors.length} of ${rows.length} rows failed`, errors);
      }
      this.log.debug(`per-row data "${def.name}": ${records.length} records from ${rows.length} rows`);
      datasets[def.name] = records;
    }
    return datasets;
  }

  /** Versions and settings the chart prompt reports, so an assistant writes for what is installed (D13). */
  promptEnvironment(): PromptEnvironment {
    return {
      agate: this.manifest.version,
      obsidian: apiVersion,
      vega: vegaVersion,
      vegaLite: vegaLiteVersion,
      vegaEmbed: vegaEmbedVersion,
      renderer: this.settings.renderer,
      allowRemote: this.settings.allowRemote,
    };
  }

  /** Built-in recipes, then the ones in the recipe folder (D13). A broken recipe file is skipped with a warning. */
  async loadRecipes(): Promise<Recipe[]> {
    const recipes = builtinRecipes();
    const folderPath = this.settings.recipeFolder.trim();
    const folder = folderPath ? this.app.vault.getAbstractFileByPath(normalizePath(folderPath)) : null;
    if (!(folder instanceof TFolder)) return recipes;
    const files: TFile[] = [];
    Vault.recurseChildren(folder, (f) => {
      if (f instanceof TFile && /\.(json|ya?ml)$/i.test(f.path)) files.push(f);
    });
    for (const file of files.sort((a, b) => a.path.localeCompare(b.path))) {
      try {
        const parsed = parseJsonOrYaml(await this.app.vault.cachedRead(file));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
        const recipe = parseRecipe(parsed as AnySpec, file.path, file.basename.replace(/\.(vl|vg)$/, ""));
        if (recipe) recipes.push(recipe);
      } catch (err) {
        this.log.warn(`recipe ${file.path} skipped:`, errorMessage(err));
      }
    }
    return recipes;
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
