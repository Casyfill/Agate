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

/** At most this many requests in flight per host; a dozen parallel fetches get HTTP/2 streams reset. */
const PER_HOST = 2;
/** Retries after a network error, 5xx or 429, with this base delay (doubled each time). */
const RETRIES = 2;
const RETRY_DELAY_MS = 400;

const active = new Map<string, number>();
const waiting = new Map<string, Array<() => void>>();

async function acquire(host: string): Promise<void> {
  if ((active.get(host) ?? 0) < PER_HOST) {
    active.set(host, (active.get(host) ?? 0) + 1);
    return;
  }
  await new Promise<void>((resolve) => {
    const q = waiting.get(host) ?? [];
    q.push(resolve);
    waiting.set(host, q);
  });
}

function release(host: string): void {
  const next = waiting.get(host)?.shift();
  if (next) {
    next(); // hand the slot over without decrementing
    return;
  }
  const n = (active.get(host) ?? 1) - 1;
  if (n > 0) active.set(host, n);
  else active.delete(host);
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/** requestUrl throws with `status` on HTTP errors; anything else is a network error. */
function retryable(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status !== "number") return true;
  return status === 429 || status >= 500;
}

/** GET a remote URL through Obsidian (no CORS), per-host limited, retrying transient failures. */
export async function fetchRemote(uri: string): Promise<string> {
  let host = uri;
  try {
    host = new URL(uri).host;
  } catch {
    /* keep the whole string as the key */
  }
  await acquire(host);
  try {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      if (attempt > 0) await sleep(RETRY_DELAY_MS * 2 ** (attempt - 1));
      try {
        const res = await requestUrl({ url: uri, headers: { Accept: "text/csv, application/json;q=0.9, */*;q=0.8" } });
        return res.text;
      } catch (err) {
        lastErr = err;
        if (!retryable(err)) break;
      }
    }
    const status = (lastErr as { status?: unknown } | null)?.status;
    const msg = typeof status === "number" ? `HTTP ${status}` : lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`${msg} (${uri})`);
  } finally {
    release(host);
  }
}

/**
 * A Vega loader that reads `data.url` from the vault, dispatches custom schemes to
 * registered providers, and blocks http(s) unless the vault setting allows it (ADR-0001 D5).
 */
export function createVaultLoader(deps: LoaderDeps): Loader {
  const base = vegaLoader();
  const originalLoad = base.load.bind(base);
  const originalSanitize = base.sanitize.bind(base);

  // Vega fetches image marks (map tiles, pictures) itself via sanitize(), outside load();
  // hold them to the same "Load remote URLs" setting as data.
  base.sanitize = async (uri: string, options?: unknown) => {
    if (/^https?:/i.test(uri) && !deps.allowRemote) {
      throw new Error(`Remote URL blocked: ${uri}. Enable "Load remote URLs" in Agate settings to allow it.`);
    }
    return originalSanitize(uri, options as never);
  };

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
        return fetchRemote(uri);
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
