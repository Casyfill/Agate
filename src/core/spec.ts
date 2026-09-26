import { App, TFile, normalizePath, parseYaml } from "obsidian";
import type { AgateEnvelope, AnySpec, Mode } from "./types";

/** Top-level keys that mark a document as a bare Vega/Vega-Lite spec rather than an Agate envelope. */
const SPEC_MARKERS = [
  "$schema",
  "mark",
  "encoding",
  "layer",
  "hconcat",
  "vconcat",
  "concat",
  "repeat",
  "facet",
  "marks",
  "scales",
  "signals",
  "axes",
  "projection",
];

const ENVELOPE_KEYS = new Set([
  "spec",
  "base",
  "view",
  "data",
  "theme",
  "renderer",
  "actions",
  "interactive",
  "dataset",
  "mode",
]);

/** Parse text that may be JSON or YAML. JSON first: YAML rejects tab indentation that JSON allows. */
export function parseJsonOrYaml(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through to YAML: JSON5-ish input, comments, trailing commas */
    }
  }
  return parseYaml(trimmed);
}

export function isBareSpec(obj: unknown): obj is AnySpec {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
  const keys = Object.keys(obj);
  if (keys.some((k) => SPEC_MARKERS.includes(k))) return true;
  // Nothing that looks like an envelope either: treat as a spec and let Vega complain.
  return !keys.some((k) => ENVELOPE_KEYS.has(k));
}

/**
 * Parse the body of an ```agate block. A bare spec becomes `{ spec }`.
 * For ```vega / ```vega-lite aliases the mode is forced.
 */
export function parseBlock(source: string, forcedMode?: Mode): AgateEnvelope {
  const parsed = parseJsonOrYaml(source);
  if (parsed === undefined || parsed === null) {
    throw new Error("Empty block. Write a Vega/Vega-Lite spec or an Agate envelope (spec:, base:, …).");
  }
  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Block must be a mapping (JSON object or YAML map).");
  }
  const env: AgateEnvelope = isBareSpec(parsed)
    ? { spec: parsed as AnySpec }
    : (parsed as AgateEnvelope);
  if (forcedMode) env.mode = forcedMode;
  return env;
}

export function detectMode(spec: AnySpec, explicit?: Mode): Mode {
  if (explicit) return explicit;
  const schema = typeof spec.$schema === "string" ? spec.$schema : "";
  if (/\/schema\/vega-lite\//.test(schema)) return "vega-lite";
  if (/\/schema\/vega\//.test(schema)) return "vega";
  if ("marks" in spec || "scales" in spec || "signals" in spec || "axes" in spec) return "vega";
  return "vega-lite";
}

/** Resolve a vault path (wikilink-style or plain) relative to the note that references it. */
export function resolveVaultFile(app: App, path: string, sourcePath: string | null): TFile | null {
  const clean = normalizePath(path.trim().replace(/^\[\[|\]\]$/g, ""));
  const byLink = app.metadataCache.getFirstLinkpathDest(clean, sourcePath ?? "");
  if (byLink) return byLink;
  const direct = app.vault.getFileByPath(clean);
  if (direct) return direct;
  if (sourcePath && !clean.startsWith("/")) {
    const dir = sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : "";
    const joined = normalizePath(dir ? `${dir}/${clean}` : clean);
    return app.vault.getFileByPath(joined);
  }
  return null;
}

export async function loadSpecFile(app: App, path: string, sourcePath: string | null): Promise<AnySpec> {
  const file = resolveVaultFile(app, path, sourcePath);
  if (!file) throw new Error(`Spec file not found: ${path}`);
  const text = await app.vault.read(file);
  const parsed = parseJsonOrYaml(text);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Spec file is not an object: ${file.path}`);
  }
  return parsed as AnySpec;
}

/**
 * Make sure the spec has a dataset with the given name so `view.data(name, rows)` has a target.
 * Specs that already declare their data are left alone.
 */
export function ensureNamedData(spec: AnySpec, mode: Mode, datasetName: string): AnySpec {
  if (mode === "vega-lite") {
    if (spec.data === undefined && !("datasets" in spec)) {
      return { ...spec, data: { name: datasetName } };
    }
    return spec;
  }
  const data = Array.isArray(spec.data) ? (spec.data as Array<Record<string, unknown>>) : [];
  if (data.some((d) => d && d.name === datasetName)) return spec;
  return { ...spec, data: [{ name: datasetName }, ...data] };
}

/** Names of datasets the spec declares without inline values (candidates for injection). */
export function declaredDatasetNames(spec: AnySpec, mode: Mode): string[] {
  const names: string[] = [];
  if (mode === "vega-lite") {
    const d = spec.data as Record<string, unknown> | undefined;
    if (d && typeof d.name === "string") names.push(d.name);
  } else if (Array.isArray(spec.data)) {
    for (const d of spec.data as Array<Record<string, unknown>>) {
      if (d && typeof d.name === "string") names.push(d.name);
    }
  }
  return names;
}

export function cloneSpec<T>(spec: T): T {
  return JSON.parse(JSON.stringify(spec)) as T;
}

/** Put initial rows into the named dataset so the first Vega run already has data (no empty-extent warnings, no flash). */
export function withInitialValues(spec: AnySpec, mode: Mode, datasetName: string, rows: unknown[]): AnySpec {
  if (mode === "vega-lite") {
    const d = spec.data as Record<string, unknown> | undefined;
    if (d && d.name === datasetName && d.values === undefined && d.url === undefined) {
      return { ...spec, data: { ...d, values: rows } };
    }
    return spec;
  }
  if (!Array.isArray(spec.data)) return spec;
  const data = (spec.data as Array<Record<string, unknown>>).map((d) =>
    d && d.name === datasetName && d.values === undefined && d.url === undefined && d.source === undefined
      ? { ...d, values: rows }
      : d,
  );
  return { ...spec, data };
}

const PROP_STRING = /^(note|formula|file)\.[^\s"'{}[\]()]+$/;
const PROP_IN_EXPR = /\bdatum\.(note|formula|file)\.([A-Za-z_$][\w$]*)/g;

/**
 * Bases property ids a spec refers to: exact field strings like "note.rating" anywhere in
 * the spec, and `datum.note.rating` inside expressions. Used to decide which properties to
 * convert, so a chart works even when the Bases view has no property order set (D4).
 */
export function referencedProperties(spec: unknown): string[] {
  const out = new Set<string>();
  const visit = (node: unknown): void => {
    if (typeof node === "string") {
      if (PROP_STRING.test(node)) out.add(node);
      for (const m of node.matchAll(PROP_IN_EXPR)) out.add(`${m[1]}.${m[2]}`);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }
    if (node && typeof node === "object") {
      for (const v of Object.values(node as Record<string, unknown>)) visit(v);
    }
  };
  visit(spec);
  return [...out];
}
