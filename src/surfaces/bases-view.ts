import {
  BasesView,
  Notice,
  setIcon,
  type WorkspaceLeaf,
  type BasesAllOptions,
  type BasesPropertyId,
  type BasesViewConfig,
  type BasesViewRegistration,
  type QueryController,
  type TFile,
} from "obsidian";
import type AgatePlugin from "../main";
import { AgateRenderer } from "../core/render";
import { describeEntry, groupsToRows } from "../core/data/bases";
import { cellsDatasetName, tableCells } from "../core/data/table";
import { edgesDatasetName, linkEdges, pathTree, treeDatasetName } from "../core/data/structure";
import { detectMode, loadSpecFile, parseJsonOrYaml, referencedProperties, resolveSpecFile } from "../core/spec";
import { openSpecFile } from "../ui/open-spec";
import type { AnySpec, ChartOptions, ResolvedSpec } from "../core/types";
import { CHART_VIEW_ICON_ID } from "../chart-icon";
import { inferPropertyTypes, type PropertyInfo } from "../core/recipes";
import { buildChartPrompt } from "../core/prompt";
import { RecipeSuggestModal } from "../ui/recipe-modal";
import type { Row } from "../core/types";

export const AGATE_VIEW_TYPE = "agate";

const SPEC_EXTENSIONS = new Set(["json", "yaml", "yml", "vl", "vg"]);

/**
 * The `agate` Bases view (ADR-0001 D3, Surface A). Bases runs the query and calls
 * onDataUpdated(); we turn entries into rows and hand them to the renderer.
 */
export class AgateBasesView extends BasesView {
  readonly type = AGATE_VIEW_TYPE;

  private readonly containerEl: HTMLElement;
  private readonly renderer: AgateRenderer;
  private renderQueued = false;
  /** Bumped per render, so a slow per-row load cannot overwrite a newer render's data. */
  private renderGen = 0;

  constructor(
    private readonly plugin: AgatePlugin,
    controller: QueryController,
    parentEl: HTMLElement,
  ) {
    super(controller);
    parentEl.addClass("agate-bases-root");
    // Outside the chart host, which the renderer empties on every render.
    const edit = parentEl.createEl("button", { cls: "agate-edit-spec clickable-icon", attr: { "aria-label": "Edit spec" } });
    setIcon(edit, "braces");
    edit.addEventListener("click", () => void this.editSpec());
    this.containerEl = parentEl.createDiv("agate-bases-view");
    this.renderer = new AgateRenderer(this.containerEl, plugin.log, () => plugin.settings.debug);
  }

  onload(): void {
    this.registerEvent(this.app.workspace.on("css-change", () => this.scheduleRender()));
    this.register(this.plugin.onSettingsChanged(() => this.scheduleRender()));
    this.register(this.plugin.onSpecFileChanged((path) => {
      if (path === this.specFilePath()) this.scheduleRender();
    }));
  }

  onunload(): void {
    this.renderer.destroy();
  }

  onDataUpdated(): void {
    this.plugin.lastBasesView = new WeakRef(this);
    this.scheduleRender();
  }

  /** Debug helper behind the "Dump first Bases row" command: raw Value shapes plus the converted row. */
  dumpFirstRow(): void {
    const groups = this.data?.groupedData ?? [];
    const entry = groups.flatMap((g) => g.entries)[0];
    const log = this.plugin.log;
    if (!entry) {
      log.debug("dump: the view has no rows");
      return;
    }
    const props = [...new Set<BasesPropertyId>([...this.config.getOrder(), ...(this.allProperties ?? [])])];
    log.debug("dump: view", this.config.name, "entry", entry.file.path);
    log.debug("dump: allProperties", this.allProperties, "order", this.config.getOrder());
    log.debug("dump: value shapes", describeEntry(entry, props));
    log.debug("dump: converted row", groupsToRows([groups[0]], props).slice(0, 1)[0]);
  }

  /** Every property of the base as rows, plus their inferred types, for recipes and the LLM prompt (D13). */
  private chartContext(): { rows: Row[]; properties: PropertyInfo[] } {
    const ids = [...new Set<BasesPropertyId>([...this.config.getOrder(), ...(this.allProperties ?? [])])];
    const rows = groupsToRows(this.data?.groupedData ?? [], ids);
    const properties = inferPropertyTypes(rows.slice(0, 300), ids, (id) => this.config.getDisplayName(id as BasesPropertyId));
    return { rows, properties };
  }

