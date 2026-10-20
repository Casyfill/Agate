import { FuzzySuggestModal, type App, type TFile } from "obsidian";
import { EDITABLE_SPEC_EXTENSIONS } from "./spec-editor";

/** Pick a JSON or YAML file in the vault to open in the spec editor. */
export class SpecFileModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly onPick: (file: TFile) => void,
  ) {
    super(app);
    this.setPlaceholder("Spec file to edit…");
  }

  getItems(): TFile[] {
    return this.app.vault.getFiles().filter((f) => EDITABLE_SPEC_EXTENSIONS.has(f.extension));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onPick(file);
  }
}
