import type { Row } from "./types";
import type { PropertyInfo } from "./recipes";

/**
 * "Copy chart prompt" (ADR-0001 D13): everything an LLM needs to write a working Agate spec
 * for this base, to paste into any assistant. Agate makes no network call and holds no key.
 */
export interface PromptInput {
  viewName: string;
  datasetName: string;
  properties: PropertyInfo[];
  rows: Row[];
  /** How many rows to include as samples. */
  samples?: number;
}

/** Keep only the properties that are listed, so a sample row is small and on topic. */
function trimRow(row: Row, ids: Set<string>): Row {
  const out: Row = {};
  for (const group of ["file", "note", "formula"] as const) {
    const g = row[group];
    if (!g || typeof g !== "object") continue;
    const kept: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(g as Record<string, unknown>)) {
      if (ids.has(`${group}.${k}`) || (group === "file" && (k === "name" || k === "path"))) kept[k] = v;
    }
    if (Object.keys(kept).length > 0) out[group] = kept;
  }
  if (row.group !== undefined) out.group = row.group;
  return out;
}

export function buildChartPrompt(input: PromptInput): string {
  const { viewName, datasetName, properties, rows } = input;
  const n = Math.min(input.samples ?? 3, rows.length);
  const ids = new Set(properties.map((p) => p.id));
  const props = properties
    .map((p) => `- \`${p.id}\` (${p.type ?? "empty"})${p.label && p.label !== p.id ? `, shown as "${p.label}"` : ""}`)
    .join("\n");
  const samples = rows
    .slice(0, n)
    .map((r) => JSON.stringify(trimRow(r, ids)))
    .join("\n");

  return `I use Obsidian with the Agate plugin, which renders Vega and Vega-Lite specs over an Obsidian Bases view. Write a chart spec for me.

## What I want

<describe the chart here: what it should show, and anything about colours, size or interaction>

## Data

The spec receives the notes of an Obsidian base (view "${viewName}"), ${rows.length} notes, as a dataset named \`${datasetName}\`. Reference it as \`{"data": {"name": "${datasetName}"}}\` (Vega-Lite) or a data entry \`{"name": "${datasetName}"}\` (Vega). Do not inline values.

Each row is one note. Field names are Bases property ids, nested by prefix: \`note.*\` (frontmatter), \`file.*\` (file.name, file.path, file.ctime, file.mtime, file.size, file.tags), \`formula.*\` (base formulas), and \`group\` when the view is grouped. In Vega-Lite use them as field strings ("note.rating"); in expressions use datum["note"]["rating"].

Properties in this base:
${props}

Sample rows:
${samples || "(the view has no rows)"}

Dates arrive as ISO strings (use "type": "temporal" or toDate()). Links arrive as paths or "[[...]]" strings. Lists arrive as arrays.

## Rules

- Prefer Vega-Lite v6 ("$schema": "https://vega.github.io/schema/vega-lite/v6.json"); use Vega v6 only for layouts Vega-Lite lacks (force, tree, partition, custom geo).
- Leave out "width" for a single Vega-Lite view (it fills the pane); give facets and concats explicit widths.
- Do not set "background" or colours for axes and text; the Obsidian theme supplies them.
- Use "sort": null on a discrete axis to keep the Bases sort order.
- Optional Agate extras go under "usermeta": {"agate": {...}}:
  - "open": "click" opens the note behind a clicked mark (marks whose datum has file.path);
  - "edges": "edges" adds a dataset of links between these notes ({source, target} as row indices, count);
  - "tree": "tree" adds the folder hierarchy (id, parent with root "/", depth, ancestors, size, count) for stratify;
  - "rowData": {"name": "series", "from": "note.data"} loads a CSV/JSON path or URL from that property for every note into dataset "series", each record carrying its note's file/note/formula fields and rowIndex.
- A Vega signal or Vega-Lite param named "agateDark" with a plain "value" is set to true in dark mode.

Reply with the JSON spec only.`;
}
