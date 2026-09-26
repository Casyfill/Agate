import {
  MarkdownRenderChild,
  MarkdownRenderer,
  Notice,
  parseYaml,
  stringifyYaml,
  type BasesConfigFile,
  type MarkdownPostProcessorContext,
} from "obsidian";
import type AgatePlugin from "../main";
import { AgateRenderer } from "../core/render";
import { detectMode, loadSpecFile, parseBlock, resolveVaultFile } from "../core/spec";
import type { AgateEnvelope, AnySpec, Mode, ResolvedSpec, Row } from "../core/types";
import { errorMessage } from "../util/log";
import { AGATE_VIEW_TYPE } from "./bases-view";

type BlockLanguage = "agate" | "vega" | "vega-lite";

export function registerCodeBlocks(plugin: AgatePlugin): void {
  const register = (lang: BlockLanguage) => {
    plugin.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
      ctx.addChild(new AgateBlock(plugin, el, source, ctx, lang));
    });
  };

  register("agate");

  if (plugin.settings.codeBlockAliases) {
    for (const lang of ["vega", "vega-lite"] as const) {
      try {
        register(lang);
      } catch (err) {
        new Notice(`Agate: could not claim \`\`\`${lang} blocks (another plugin owns them). ${errorMessage(err)}`);
        plugin.log.warn(`alias ${lang} not registered:`, err);
      }
    }
  }
}

/**
 * One ```agate block in a note (ADR-0001 D3, Surface B). Lives as long as the
 * rendered Markdown section does; Obsidian unloads it when the block leaves the DOM.
 */
class AgateBlock extends MarkdownRenderChild {
  private renderer: AgateRenderer | null = null;
  private watchedSpecPath: string | null = null;
  /** True once the block delegated to a synthesized ```base block; that embed handles its own re-rendering. */
  private delegatedToBase = false;

  constructor(
    private readonly plugin: AgatePlugin,
    containerEl: HTMLElement,
    private readonly source: string,
    private readonly ctx: MarkdownPostProcessorContext,
    private readonly lang: BlockLanguage,
  ) {
    super(containerEl);
  }

  onload(): void {
    this.registerEvent(
      this.plugin.app.workspace.on("css-change", () => {
        if (!this.delegatedToBase) void this.run();
      }),
    );
    this.register(
      this.plugin.onSettingsChanged(() => {
        if (!this.delegatedToBase) void this.run();
      }),
    );
    this.register(
      this.plugin.onSpecFileChanged((path) => {
        if (path === this.watchedSpecPath && !this.delegatedToBase) void this.run();
      }),
    );
    void this.run();
  }

  onunload(): void {
    this.renderer?.destroy();
    this.renderer = null;
  }

  private getRenderer(): AgateRenderer {
    if (!this.renderer) {
      this.renderer = new AgateRenderer(this.containerEl, this.plugin.log, () => this.plugin.settings.debug);
    }
    return this.renderer;
  }

  private async run(): Promise<void> {
    const sourcePath = this.ctx.sourcePath;
    try {
      const forced: Mode | undefined =
        this.lang === "vega" ? "vega" : this.lang === "vega-lite" ? "vega-lite" : undefined;
      const env = parseBlock(this.source, forced);

      if (env.base) {
        await this.renderThroughBase(env, sourcePath);
        return;
      }

      const resolved = await this.resolveSpec(env, sourcePath);
      const options = this.plugin.resolveOptions(env);
      const config = await this.plugin.resolveConfig(options.theme);
      const loader = this.plugin.makeLoader(sourcePath);
      const datasets = inlineDatasets(env, options.dataset);

      await this.getRenderer().render({ resolved, options, config, loader, datasets });
    } catch (err) {
      this.getRenderer().showError(err);
    }
  }

