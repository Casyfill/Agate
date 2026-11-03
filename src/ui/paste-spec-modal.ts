import { Modal, Setting, TextAreaComponent, type App, type ButtonComponent } from "obsidian";
import type { PasteCheck } from "../core/paste";
import type { AnySpec } from "../core/types";

export interface PasteSpecTarget {
  /** Check text against this base (checkPastedSpec with the view's properties bound). */
  check: (text: string) => PasteCheck;
  /** File name to suggest for a spec that passed. */
  suggestName: (check: PasteCheck) => string;
  /** Folder the file goes into, for the description. */
  folder: string;
  /** Write the spec and point the view at it. Resolves once it's saved. */
  save: (spec: AnySpec, fileName: string) => Promise<void>;
}

/**
 * Shown when a pasted spec has problems, or the clipboard can't be read (mobile): the reply in
 * an editable box, what's wrong with it, and a file name. Rechecks as the text changes.
 */
export class PasteSpecModal extends Modal {
  private result: PasteCheck;
  private fileName: string;
  private nameEdited = false;
  private problemsEl!: HTMLElement;
  private saveButton!: ButtonComponent;
  private nameInput: { setValue: (v: string) => unknown } | null = null;
  private timer = 0;

  constructor(
    app: App,
    private text: string,
    private readonly target: PasteSpecTarget,
  ) {
    super(app);
    this.result = target.check(text);
    this.fileName = target.suggestName(this.result);
  }

  onOpen(): void {
    const { contentEl, target } = this;
    this.setTitle("Paste chart spec");
    contentEl.addClass("agate-paste-modal");
    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: "Paste the assistant's reply. Code fences and text around the JSON are ignored.",
    });

    const area = new TextAreaComponent(contentEl);
    area.inputEl.addClass("agate-paste-input");
    area.inputEl.rows = 12;
    area.setPlaceholder('{"$schema": "https://vega.github.io/schema/vega-lite/v6.json", …}');
    area.setValue(this.text);
    area.onChange((v) => {
      this.text = v;
      window.clearTimeout(this.timer);
      this.timer = window.setTimeout(() => this.recheck(), 250);
    });

    this.problemsEl = contentEl.createDiv({ cls: "agate-paste-problems" });

    new Setting(contentEl)
      .setName("File name")
      .setDesc(`Saved in ${target.folder || "the vault root"} as a new file. This view will use it.`)
      .addText((t) => {
        this.nameInput = t;
        t.setValue(this.fileName).onChange((v) => {
          this.fileName = v.trim();
          this.nameEdited = true;
        });
      });

    new Setting(contentEl)
      .addButton((b) => b.setButtonText("Cancel").onClick(() => this.close()))
      .addButton((b) => {
        this.saveButton = b;
        b.setButtonText("Save chart")
          .setCta()
          .onClick(() => void this.save());
      });

    this.renderProblems();
    if (!this.text) window.setTimeout(() => area.inputEl.focus(), 0);
  }

  onClose(): void {
    window.clearTimeout(this.timer);
    this.contentEl.empty();
  }

  private recheck(): void {
    this.result = this.target.check(this.text);
    if (!this.nameEdited && this.result.spec) {
      this.fileName = this.target.suggestName(this.result);
      this.nameInput?.setValue(this.fileName);
    }
    this.renderProblems();
  }

  private renderProblems(): void {
    const el = this.problemsEl;
    el.empty();
    const { errors, warnings, spec, mode } = this.result;
    const blank = this.text.trim().length === 0;
    this.saveButton.setDisabled(blank || errors.length > 0 || !spec);
    if (blank) return;
    if (errors.length === 0 && warnings.length === 0) {
      el.createDiv({ cls: "agate-paste-ok", text: `Looks good: a ${mode === "vega" ? "Vega" : "Vega-Lite"} spec for this base.` });
      return;
    }
    const list = el.createEl("ul");
    for (const e of errors) list.createEl("li", { cls: "agate-paste-error", text: e });
    for (const w of warnings) list.createEl("li", { cls: "agate-paste-warning", text: w });
  }

  private async save(): Promise<void> {
    const { spec, errors } = this.result;
    if (!spec || errors.length > 0) return;
    this.saveButton.setDisabled(true);
    try {
      await this.target.save(spec, this.fileName || this.target.suggestName(this.result));
      this.close();
    } catch {
      this.saveButton.setDisabled(false);
    }
  }
}
