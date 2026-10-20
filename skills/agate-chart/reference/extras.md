# What Agate adds: `usermeta.agate` keys, basemaps, keys

All keys live under `"usermeta": {"agate": {…}}`. Several can be combined in one spec.

## `open`: click to open the note

```json
"usermeta": { "agate": { "open": "click" } }
```

`"click"` or `"dblclick"`. Works for any mark whose datum has `file.path` (base rows and every Agate dataset do). Cmd/Ctrl opens a new tab. Add `"cursor": "pointer"` to the mark.

## `rowData`: each note's own data

When each note stands for something with its own series (a stock, a hike's GPS track, a country), point a property at a file and Agate loads one dataset from all of them.

```json
"usermeta": { "agate": { "rowData": { "name": "series", "from": "note.data" } } },
"data": { "name": "series" }
```

- `from` is a property id: `note.data`, or a formula such as `formula.csv` that builds a URL.
- The property can hold a vault path or `[[link]]`, an `http(s)` URL (needs **Load remote data**), or a list (`[3, 4, 5]` becomes records `{index, value}`).
- Format comes from the extension (`.csv`, `.tsv`, `.json`); override with `"format": {"type": "csv"}` in the entry.
- Every record carries its note's `file`, `note`, `formula` and `rowIndex`, so group or facet on `file.name` or `rowIndex` for one line or strip per note. CSV values arrive as strings: convert with `toNumber()`.
- Examples: `demo-vault/charts/gapminder.vl.json` (one CSV per country), `demo-vault/charts/hike-dashboard.vl.json` (one GPS track per day), `demo-vault/tests/charts/horizon.vg.json` (FRED series by URL).

## `cells`: a table with a chart column

```json
"usermeta": { "agate": { "rowData": { "name": "series", "from": "formula.csv" }, "cells": "cells" } }
```

Dataset `cells` holds one record per note and visible property, with its display name, value and text, in the Properties menu's order. Lay them out as text columns and give the remaining width to a chart. Template: `demo-vault/tests/charts/horizon-table.vg.json`.

## `edges` and `tree`: the vault's structure

```json
"usermeta": { "agate": { "edges": "edges", "tree": "tree" } }
```

- `edges`: the links between the base's notes, from Obsidian's link index: `{source, target}` as row indices into `base`, plus `count`, `sourceName`, `targetName`, `sourcePath`, `targetPath`. Links to notes outside the base are left out, so the base's filter decides the graph. Use with Vega's `force` transform, or `lookup` in Vega-Lite.
- `tree`: one node per folder (root id `"/"`) and per note: `id` (the path), `parent`, `name`, `depth`, `kind` (`"folder"` or `"file"`), `ancestors`, `size`, `count`. Feed it to Vega's `stratify`, then `partition`, `treemap`, `tree` or `cluster`.
- Examples: `demo-vault/charts/people-graph.vg.json` (force graph), `demo-vault/charts/vault-links.vg.json` (hierarchical edge bundling: `tree` plus `edges`), `demo-vault/charts/vault-sunburst.vg.json` (partition).

## `output: "stats"`: headline numbers as note text

```json
"usermeta": { "agate": { "output": "stats" } }
```

Agate runs the spec without drawing it and shows the rows behind its **first mark** as big numbers in the note's own fonts. Each row needs `value` and `label` (strings); optional `note` (small line under it), `change` (a number or "+12%", shown with an up or down arrow) and `better: "down"` (when a fall is good news, for time or cost). Do the maths in Vega-Lite transforms: one `aggregate`, then fold the results into rows:

```json
"transform": [
  { "calculate": "toNumber(datum.note.pages)", "as": "pages" },
  { "aggregate": [{ "op": "count", "as": "n" }, { "op": "sum", "field": "pages", "as": "total" }] },
  { "calculate": "['books', 'pages']", "as": "key" },
  { "flatten": ["key"] },
  { "calculate": "datum.key === 'books' ? format(datum.n, ',') : format(datum.total, ',')", "as": "value" },
  { "calculate": "datum.key === 'books' ? 'books' : 'pages read'", "as": "label" }
],
"mark": "text",
"encoding": { "text": { "field": "value" } }
```

In Vega-Lite's `aggregate`, a dotted field such as `note.pages` is read as one flat name: copy nested fields out with `calculate` first, as above. The built-in **Headline numbers** recipe (`src/recipes/stats.json`) is a complete template; `demo-vault/charts/reading-stats.vl.json` and `hike-stats.vl.json` are real ones. The format is experimental.

## `textures`: hatching and dots (SVG renderer)

```json
"usermeta": { "agate": { "textures": {
  "hatch": { "orientation": "diagonal", "size": 6, "strokeWidth": 1.1, "stroke": "#b43a2c", "background": "#efcdc3" }
} } },
"encoding": { "color": { "field": "note.status", "scale": { "domain": ["finished", "abandoned"], "range": ["#44cf6e", "url(#hatch)"] } } }
```

Use `url(#name)` anywhere a colour goes, including scale ranges (the legend picks it up). Kinds, by `type`:

- `lines` (default): `orientation` `"vertical"`, `"horizontal"`, `"diagonal"`, or `"0/8"` to `"7/8"`; an array crosses them (`["diagonal", "6/8"]` is crosshatch). `size`, `strokeWidth`, `stroke`, `background`.
- `circles`: `radius`, `fill`, `background`, `size`, `complement: true` for a staggered denser grid.
- `paths`: `d` is `"squares"`, `"nylon"`, `"waves"`, `"woven"`, `"crosses"`, `"caps"`, `"hexagons"`, or a raw SVG path for one tile with `{s}` for the size.
- Any kind: `shapeRendering` (`"crispEdges"`), `rough` (wobble in px, 1 to 2, for a hand-drawn look).

SVG renderer only: with canvas each texture becomes its `background` colour. Exports and the online Vega editor don't show them. Example: `demo-vault/charts/redlining-brooklyn.vl.json` (a street grid under each grade colour, crosshatch for ungraded land).

## Basemaps: map tiles under your marks

Vega draws tiles itself as `image` marks placed by their corners in the same Web Mercator projection as the route. The pattern, from `demo-vault/charts/hike-dashboard.vl.json`:

1. From the data's extent, list the XYZ tiles that cover it at a fixed zoom (a `tz` signal).
2. For each tile compute its corner longitudes and latitudes and its URL in a `calculate`.
3. Draw them as `image` marks (`"aspect": false`, `"clip": true`) under the data layers.

Keyless sources: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` (satellite), `…/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}` (add `_Dark` for dark mode), `https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}`, `https://tile.opentopomap.org/{z}/{x}/{y}.png`. Keep an attribution line in the chart. Tiles are remote images: they load only with **Load remote data** on.

## API keys: `{env:NAME}`

Never put a key in a spec. Put a placeholder in the URL; Agate fills it from the OS environment when it fetches (desktop only):

```json
{ "calculate": "'https://api.maptiler.com/maps/outdoor-v2/256/' + tz + '/' + datum.x + '/' + datum.y + '.png?key={env:MAPTILER_KEY}'", "as": "url" }
```

The user must (1) set the variable where Obsidian sees it (macOS: `launchctl setenv MAPTILER_KEY …`, then restart Obsidian), (2) allow it for its host in Settings → Agate → **Environment variables in URLs** (`MAPTILER_KEY api.maptiler.com`), (3) turn on **Load remote data**. A name is filled only for its listed host. Works in `data.url`, `rowData` URLs and image marks. On mobile it fails with an error naming the variable, so offer a keyless fallback (a `basemap` select param).

## Signals Agate sets

- `agateDark`: declare a Vega signal or Vega-Lite param `{"name": "agateDark", "value": false}`; Agate sets it to true in dark mode. Use it to flip a colour ramp or pick a dark tile set.
- `agateColors`: declare `{"name": "agateColors", "value": {…defaults…}}`; Agate fills it with the theme's colours (`reference/look.md`).
