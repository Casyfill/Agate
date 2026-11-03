import { parse } from "vega";
import { compile, type TopLevelSpec } from "vega-lite";
import { detectMode, ensureNamedData, isBareSpec, parseJsonOrYaml, referencedProperties, specTextError } from "./spec";
import type { AnySpec, Mode } from "./types";

/**
 * "Paste spec from clipboard": the other half of "Copy prompt for an LLM" (ADR-0001 D13).
 * An assistant's reply goes in; a spec that compiles, plus what does not fit this base, comes out.
 */

/** File properties Bases always offers, whether or not the view lists them. */
const FILE_PROPERTIES = new Set([
  "file.name",
  "file.basename",
  "file.path",
  "file.folder",
  "file.ext",
  "file.size",
  "file.ctime",
  "file.mtime",
  "file.tags",
  "file.links",
  "file.backlinks",
  "file.embeds",
  "file.properties",
  "file.file",
]);

/** Top-level keys that only make sense in a chart spec; one must be present. */
const CHART_KEYS = [
  "mark",
  "layer",
  "hconcat",
  "vconcat",
  "concat",
  "repeat",
  "facet",
  "spec",
  "marks",
];

export interface PasteCheckInput {
  /** The text as pasted: may be wrapped in a ``` fence or have prose around it. */
  text: string;
  /** Property ids this base knows. */
  propertyIds: string[];
  /** The dataset name the view injects rows into (usually "base"). */
  datasetName: string;
}

export interface PasteCheck {
  /** The JSON (or YAML) that was found inside the pasted text. */
  source: string;
  spec: AnySpec | null;
  mode: Mode | null;
  /** Problems that stop the spec from being saved. */
  errors: string[];
  /** Things that will probably look wrong, but render. */
  warnings: string[];
}

/**
 * Pull the spec out of an assistant reply: the first fenced block if there is one, otherwise
 * everything from the first "{" to the last "}" when prose surrounds it.
 */
export function extractSpecText(raw: string): string {
  const text = raw.replace(/^\uFEFF/, "").trim();
  const fence = /```[\w-]*[ \t]*\r?\n([\s\S]*?)\r?\n?```/.exec(text);
  if (fence) return fence[1].trim();
  if (text.startsWith("{")) return text;
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : text;
}

/** Collect every object found under a `data` key (Vega-Lite object, Vega array), at any depth. */
function dataEntries(node: unknown, out: Array<Record<string, unknown>> = []): Array<Record<string, unknown>> {
  if (Array.isArray(node)) {
    for (const item of node) dataEntries(item, out);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "data") {
        for (const d of Array.isArray(v) ? v : [v]) {
          if (d && typeof d === "object" && !Array.isArray(d)) out.push(d as Record<string, unknown>);
        }
      }
      if (k !== "usermeta") dataEntries(v, out);
    }
  }
  return out;
}

function compileError(spec: AnySpec, mode: Mode, datasetName: string): string | null {
  try {
    // As at render time: the base dataset is declared for the spec if it doesn't declare it.
    const named = ensureNamedData(spec, mode, datasetName);
    const vg = mode === "vega-lite" ? compile(named as unknown as TopLevelSpec).spec : named;
    parse(vg);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export function checkPastedSpec(input: PasteCheckInput): PasteCheck {
  const source = extractSpecText(input.text);
  const result: PasteCheck = { source, spec: null, mode: null, errors: [], warnings: [] };

  const syntax = specTextError(source);
  if (syntax) {
    result.errors.push(source.length === 0 ? "Nothing to paste: the clipboard is empty." : `Not valid JSON: ${syntax}`);
    return result;
  }
  const parsed = parseJsonOrYaml(source) as Record<string, unknown>;
  if (!isBareSpec(parsed) || !CHART_KEYS.some((k) => k in parsed)) {
    result.errors.push("This doesn't look like a Vega or Vega-Lite spec: it has no mark, layer, concat, facet or marks.");
    return result;
  }
  const spec = parsed as AnySpec;
  const mode = detectMode(spec);
  result.spec = spec;
  result.mode = mode;

  if (typeof spec.$schema !== "string") {
    result.warnings.push(`No "$schema"; treating it as ${mode === "vega" ? "Vega" : "Vega-Lite"}.`);
  }

  const failure = compileError(spec, mode, input.datasetName);
  if (failure) result.errors.push(`${mode === "vega" ? "Vega" : "Vega-Lite"} rejects it: ${failure}`);

  const data = dataEntries(spec);
  const usesBase = data.some((d) => d.name === input.datasetName);
  const inlined = data.some((d) => Array.isArray(d.values) && d.name === undefined);
  // A Vega-Lite spec with no data at all gets the base injected (ensureNamedData).
  const injected = mode === "vega-lite" && spec.data === undefined && !("datasets" in spec);
  if (inlined) {
    result.warnings.push(`It inlines its own "values", so those rows show instead of this base's notes.`);
  } else if (!usesBase && !injected) {
    result.warnings.push(`It never reads the "${input.datasetName}" dataset, so this base's notes won't appear.`);
  }

  const known = new Set(input.propertyIds);
  const unknown = referencedProperties(spec).filter((id) => !known.has(id) && !FILE_PROPERTIES.has(id));
  if (unknown.length > 0) {
    result.warnings.push(`Not in this base: ${unknown.join(", ")}. Those fields will be empty.`);
  }
  return result;
}

/** A file name from the spec's title or description, ending in .vl.json or .vg.json. */
export function pastedFileName(spec: AnySpec, mode: Mode): string {
  const title = spec.title;
  const text =
    typeof title === "string"
      ? title
      : title && typeof title === "object" && typeof (title as { text?: unknown }).text === "string"
        ? (title as { text: string }).text
        : typeof spec.description === "string"
          ? spec.description
          : "";
  const stem = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .split("-")
    .slice(0, 6)
    .join("-");
  return `${stem || "chart"}.${mode === "vega" ? "vg" : "vl"}.json`;
}
