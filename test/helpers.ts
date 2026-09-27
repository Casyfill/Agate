import type { Value } from "obsidian";

/**
 * Hide the mock's raw `value` field so Agate has to fall back to toString(), the way it
 * would against a runtime whose private fields have minified names.
 */
export function opaque<T extends Value>(v: T): T {
  const rec = v as unknown as Record<string, unknown>;
  const str = v.toString();
  for (const k of Object.keys(rec)) delete rec[k];
  Object.defineProperty(v, "toString", { value: () => str });
  return v;
}
