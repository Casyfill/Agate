import { App, PluginSettingTab, Setting } from "obsidian";
import type AgatePlugin from "./main";
import type { Renderer } from "./core/types";

/** Vault-wide defaults (ADR-0001 D11). Per-chart options override these. */
export interface AgateSettings {
  settingsVersion: 1;
  /** Theme name: `obsidian` (dynamic), a vega-themes name, or one registered through the API. */
  theme: string;
  /** Vega `config` object as JSON or YAML text, merged over the theme. */
  configOverrides: string;
  /** Optional vault path to a JSON/YAML config file, merged after configOverrides. */
  themeFile: string;
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
  renderer: "svg",
  actions: false,
  interactive: true,
  datasetName: "base",
  allowRemote: false,
  codeBlockAliases: false,
  debug: false,
};

export class AgateSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private plugin: AgatePlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const s = this.plugin.settings;
    const save = async (patch: Partial<AgateSettings>) => {
      Object.assign(this.plugin.settings, patch);
      await this.plugin.saveSettings();
    };

    new Setting(containerEl).setName("Appearance").setHeading();

    new Setting(containerEl)
      .setName("Theme")
      .setDesc(
        "\"Obsidian\" follows the active Obsidian theme and light/dark mode. The others are static Vega themes.",
      )
      .addDropdown((dd) => {
        for (const name of this.plugin.themeNames()) dd.addOption(name, name);
        dd.setValue(s.theme).onChange((v) => save({ theme: v }));
      });

    new Setting(containerEl)
      .setName("Config overrides")
      .setDesc(
        "A Vega config object (JSON or YAML) merged over the theme. Example: {\"mark\": {\"color\": \"#e93147\"}}",
      )
      .addTextArea((ta) => {
        ta.setPlaceholder('{ "axis": { "labelFontSize": 12 } }')
          .setValue(s.configOverrides)
          .onChange((v) => save({ configOverrides: v }));
        ta.inputEl.rows = 6;
        ta.inputEl.cols = 48;
        ta.inputEl.addClass("agate-settings-textarea");
      });

    new Setting(containerEl)
      .setName("Theme file")
      .setDesc("Optional vault path to a JSON/YAML Vega config, applied after the overrides above.")
      .addText((t) =>
        t
          .setPlaceholder("agate/theme.json")
          .setValue(s.themeFile)
          .onChange((v) => save({ themeFile: v.trim() })),
      );

    new Setting(containerEl).setName("Rendering").setHeading();

    new Setting(containerEl)
      .setName("Renderer")
      .setDesc("SVG is sharper and styleable; Canvas is faster for charts with many marks.")
      .addDropdown((dd) =>
        dd
          .addOption("svg", "SVG")
          .addOption("canvas", "Canvas")
          .setValue(s.renderer)
          .onChange((v) => save({ renderer: v as Renderer })),
      );

    new Setting(containerEl)
      .setName("Export menu")
      .setDesc("Show the chart menu with export to SVG or PNG and view source.")
      .addToggle((t) => t.setValue(s.actions).onChange((v) => save({ actions: v })));

    new Setting(containerEl)
      .setName("Interactive")
      .setDesc(
        "Tooltips, hover, brushes and bound inputs. Off renders a static picture once. Individual charts can override.",
      )
      .addToggle((t) => t.setValue(s.interactive).onChange((v) => save({ interactive: v })));

    new Setting(containerEl).setName("Data").setHeading();

    new Setting(containerEl)
      .setName("Default dataset name")
      .setDesc("Name of the Vega dataset that receives Bases rows. Specs reference it as {\"data\": {\"name\": \"…\"}}.")
      .addText((t) =>
        t.setValue(s.datasetName).onChange((v) => save({ datasetName: v.trim() || "base" })),
      );

    new Setting(containerEl)
      .setName("Load remote data")
      .setDesc("Allow data.url values that start with http(s). Off by default: charts make no network requests.")
      .addToggle((t) => t.setValue(s.allowRemote).onChange((v) => save({ allowRemote: v })));

    new Setting(containerEl).setName("Advanced").setHeading();

    new Setting(containerEl)
      .setName("Also handle ```vega and ```vega-lite blocks")
      .setDesc(
        "Takes effect after reloading Obsidian. Conflicts with the obsidian-vega plugin if both are enabled.",
      )
      .addToggle((t) =>
        t.setValue(s.codeBlockAliases).onChange((v) => save({ codeBlockAliases: v })),
      );

    new Setting(containerEl)
      .setName("Debug logging")
      .setDesc("Verbose output in the developer console, including the converted first row of each chart.")
      .addToggle((t) => t.setValue(s.debug).onChange((v) => save({ debug: v })));
  }
}
