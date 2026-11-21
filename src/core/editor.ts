import type { AnySpec, Mode, Row } from "./types";
import { cloneSpec, ensureNamedData, withInitialValues } from "./spec";
import { agateMeta } from "./usermeta";

/** Rows per dataset written into a spec for the online editor; more would make the clipboard sluggish. */
export const EDITOR_ROW_CAP = 5000;

/**
 * The spec with Agate's datasets written into it, so it renders as-is in the online Vega
 * editor (vega.github.io/editor). The names go in `usermeta.agate.inlined`, which tells
 * Paste spec to take the rows out again (stripInlined). Theme and environment signals are
 * left out: the editor shows the spec's own defaults, and nothing Obsidian-specific comes back.
 */
export function specForEditor(
  spec: AnySpec,
  mode: Mode,
  datasets: Record<string, Row[]>,
  cap = EDITOR_ROW_CAP,
): { spec: AnySpec; truncated: string[] } {
  let out = cloneSpec(spec);
  const truncated: string[] = [];
  const capped: Record<string, Row[]> = {};
  for (const [name, rows] of Object.entries(datasets)) {
    if (rows.length > cap) truncated.push(name);
    capped[name] = cloneSpec(rows.slice(0, cap));
  }
  const names = Object.keys(capped);
  if (names.length > 0) out = ensureNamedData(out, mode, names[0]);
  if (mode === "vega-lite") {
    // Top-level `datasets` reaches every `{"name": …}`, in layers and concats too.
    out.datasets = { ...(out.datasets as Record<string, unknown> | undefined), ...capped };
  } else {
    for (const name of names) out = withInitialValues(out, mode, name, capped[name]);
  }
  const usermeta = (out.usermeta ?? {}) as Record<string, unknown>;
  out.usermeta = { ...usermeta, agate: { ...agateMeta(out), inlined: names } };
  return { spec: out, truncated };
}

/**
 * Undo specForEditor on a pasted spec: drop the rows it wrote and its `inlined` marker. Rows under
 * `baseName` go too, marker or not (an LLM or a rewrite may drop `usermeta`): the base supplies them.
 * Mutates `spec`.
 */
export function stripInlined(spec: AnySpec, baseName?: string): AnySpec {
  const agate = agateMeta(spec);
  const marked = Array.isArray(agate?.inlined) ? (agate.inlined as unknown[]).filter((n): n is string => typeof n === "string") : [];
  const names = baseName ? [...marked, baseName] : marked;
  if (names.length === 0) return spec;
  const datasets = spec.datasets as Record<string, unknown> | undefined;
  if (datasets && typeof datasets === "object") {
    for (const n of names) delete datasets[n];
    if (Object.keys(datasets).length === 0) delete spec.datasets;
  }
  const data = Array.isArray(spec.data) ? spec.data : spec.data && typeof spec.data === "object" ? [spec.data] : [];
  for (const d of data as Array<Record<string, unknown>>) {
    if (d && typeof d.name === "string" && names.includes(d.name)) delete d.values;
  }
  if (!agate || !("inlined" in agate)) return spec;
  delete agate.inlined;
  const usermeta = spec.usermeta as Record<string, unknown>;
  if (Object.keys(agate).length === 0) delete usermeta.agate;
  if (Object.keys(usermeta).length === 0) delete spec.usermeta;
  return spec;
}
