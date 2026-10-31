import { App, PluginSettingTab, SecretComponent, type SettingDefinitionItem } from "obsidian";
import type AgatePlugin from "./main";
import type { Renderer } from "./core/types";
import { AGATE_ICON_ID } from "./icon";
import { EDITOR_PLUGIN, editorPluginEnabled, opensInObsidian, setShowsAllFiles, showsAllFiles } from "./ui/open-spec";

/** Vault-wide defaults (ADR-0001 D11). Per-chart options override these. */
export interface AgateSettings {
  settingsVersion: 1;
  /** Theme name: `obsidian` (dynamic), a vega-themes name, or one registered through the API. */
  theme: string;
  /** Vega `config` object as JSON or YAML text, merged over the theme. */
  configOverrides: string;
  /** Optional vault path to a JSON/YAML config file, merged after configOverrides. */
  themeFile: string;
  /** Folder tried when a spec path does not resolve on its own, e.g. `charts`. */
  specFolder: string;
  /** Folder whose specs with usermeta.agate.recipe join the built-in recipes (D13). */
  recipeFolder: string;
  renderer: Renderer;
  actions: boolean;
  interactive: boolean;
  datasetName: string;
  allowRemote: boolean;
  /** `name host` lines: which secrets `{secret:name}` in a URL may use, and for which host. */
  secretHosts: string;
  /** Also claim the ```vega and ```vega-lite block languages. Needs a reload; clashes with obsidian-vega. */
  codeBlockAliases: boolean;
  debug: boolean;
}

export const DEFAULT_SETTINGS: AgateSettings = {
  settingsVersion: 1,
  theme: "obsidian",
  configOverrides: "",
  themeFile: "",
  specFolder: "",
  recipeFolder: "",
  renderer: "svg",
  actions: false,
  interactive: true,
  datasetName: "base",
  allowRemote: false,
  secretHosts: "",
  codeBlockAliases: false,
  debug: false,
};

type Key = keyof AgateSettings;

/**
 * Declarative settings (Obsidian 1.13+): the definitions below render the tab and feed
 * Obsidian's settings search. Values are read from and written to `plugin.settings`;
 * writes also persist and notify open charts so a theme change re-renders them.
 */
