import {
  BasesView,
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
import { detectMode, loadSpecFile, parseJsonOrYaml, referencedProperties } from "../core/spec";
import type { AnySpec, ChartOptions, Renderer, ResolvedSpec } from "../core/types";

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

  constructor(
    private readonly plugin: AgatePlugin,
    controller: QueryController,
    parentEl: HTMLElement,
  ) {
    super(controller);
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
    this.plugin.lastBasesView = this;
    this.scheduleRender();
  }

  /** Debug helper behind the "Dump first Bases row" command: raw Value shapes plus the converted row. */
  dumpFirstRow(): void {
    const groups = this.data?.groupedData ?? [];
    const entry = groups.flatMap((g) => g.entries)[0];
    if (!entry) {
      console.log("[agate] dump: the view has no rows");
      return;
    }
    const props = [...new Set<BasesPropertyId>([...this.config.getOrder(), ...(this.allProperties ?? [])])];
    console.log("[agate] dump: view", this.config.name, "entry", entry.file.path);
    console.log("[agate] dump: allProperties", this.allProperties, "order", this.config.getOrder());
    console.log("[agate] dump: value shapes", describeEntry(entry, props));
    console.log("[agate] dump: converted row", groupsToRows([groups[0]], props).slice(0, 1)[0]);
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

      await this.renderer.render({
        resolved,
        options,
        config,
        loader,
        datasets: { [options.dataset]: rows },
      });
    } catch (err) {
      this.renderer.showError(err);
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
      renderer: renderer === "svg" || renderer === "canvas" ? (renderer as Renderer) : undefined,
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
      spec = await loadSpecFile(this.app, specFile, null);
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
    box.createDiv({ text: "No spec yet." });
    box.createDiv({
      cls: "agate-placeholder-hint",
      text: "Open the view options (chevron next to the view name) and set a Spec file, or paste a Vega-Lite spec into Inline spec.",
    });
  }
}

export function agateViewRegistration(plugin: AgatePlugin): BasesViewRegistration {
  return {
    name: "Agate chart",
    icon: "lucide-chart-column",
    factory: (controller, containerEl) => new AgateBasesView(plugin, controller, containerEl),
    options: (_config: BasesViewConfig): BasesAllOptions[] => {
      const themeOptions: Record<string, string> = { "": "Vault default" };
      for (const name of plugin.themeNames()) themeOptions[name] = name;
      return [
        {
          type: "file",
          key: "specFile",
          displayName: "Spec file",
          placeholder: "charts/my-chart.vl.json",
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
