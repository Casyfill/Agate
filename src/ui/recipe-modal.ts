import { FuzzySuggestModal, Modal, Notice, Setting, normalizePath, type App, type FuzzyMatch } from "obsidian";
import {
  candidatesFor,
  fillRecipe,
  missingRoles,
  suggestFileName,
  suggestMapping,
  type PropertyInfo,
  type Recipe,
} from "../core/recipes";
import { errorMessage } from "../util/log";

export interface RecipeTarget {
  /** Properties of the base, with inferred types and display names. */
  properties: PropertyInfo[];
  /** Folder new spec files go into. */
  folder: string;
  /** Called with the vault path of the spec that was written. */
  onCreated: (path: string) => void;
}

/** Step 1: pick a recipe (ADR-0001 D13). */
export class RecipeSuggestModal extends FuzzySuggestModal<Recipe> {
  constructor(
    app: App,
    private readonly recipes: Recipe[],
    private readonly target: RecipeTarget,
  ) {
    super(app);
    this.setPlaceholder("Pick a chart recipe");
  }

  getItems(): Recipe[] {
    return this.recipes;
  }

  getItemText(recipe: Recipe): string {
    return `${recipe.name} ${recipe.description}`;
  }

  renderSuggestion(match: FuzzyMatch<Recipe>, el: HTMLElement): void {
    const r = match.item;
    el.createDiv({ cls: "agate-recipe-name", text: r.name });
    el.createDiv({ cls: "agate-recipe-desc", text: r.description });
    if (r.source !== "built-in") el.createDiv({ cls: "agate-recipe-source", text: r.source });
  }

  onChooseItem(recipe: Recipe): void {
    new RecipeRolesModal(this.app, recipe, this.target).open();
  }
}

/** Step 2: say which property plays which role, name the file, create it. */
export class RecipeRolesModal extends Modal {
  private mapping: Record<string, string | null>;
  private fileName: string;

  constructor(
    app: App,
    private readonly recipe: Recipe,
    private readonly target: RecipeTarget,
  ) {
    super(app);
    this.mapping = suggestMapping(recipe, target.properties);
    this.fileName = suggestFileName(recipe, this.mapping);
  }

  onOpen(): void {
    const { contentEl, recipe, target } = this;
    this.setTitle(recipe.name);
    contentEl.createEl("p", { cls: "setting-item-description", text: recipe.description });

    const roles = Object.entries(recipe.roles);
    if (roles.length === 0) contentEl.createEl("p", { text: "This recipe needs no properties." });

    for (const [key, role] of roles) {
      let options = candidatesFor(role, target.properties);
      let note = role.description ?? "";
      if (options.length === 0) {
        // Nothing of the right type: offer everything rather than a dead end.
        options = target.properties;
        note = `No ${role.types?.join(" or ") ?? ""} property found; showing all. ${note}`.trim();
      }
      new Setting(contentEl)
        .setName(role.optional ? `${role.label} (optional)` : role.label)
        .setDesc(note)
        .addDropdown((dd) => {
          if (role.optional) dd.addOption("", "None");
          for (const p of options) dd.addOption(p.id, p.label === p.id ? p.id : `${p.label}  (${p.id})`);
          dd.setValue(this.mapping[key] ?? "");
          dd.onChange((v) => {
            this.mapping[key] = v || null;
          });
        });
    }

    new Setting(contentEl)
      .setName("File name")
      .setDesc(`Saved in ${target.folder || "the vault root"}. The current view will use it.`)
      .addText((t) =>
        t.setValue(this.fileName).onChange((v) => {
          this.fileName = v.trim();
        }),
      );

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) =>
        b
          .setButtonText("Create chart")
          .setCta()
          .onClick(() => {
            void this.create();
          }),
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }

  private async create(): Promise<void> {
    const missing = missingRoles(this.recipe, this.mapping);
    if (missing.length > 0) {
      new Notice(`Agate: pick a property for ${missing.map((k) => this.recipe.roles[k].label).join(", ")}.`);
      return;
    }
    try {
      const labels = new Map(this.target.properties.map((p) => [p.id, p.label]));
      const spec = fillRecipe(this.recipe, this.mapping, (id) => labels.get(id) ?? id);
      const path = await writeUnique(this.app, this.target.folder, this.fileName || "chart.vl.json", JSON.stringify(spec, null, 2) + "\n");
      this.close();
      new Notice(`Agate: created ${path}`);
      this.target.onCreated(path);
    } catch (err) {
      new Notice(`Agate: ${errorMessage(err)}`);
    }
  }
}

/** Write `name` into `folder`, creating the folder and adding " 2", " 3", … if the name is taken. */
async function writeUnique(app: App, folder: string, name: string, text: string): Promise<string> {
  const dir = folder.trim() ? normalizePath(folder) : "";
  if (dir && !app.vault.getFolderByPath(dir)) await app.vault.createFolder(dir);
  const m = /^(.*?)((?:\.[a-z]+)+)$/i.exec(name);
  const stem = m ? m[1] : name;
  const ext = m ? m[2] : ".json";
  for (let i = 1; i < 100; i++) {
    const candidate = normalizePath(`${dir ? dir + "/" : ""}${stem}${i === 1 ? "" : ` ${i}`}${ext}`);
    if (!app.vault.getAbstractFileByPath(candidate)) {
      await app.vault.create(candidate, text);
      return candidate;
    }
  }
  throw new Error(`Could not find a free file name for ${name} in ${dir || "the vault root"}.`);
}