  private async resolveSpec(env: AgateEnvelope, sourcePath: string): Promise<ResolvedSpec> {
    let spec: AnySpec;
    let specPath: string | null = null;
    if (typeof env.spec === "string") {
      const file = resolveVaultFile(this.plugin.app, env.spec, sourcePath);
      if (!file) throw new Error(`Spec file not found: ${env.spec}`);
      specPath = file.path;
      spec = await loadSpecFile(this.plugin.app, file.path, null);
    } else if (env.spec && typeof env.spec === "object") {
      spec = env.spec;
    } else {
      throw new Error("Block needs a spec: either a bare Vega/Vega-Lite spec, or `spec: path/to/file.json`.");
    }
    this.watchedSpecPath = specPath;
    const mode = detectMode(spec, env.mode);
    spec = this.plugin.preprocess(spec, { mode, sourcePath, surface: "code-block" });
    return { mode, spec, specPath };
  }

  /**
   * `base:` in the envelope. Bases is the only query engine, and its data only flows
   * into a registered view, so we synthesize a ```base block that carries the base's
   * filters/formulas plus one `agate` view holding this block's spec, and let Obsidian
   * render it (ADR-0001 D3). M0 validates that this works inside a code block.
   */
  private async renderThroughBase(env: AgateEnvelope, sourcePath: string): Promise<void> {
    const { app } = this.plugin;
    this.renderer?.destroy();
    this.renderer = null;
    this.containerEl.empty();

    const baseFile = resolveVaultFile(app, env.base as string, sourcePath);
    if (!baseFile) throw new Error(`Base file not found: ${env.base}`);
    if (baseFile.extension !== "base") throw new Error(`Not a .base file: ${baseFile.path}`);

    const baseText = await app.vault.read(baseFile);
    const baseCfg = (parseYaml(baseText) ?? {}) as BasesConfigFile & Record<string, unknown>;

    const views = Array.isArray(baseCfg.views) ? baseCfg.views : [];
    let sourceView: Record<string, unknown> | undefined;
    if (env.view) {
      sourceView = views.find((v) => v && (v as { name?: string }).name === env.view) as
        | Record<string, unknown>
        | undefined;
      if (!sourceView) {
        const names = views.map((v) => (v as { name?: string }).name).filter(Boolean).join(", ");
        throw new Error(`View "${env.view}" not found in ${baseFile.path}. Views: ${names || "(none)"}`);
      }
    }

    // Resolve the spec path against this note now; the synthesized view has no note context.
    const agateView: Record<string, unknown> = {
      type: AGATE_VIEW_TYPE,
      name: `Agate (${baseFile.basename})`,
    };
    if (sourceView) {
      for (const key of ["filters", "order", "groupBy", "limit", "sort", "summaries"]) {
        if (sourceView[key] !== undefined) agateView[key] = sourceView[key];
      }
    }
    if (typeof env.spec === "string") {
      const specFile = resolveVaultFile(app, env.spec, sourcePath);
      if (!specFile) throw new Error(`Spec file not found: ${env.spec}`);
      agateView.specFile = specFile.path;
    } else if (env.spec && typeof env.spec === "object") {
      agateView.spec = env.spec;
    } else {
      throw new Error("Block needs a spec next to `base:`: either inline or `spec: path/to/file.json`.");
    }
    for (const key of ["dataset", "theme", "renderer", "actions", "interactive"] as const) {
      if (env[key] !== undefined) agateView[key] = env[key];
    }

    const synthesized: Record<string, unknown> = { views: [agateView] };
    for (const key of ["filters", "formulas", "properties", "summaries"]) {
      if (baseCfg[key] !== undefined) synthesized[key] = baseCfg[key];
    }

    const markdown = "```base\n" + stringifyYaml(synthesized).trimEnd() + "\n```\n";
    this.plugin.log.debug("synthesized base block for", baseFile.path, "\n" + markdown);

    const host = this.containerEl.createDiv({ cls: "agate-base-host" });
    this.delegatedToBase = true;
    await MarkdownRenderer.render(app, markdown, host, sourcePath, this);
  }
}

function inlineDatasets(env: AgateEnvelope, defaultName: string): Record<string, Row[]> {
  if (!env.data) return {};
  if (Array.isArray(env.data)) return { [defaultName]: env.data };
  const out: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(env.data)) {
    if (Array.isArray(rows)) out[name] = rows;
  }
  return out;
}
