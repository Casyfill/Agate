import type { Row } from "./types";
import type { PropertyInfo } from "./recipes";

/**
 * "Copy chart prompt" (ADR-0001 D13): everything an LLM needs to write a working Agate spec
 * for this base, to paste into any assistant. Agate makes no network call and holds no key.
 */
/** What the chart will run on, so the assistant stays inside these versions and settings. */
export interface PromptEnvironment {
  agate: string;
  obsidian: string;
  vega: string;
  vegaLite: string;
  vegaEmbed: string;
  renderer: "svg" | "canvas";
  allowRemote: boolean;
}

export interface PromptInput {
  viewName: string;
  datasetName: string;
  properties: PropertyInfo[];
  rows: Row[];
  /** How many rows to include as samples. */
  samples?: number;
  env?: PromptEnvironment;
}

const major = (v: string): string => v.split(".")[0] || "6";

function environmentSection(env: PromptEnvironment): string {
  return `## Environment

- Agate ${env.agate} on Obsidian ${env.obsidian}, rendering with Vega ${env.vega}, Vega-Lite ${env.vegaLite} and vega-embed ${env.vegaEmbed} (${env.renderer} renderer). Use only features these versions support; when unsure whether something exists in them, pick the older, well-established form.
- Remote data: ${
    env.allowRemote
      ? "URLs starting with http(s) in data.url or rowData are allowed."
      : 'URLs starting with http(s) are blocked (the user has "Load remote data" off); load data from vault paths instead.'
  } A relative data.url such as "data/sales.csv" is read from the vault and resolves like a link.
- Tooltips use vega-tooltip: a tooltip field titled "image" is drawn as a picture (an image URL), one titled "title" becomes the heading.

`;
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
  const { viewName, datasetName, properties, rows, env } = input;
  const vlMajor = env ? major(env.vegaLite) : "6";
  const vgMajor = env ? major(env.vega) : "6";
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

${env ? environmentSection(env) : ""}## Rules

- Prefer Vega-Lite v${vlMajor} ("$schema": "https://vega.github.io/schema/vega-lite/v${vlMajor}.json"); use Vega v${vgMajor} ("https://vega.github.io/schema/vega/v${vgMajor}.json") only for layouts Vega-Lite lacks (force, tree, partition, custom geo).
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

/**
 * "Copy theme prompt" (companion to the chart prompt): everything an LLM needs to write a static Vega
 * `config` theme that matches the user's Obsidian theme and current overrides, to paste into the
 * "Theme file" setting. Agate makes no network call and holds no key.
 */
export interface ThemePromptInput {
  colors: Record<string, string>;
  fonts: { interface: string; text: string; mono: string; textSize: number };
  /** The user's current "Config overrides" setting, if any, so the assistant keeps what still applies. */
  currentOverrides?: string;
  /** Where the result goes, shown in the instruction. */
  themeFilePath?: string;
  env?: PromptEnvironment;
}

export function buildThemePrompt(input: ThemePromptInput): string {
  const { colors, fonts, currentOverrides, themeFilePath, env } = input;
  const vgMajor = env ? major(env.vega) : "6";
  const palette = Object.entries(colors)
    .map(([role, hex]) => `- ${role}: ${hex}`)
    .join("\n");
  const overrides = currentOverrides?.trim();
  const target = themeFilePath?.trim() || "agate/theme.json";

  return `I use Obsidian with the Agate plugin, which renders Vega and Vega-Lite specs over an Obsidian Bases view. A "theme" in Agate is a plain Vega \`config\` object (no data, no marks, no $schema) that is merged under every chart. Write one for me.

## What I want

<describe the look: mood, contrast, whether the background should be transparent or a colour, any fonts or accent to lean on>

## My Obsidian theme

Match or tastefully complement these. Colours (role: value):
${palette}

Fonts: interface "${fonts.interface}", reading "${fonts.text}", monospace "${fonts.mono}"; base text size ${fonts.textSize}px.
${
  overrides
    ? `
## My current overrides

Keep what still applies and fold it into the result:

\`\`\`json
${overrides}
\`\`\`
`
    : ""
}
## How Agate will use it

I'll save your reply to the "Theme file" setting (\`${target}\`), where it applies to every chart in the vault. Unlike Agate's built-in dynamic \`obsidian\` theme, this file is a fixed snapshot: it will not re-derive from my theme when I switch light and dark, so pick colours that read on my background.

## Rules

- Output a single Vega \`config\` object valid for Vega v${vgMajor}. No \`$schema\`, \`data\`, \`marks\` or top-level chart keys.
- Set \`background\` (use "transparent" to sit on the Obsidian pane, or a colour if the look needs one).
- Cover the usual keys: \`title\`, \`axis\` (labelColor, titleColor, domainColor, tickColor, gridColor, labelFont, titleFont, and label/title font sizes), \`legend\`, \`header\`, \`view\` (stroke "transparent"), \`mark\` (color), \`text\` (color), and \`range.category\` as an array of distinct, legible hues.
- Prefer the \`font\` keys over hard-coding one weight; keep sizes proportional to the base text size above.

Reply with the JSON config object only.`;
}