  /** Open this view's spec file in Obsidian, left of the chart. */
  async editSpec(): Promise<void> {
    const path = this.specFilePath();
    if (!path) {
      new Notice(
        this.config.get("spec")
          ? "Agate: this view uses an inline spec. Edit it in the view options, or save it as a file and pick that as the Spec file."
          : "Agate: this view has no spec yet. Pick a recipe first.",
      );
      return;
    }
    const file = resolveSpecFile(this.app, path, null, this.plugin.settings.specFolder);
    if (!file) {
      new Notice(`Agate: spec file not found: ${path}`);
      return;
    }
    await openSpecFile(this.app, file, this.leaf());
  }

  /** The workspace leaf showing this view (a base's own tab, or the note embedding it). */
  private leaf(): WorkspaceLeaf | null {
    let found: WorkspaceLeaf | null = null;
    this.app.workspace.iterateAllLeaves((l) => {
      if (!found && l.view.containerEl.contains(this.containerEl)) found = l;
    });
    return found;
  }

  /** Pick a recipe, map its roles to this base's properties, write the spec and point this view at it. */
  async openRecipePicker(): Promise<void> {
    const { properties } = this.chartContext();
    const recipes = await this.plugin.loadRecipes();
    new RecipeSuggestModal(this.app, recipes, {
      properties,
      folder: this.plugin.settings.specFolder || "charts",
      onCreated: (path) => {
        this.config.set("specFile", path);
        this.scheduleRender();
      },
    }).open();
  }

  /** Copy a prompt describing this base (properties, types, sample rows, Agate rules) for any LLM. */
  async copyChartPrompt(): Promise<void> {
    const { rows, properties } = this.chartContext();
    const text = buildChartPrompt({
      viewName: this.config.name,
      datasetName: this.plugin.resolveOptions(this.readChartOptions()).dataset,
      properties,
      rows,
      env: this.plugin.promptEnvironment(),
    });
    await navigator.clipboard.writeText(text);
    new Notice("Agate: chart prompt copied. Paste it into your assistant, describe the chart, and save the reply as a spec file.");
  }

  private specFilePath(): string | null {
    const v = this.config.get("specFile");
    return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
  }

  /** Coalesce bursts (data + css-change + settings) into one render per tick. */
  private scheduleRender(): void {
    if (this.renderQueued) return;
    this.renderQueued = true;
    window.setTimeout(() => {
      this.renderQueued = false;
      void this.render();
    }, 0);
  }

  private async render(): Promise<void> {
    const { plugin } = this;
    const gen = ++this.renderGen;
    try {
      const resolved = await this.resolveSpec();
      if (!resolved) {
        this.renderPlaceholder();
        return;
      }
      const options = plugin.resolveOptions(this.readChartOptions());
      const config = await plugin.resolveConfig(options.theme);
      const loader = plugin.makeLoader(null);

      const props = this.propertiesToConvert(resolved.spec);
      const groups = this.data?.groupedData ?? [];
      const rows = groupsToRows(groups, props, plugin.settings.debug ? plugin.log : undefined);
      plugin.log.debug(`bases view: ${rows.length} rows, ${props.length} properties`, props);

      const datasets = await plugin.buildDatasets(resolved.spec, options.dataset, rows, loader);
      if (gen !== this.renderGen) return;
      const cellsName = cellsDatasetName(resolved.spec);
      if (cellsName) {
        // Table layout (D12): visible properties, in Properties-menu order, as cells.
        const order = this.config.getOrder();
        datasets[cellsName] = tableCells(rows, order, (id) => this.config.getDisplayName(id as BasesPropertyId));
      }
      const edgesName = edgesDatasetName(resolved.spec);
      if (edgesName) datasets[edgesName] = linkEdges(rows, this.app.metadataCache.resolvedLinks);
      const treeName = treeDatasetName(resolved.spec);
      if (treeName) datasets[treeName] = pathTree(rows, this.app.vault.getName());

      const openNote = (path: string, newLeaf: boolean): void => {
        void this.app.workspace.openLinkText(path, "", newLeaf);
      };
      await this.renderer.render({ resolved, options, config, loader, datasets, openNote });
    } catch (err) {
      if (gen === this.renderGen) this.renderer.showError(err);
    }
  }

  /**
   * Properties to convert (D4): whatever the spec refers to, plus what the user made visible
   * in the Bases Properties menu, plus file.name/path. A synthesized view has no order, so
   * the spec scan is what makes `base:` blocks work at all.
   */
  private propertiesToConvert(spec: AnySpec): BasesPropertyId[] {
    const set = new Set<BasesPropertyId>(this.config.getOrder());
    const available = new Set<string>(this.allProperties ?? []);
    for (const id of referencedProperties(spec)) {
      // Only note.* must exist in the dataset; formula.* and file.* are worth asking Bases for anyway.
      if (id.startsWith("note.") && available.size > 0 && !available.has(id)) continue;
      set.add(id as BasesPropertyId);
    }
    set.add("file.name");
    set.add("file.path");
    return [...set];
  }

