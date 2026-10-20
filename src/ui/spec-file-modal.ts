import { FuzzySuggestModal, type App, type TFile } from "obsidian";
import { SPEC_FILE_EXTENSIONS } from "./open-spec";

/** Pick a JSON or YAML file in the vault to open beside the charts. */
export class SpecFileModal extends FuzzySuggestModal<TFile> {
  constructor(
    app: App,
    private readonly onPick: (file: TFile) => void,
  ) {
    super(app);
    this.setPlaceholder("Spec file to edit…");
  }

  getItems(): TFile[] {
    return this.app.vault.getFiles().filter((f) => SPEC_FILE_EXTENSIONS.has(f.extension));
  }

  getItemText(file: TFile): string {
    return file.path;
  }

  onChooseItem(file: TFile): void {
    this.onPick(file);
  }
}
