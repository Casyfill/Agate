import type { AnySpec } from "./types";

/**
 * The `usermeta.agate` contract (ADR-0003 D3): every key a spec can set there, in one place.
 * Vega and Vega-Lite carry `usermeta` through untouched, so these travel with the spec file.
 * Dataset names given here must differ from the rows dataset (`base` unless the view says otherwise).
 */
export const AGATE_KEYS = {
  rowData: "{name, from, format?} or a list: one dataset loaded from each row's file/URL property",
  cells: "dataset name: one record per row × visible property, in Properties-menu order (Bases view only)",
  edges: "dataset name: links between the base's notes",
  tree: "dataset name: the folder hierarchy of the base's notes",
  open: '"click" or "dblclick": opens the note behind a mark',
  textures: "{name: texture}: SVG hatching and dot fills a mark uses as url(#name) (SVG renderer)",
  output: '"stats": render the first mark\'s rows as big numbers in note text (experimental)',
  recipe: "recipe definition: name, roles, description (recipe files only)",
  fromRecipe: "{id, roles}: written by Agate when a spec is made from a recipe",
} as const;

/** `spec.usermeta.agate` as an object, or undefined when absent or malformed. */
export function agateMeta(spec: AnySpec): Record<string, unknown> | undefined {
  const meta = spec.usermeta as Record<string, unknown> | undefined;
  const agate = meta && typeof meta === "object" ? meta.agate : undefined;
  return agate && typeof agate === "object" && !Array.isArray(agate) ? (agate as Record<string, unknown>) : undefined;
}

/** Keys under `usermeta.agate` that Agate doesn't know, usually typos (`rowdata`, `texture`). */
export function unknownAgateKeys(spec: AnySpec): string[] {
  return Object.keys(agateMeta(spec) ?? {}).filter((k) => !(k in AGATE_KEYS));
}
