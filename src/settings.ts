import { App, PluginSettingTab, type SettingDefinitionItem } from "obsidian";
import type AgatePlugin from "./main";
import type { Renderer } from "./core/types";
import { AGATE_ICON_ID } from "./icon";

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
  renderer: Renderer;
  actions: boolean;
  interactive: boolean;
  datasetName: string;
  allowRemote: boolean;
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
  renderer: "svg",
  actions: false,
  interactive: true,
  datasetName: "base",
  allowRemote: false,
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
        heading: "Advanced",
        items: [
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
    if ((k === "themeFile" || k === "specFolder") && typeof value === "string") value = value.trim().replace(/^\/+|\/+$/g, "");
    (this.plugin.settings as unknown as Record<string, unknown>)[k] = value;
    await this.plugin.saveSettings();
  }
}
