import { App, requestUrl } from "obsidian";
import { loader as vegaLoader, type Loader } from "vega";
import { resolveVaultFile } from "./spec";
import type { DataSchemeProvider } from "./types";

export interface LoaderDeps {
  app: App;
  sourcePath: string | null;
  allowRemote: boolean;
  schemes: Map<string, DataSchemeProvider>;
}

const SCHEME_RE = /^([a-z][a-z0-9+.-]*):/i;

/**
 * A Vega loader that reads `data.url` from the vault, dispatches custom schemes to
 * registered providers, and blocks http(s) unless the vault setting allows it (ADR-0001 D5).
 */
export function createVaultLoader(deps: LoaderDeps): Loader {
  const base = vegaLoader();
  const originalLoad = base.load.bind(base);

  base.load = async (uri: string, options?: unknown): Promise<string> => {
    const m = SCHEME_RE.exec(uri);
    if (m) {
      const scheme = m[1].toLowerCase();
      if (scheme === "http" || scheme === "https") {
        if (!deps.allowRemote) {
          throw new Error(
            `Remote URL blocked: ${uri}. Enable "Load remote URLs" in Agate settings to allow it.`,
          );
        }
        const res = await requestUrl({ url: uri });
        return res.text;
      }
      if (scheme === "data" || scheme === "blob") {
        return originalLoad(uri, options as never);
      }
      const provider = deps.schemes.get(scheme);
      if (provider) {
        const out = await provider(uri, { sourcePath: deps.sourcePath });
        return typeof out === "string" ? out : JSON.stringify(out);
      }
      throw new Error(`Unknown URL scheme "${scheme}://" in ${uri}`);
    }

    const file = resolveVaultFile(deps.app, uri, deps.sourcePath);
    if (!file) throw new Error(`Data file not found in vault: ${uri}`);
    return deps.app.vault.read(file);
  };

  return base;
}