export class AgateSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: AgatePlugin,
  ) {
    super(app, plugin);
    // Shown next to "Agate" in the settings sidebar (Obsidian 1.11+); registered with addIcon in main.ts.
    this.icon = AGATE_ICON_ID;
  }

  getSettingDefinitions(): SettingDefinitionItem<Key>[] {
    const themeOptions: Record<string, string> = {};
    for (const name of this.plugin.themeNames()) themeOptions[name] = name;

    return [
      {
        type: "group",
        heading: "Rendering",
        items: [
          {
            name: "Renderer",
            desc: "SVG is sharper and styleable; canvas is faster for charts with many marks.",
            control: {
              type: "dropdown",
              key: "renderer",
              options: { svg: "SVG", canvas: "Canvas" },
              defaultValue: DEFAULT_SETTINGS.renderer,
            },
          },
          {
            name: "Export menu",
            desc: "Show the chart menu with export to SVG or PNG and view source.",
            control: { type: "toggle", key: "actions", defaultValue: DEFAULT_SETTINGS.actions },
          },
          {
            name: "Interactive",
            desc: "Tooltips, hover, brushes and bound inputs. Off renders a static picture once. Individual charts can override.",
            control: { type: "toggle", key: "interactive", defaultValue: DEFAULT_SETTINGS.interactive },
          },
        ],
      },
      {
        type: "group",
        heading: "Data",
        items: [
          {
            name: "Default spec folder",
            desc: "Where spec files live. A spec path that does not resolve on its own is looked up here, so `spec: ratings.vl.json` finds `charts/ratings.vl.json`.",
            aliases: ["charts folder", "spec path"],
            control: { type: "folder", key: "specFolder", placeholder: "charts" },
          },
          {
            name: "Recipe folder",
            desc: "Your own chart recipes: specs in this folder with usermeta.agate.recipe appear in the recipe picker next to the built-in ones.",
            aliases: ["templates", "recipes"],
            control: { type: "folder", key: "recipeFolder", placeholder: "charts/recipes" },
          },
          {
            name: "Default dataset name",
            desc: 'Name of the Vega dataset that receives Bases rows. Specs reference it as {"data": {"name": "…"}}.',
            control: {
              type: "text",
              key: "datasetName",
              defaultValue: DEFAULT_SETTINGS.datasetName,
              validate: (v: string) => (v.trim().length === 0 ? "Dataset name cannot be empty." : undefined),
            },
          },
          {
            name: "Load remote data",
            desc: "Allow data.url values that start with http(s). Off by default: charts make no network requests.",
            aliases: ["network", "urls"],
            control: { type: "toggle", key: "allowRemote", defaultValue: DEFAULT_SETTINGS.allowRemote },
          },
        ],
      },
      {
        type: "group",
        heading: "Editing specs",
        items: [
          {
            name: "Code editor",
            desc: `The Edit spec button and commands open a spec file in Obsidian, beside its chart, and the chart redraws on every save. Obsidian has no JSON editor of its own: install the ${EDITOR_PLUGIN.name} community plugin (source and tree views, desktop and mobile).`,
            aliases: ["json", "edit spec", "json editor", "code editor"],
            render: (setting) => {
              const ok = opensInObsidian(this.app, "json");
              setting.addButton((b) =>
                b
                  .setButtonText(editorPluginEnabled(this.app) || ok ? "Installed" : `Get ${EDITOR_PLUGIN.name}`)
                  .onClick(() => window.open(`obsidian://show-plugin?id=${EDITOR_PLUGIN.id}`)),
              );
            },
          },
          {
            name: "Show spec files in the file explorer",
            desc: "Obsidian's own Detect all file extensions (Settings → Files and links), so .json specs appear in the file explorer and the link picker.",
            render: (setting) => {
              const on = showsAllFiles(this.app);
              if (on === null) {
                setting.setDesc("Turn on Settings → Files and links → Detect all file extensions, so .json specs appear in the file explorer.");
                return;
              }
              setting.addToggle((t) => t.setValue(on).onChange((v) => setShowsAllFiles(this.app, v)));
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Theme",
        items: [
          {
            name: "Theme",
            desc: "\"obsidian\" follows the active Obsidian theme and light/dark mode. The others are static Vega themes.",
            control: { type: "dropdown", key: "theme", options: themeOptions, defaultValue: DEFAULT_SETTINGS.theme },
          },
          {
            name: "Config overrides",
            desc: 'A Vega config object (JSON or YAML) merged over the theme. Example: {"mark": {"color": "#e93147"}}',
            aliases: ["vega config", "colors", "fonts"],
            control: {
              type: "textarea",
              key: "configOverrides",
              placeholder: '{ "axis": { "labelFontSize": 12 } }',
              rows: 6,
            },
          },
          {
            name: "Theme file",
            desc: "Optional vault path to a JSON/YAML Vega config, applied after the overrides above.",
            control: { type: "file", key: "themeFile", placeholder: "agate/theme.json" },
          },
          {
            name: "Generate a theme with an LLM",
            desc: "Copies a prompt describing your current Obsidian theme and overrides. Paste it into any assistant, describe the look you want, and save the reply to the Theme file above.",
            render: (setting) => {
              setting.addButton((b) => b.setButtonText("Copy theme prompt").onClick(() => void this.plugin.copyThemePrompt()));
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Advanced",
        items: [
          {
            name: "API keys",
            desc: "Keys live in Obsidian's secret storage, not in your vault or Agate's settings file. Pick an existing secret or create one here (a lowercase name such as maptiler), then allow it below.",
            aliases: ["api key", "token", "secret", "basemap", "keychain"],
            render: (setting) => {
              setting.addComponent((el) => new SecretComponent(this.app, el));
            },
          },
          {
            name: "API keys in URLs",
            desc: "A URL in a spec can contain {secret:name}; Agate fills it in when it fetches. List each allowed secret with the one host it may be sent to, one per line: maptiler api.maptiler.com",
            aliases: ["api key", "token", "secret", "basemap"],
            control: { type: "textarea", key: "secretHosts", placeholder: "maptiler api.maptiler.com", rows: 3 },
          },
          {
            name: "Also handle ```vega and ```vega-lite blocks",
            desc: "Takes effect after reloading Obsidian. Conflicts with the obsidian-vega plugin if both are enabled.",
            aliases: ["code block", "alias"],
            control: { type: "toggle", key: "codeBlockAliases", defaultValue: DEFAULT_SETTINGS.codeBlockAliases },
          },
          {
            name: "Debug logging",
            desc: "Verbose output in the developer console, including the converted first row of each chart.",
            control: { type: "toggle", key: "debug", defaultValue: DEFAULT_SETTINGS.debug },
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    return this.plugin.settings[key as Key];
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const k = key as Key;
    if (k === "datasetName" && typeof value === "string") value = value.trim() || DEFAULT_SETTINGS.datasetName;
    if ((k === "themeFile" || k === "specFolder" || k === "recipeFolder") && typeof value === "string") value = value.trim().replace(/^\/+|\/+$/g, "");
    (this.plugin.settings as unknown as Record<string, unknown>)[k] = value;
    await this.plugin.saveSettings();
  }
}