  private readChartOptions(): ChartOptions {
    const c = this.config;
    const str = (k: string): string | undefined => {
      const v = c.get(k);
      return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
    };
    const bool = (k: string): boolean | undefined => {
      const v = c.get(k);
      return typeof v === "boolean" ? v : undefined;
    };
    const renderer = str("renderer");
    return {
      theme: str("theme"),
      renderer: renderer === "svg" || renderer === "canvas" ? (renderer) : undefined,
      actions: bool("actions"),
      interactive: bool("interactive"),
      dataset: str("dataset"),
    };
  }

  private async resolveSpec(): Promise<ResolvedSpec | null> {
    const specFile = this.specFilePath();
    const inline = this.config.get("spec");

    let spec: AnySpec | null = null;
    let specPath: string | null = null;

    if (specFile) {
      spec = await loadSpecFile(this.app, specFile, null, this.plugin.settings.specFolder);
      specPath = specFile;
    } else if (typeof inline === "string" && inline.trim().length > 0) {
      const parsed = parseJsonOrYaml(inline);
      if (!parsed || typeof parsed !== "object") throw new Error("Inline spec is not an object.");
      spec = parsed as AnySpec;
    } else if (inline && typeof inline === "object" && !Array.isArray(inline)) {
      // Hand-edited .base files can hold the spec as a nested YAML mapping.
      spec = inline as AnySpec;
    }

    if (!spec) return null;
    const mode = detectMode(spec);
    spec = this.plugin.preprocess(spec, { mode, sourcePath: specPath, surface: "bases-view" });
    return { mode, spec, specPath };
  }

  private renderPlaceholder(): void {
    this.renderer.destroy();
    this.containerEl.empty();
    const box = this.containerEl.createDiv({ cls: "agate-placeholder" });
    box.createDiv({ cls: "agate-placeholder-title", text: "No chart yet" });
    const actions = box.createDiv({ cls: "agate-placeholder-actions" });
    const recipe = actions.createEl("button", { cls: "mod-cta", text: "Pick a recipe" });
    recipe.addEventListener("click", () => void this.openRecipePicker());
    const prompt = actions.createEl("button", { text: "Copy prompt for an LLM" });
    prompt.addEventListener("click", () => void this.copyChartPrompt());
    box.createDiv({
      cls: "agate-placeholder-hint",
      text: "A recipe asks which of this base's properties to use and writes the spec for you. The prompt describes this base for any AI assistant. Or set a Spec file in the view options (chevron next to the view name).",
    });
  }
}

export function agateViewRegistration(plugin: AgatePlugin): BasesViewRegistration {
  return {
    name: "Agate chart",
    // Line icon in the style of the core views (Table, Cards, List); the Agate logo stays for
    // the settings tab and docs.
    icon: CHART_VIEW_ICON_ID,
    factory: (controller, containerEl) => new AgateBasesView(plugin, controller, containerEl),
    options: (_config: BasesViewConfig): BasesAllOptions[] => {
      const themeOptions: Record<string, string> = { "": "Vault default" };
      for (const name of plugin.themeNames()) themeOptions[name] = name;
      return [
        {
          type: "file",
          key: "specFile",
          displayName: "Spec file",
          placeholder: plugin.settings.specFolder ? `${plugin.settings.specFolder}/my-chart.vl.json` : "charts/my-chart.vl.json",
          filter: (file: TFile) => SPEC_EXTENSIONS.has(file.extension.toLowerCase()),
        },
        {
          type: "text",
          key: "spec",
          displayName: "Inline spec (JSON)",
          placeholder: '{"mark": "bar", "encoding": {…}}',
        },
        {
          type: "group",
          displayName: "Rendering",
          items: [
            {
              type: "text",
              key: "dataset",
              displayName: "Dataset name",
              placeholder: plugin.settings.datasetName,
            },
            { type: "dropdown", key: "theme", displayName: "Theme", options: themeOptions, default: "" },
            {
              type: "dropdown",
              key: "renderer",
              displayName: "Renderer",
              options: { "": "Vault default", svg: "SVG", canvas: "Canvas" },
              default: "",
            },
            {
              type: "toggle",
              key: "interactive",
              displayName: "Interactive",
              default: plugin.settings.interactive,
            },
            { type: "toggle", key: "actions", displayName: "Export menu", default: plugin.settings.actions },
          ],
        },
      ];
    },
  };
}
