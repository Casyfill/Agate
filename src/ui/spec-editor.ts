import { Platform, TextFileView, type App, type TFile, type WorkspaceLeaf } from "obsidian";
import { specTextError } from "../core/spec";

export const SPEC_EDITOR_VIEW = "agate-spec-editor";

/** File types the spec editor opens: what spec files are (see SPEC_EXTENSIONS in the Bases view). */
export const EDITABLE_SPEC_EXTENSIONS = new Set(["json", "yaml", "yml"]);

/** Wait after the last keystroke before saving, so the chart redraws while you type, not on every key. */
const SAVE_DELAY_MS = 500;

/**
 * A plain editor for a spec file. It saves on its own while the text parses, so every chart
 * using the file redraws beside it (Agate watches spec files); while it does not parse, the
 * status line says why and nothing is saved, so a half-typed edit never breaks the chart.
 * Closing the pane saves whatever is there.
 */
export class SpecEditorView extends TextFileView {
  private readonly textEl: HTMLTextAreaElement;
  private readonly statusEl: HTMLElement;
  private saveTimer: number | null = null;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    // Built here, not in onOpen: Obsidian may hand the file to setViewData first.
    this.contentEl.addClass("agate-spec-editor");
    this.statusEl = this.contentEl.createDiv({ cls: "agate-spec-status" });
    this.textEl = this.contentEl.createEl("textarea", {
      cls: "agate-spec-text",
      attr: { spellcheck: "false", autocapitalize: "off", autocomplete: "off", "aria-label": "Spec" },
    });
    this.textEl.addEventListener("input", () => this.changed());
    this.textEl.addEventListener("keydown", (evt) => this.onKey(evt));
  }

  getViewType(): string {
    return SPEC_EDITOR_VIEW;
  }

  getDisplayText(): string {
    return this.file ? `${this.file.name} (spec)` : "Agate spec";
  }

  getIcon(): string {
    return "braces";
  }

  async onClose(): Promise<void> {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
  }

  getViewData(): string {
    return this.textEl.value;
  }

  setViewData(data: string, clear: boolean): void {
    if (clear || this.textEl.value !== data) this.textEl.value = data;
    this.showStatus(specTextError(data));
  }

  clear(): void {
    this.textEl.value = "";
  }

  private changed(): void {
    const error = specTextError(this.textEl.value);
    this.showStatus(error, true);
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    if (error) return;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.save();
    }, SAVE_DELAY_MS);
  }

  private showStatus(error: string | null, editing = false): void {
    this.statusEl.toggleClass("is-error", !!error);
    this.statusEl.setText(error ?? (editing ? "Saved as you type; the chart redraws." : "Edits save as you type while the spec is valid."));
  }

  /** Tab and Shift-Tab indent and outdent by two spaces instead of leaving the field. */
  private onKey(evt: KeyboardEvent): void {
    if (evt.key !== "Tab" || evt.metaKey || evt.ctrlKey || evt.altKey) return;
    evt.preventDefault();
    const t = this.textEl;
    const { selectionStart: a, selectionEnd: b, value } = t;
    const lineStart = value.lastIndexOf("\n", a - 1) + 1;
    if (!evt.shiftKey && a === b) {
      t.setRangeText("  ", a, b, "end");
    } else {
      const block = value.slice(lineStart, b);
      const next = evt.shiftKey ? block.replace(/^ {1,2}/gm, "") : block.replace(/^/gm, "  ");
      t.setRangeText(next, lineStart, b, "select");
    }
    this.changed();
  }
}

/**
 * Open `file` in the spec editor. Beside `chartLeaf` it splits to the left, so the spec sits
 * left of the chart; without one it opens in a new split. On phones, a new tab.
 * A file already open in a spec editor is revealed instead.
 */
export async function openSpecEditor(app: App, file: TFile, chartLeaf?: WorkspaceLeaf | null): Promise<void> {
  const ws = app.workspace;
  const open = ws.getLeavesOfType(SPEC_EDITOR_VIEW).find((l) => (l.view as SpecEditorView).file?.path === file.path);
  if (open) {
    await ws.revealLeaf(open);
    return;
  }
  const leaf = Platform.isMobile ? ws.getLeaf("tab") : chartLeaf ? ws.createLeafBySplit(chartLeaf, "vertical", true) : ws.getLeaf("split", "vertical");
  await leaf.setViewState({ type: SPEC_EDITOR_VIEW, state: { file: file.path }, active: true });
}
