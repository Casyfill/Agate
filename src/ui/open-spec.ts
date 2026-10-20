import { Notice, Platform, type App, type TFile, type WorkspaceLeaf } from "obsidian";

/** What spec files are; the "Edit a spec file" picker lists these. */
export const SPEC_FILE_EXTENSIONS = new Set(["json", "yaml", "yml"]);

/** The code editor plugin the docs and settings recommend for spec files. Agate does not depend on it. */
export const EDITOR_PLUGIN = { id: "json-editor", name: "JSON Editor" };

/** Undocumented Obsidian internals, read defensively: every use has a fallback. */
interface Internals {
  viewRegistry?: { getTypeByExtension?(ext: string): string | undefined };
  plugins?: { enabledPlugins?: Set<string> };
  vault: { getConfig?: (this: void, key: string) => unknown; setConfig?: (this: void, key: string, value: unknown) => void };
}
const internals = (app: App): Internals => app as unknown as Internals;

/** Whether a core view or a plugin opens files with this extension; true when Obsidian doesn't say. */
export function opensInObsidian(app: App, ext: string): boolean {
  const reg = internals(app).viewRegistry;
  return reg?.getTypeByExtension ? !!reg.getTypeByExtension(ext) : true;
}

export function editorPluginEnabled(app: App): boolean {
  return internals(app).plugins?.enabledPlugins?.has(EDITOR_PLUGIN.id) ?? false;
}

/** Obsidian's own "Detect all file extensions" (Files and links), or null where it can't be read. */
export function showsAllFiles(app: App): boolean | null {
  const vault = internals(app).vault;
  return vault.getConfig ? !!vault.getConfig("showUnsupportedFiles") : null;
}

export function setShowsAllFiles(app: App, on: boolean): void {
  internals(app).vault.setConfig?.("showUnsupportedFiles", on);
}

/**
 * Open a spec file in whatever Obsidian uses for its extension (with the recommended plugin,
 * a code editor), split to the left of `chartLeaf` so the spec sits beside its chart; Agate
 * redraws the chart on every save. On phones, a new tab. If nothing in Obsidian opens the
 * extension, say what to install instead of handing the file to another app.
 */
export async function openSpecFile(app: App, file: TFile, chartLeaf?: WorkspaceLeaf | null): Promise<void> {
  if (!opensInObsidian(app, file.extension)) {
    new Notice(
      `Agate: Obsidian can't open .${file.extension} files yet. Install the ${EDITOR_PLUGIN.name} community plugin (Settings → Agate → Editing specs).`,
      12000,
    );
    return;
  }
  const ws = app.workspace;
  let open: WorkspaceLeaf | null = null;
  ws.iterateAllLeaves((l) => {
    const f = (l.view as { file?: TFile | null }).file;
    if (!open && f?.path === file.path) open = l;
  });
  if (open) {
    await ws.revealLeaf(open);
    return;
  }
  const leaf = Platform.isMobile ? ws.getLeaf("tab") : chartLeaf ? ws.createLeafBySplit(chartLeaf, "vertical", true) : ws.getLeaf("split", "vertical");
  await leaf.openFile(file, { active: true });
}
