# Agate user guide

> Draft, 2026-10-06. Not reviewed. Section numbers and examples may change before 0.1.0.

Agate draws Vega and Vega-Lite charts from Obsidian Bases. Bases decides which notes are in, in what order and grouped how; Agate turns those notes into rows and hands them to a Vega spec. This guide covers getting a first chart on screen, building your own, working quickly, and the less obvious features: per-note external data, table layouts, dark mode and images in tooltips.

## 1. Install

Agate needs Obsidian 1.13 or newer with the Bases core plugin turned on.

Until Agate is in the community directory, install it with [BRAT](https://github.com/TfTHacker/obsidian42-brat): Settings → BRAT → Add beta plugin → `Casyfill/Agate`. Or download `main.js`, `manifest.json` and `styles.css` from a GitHub release into `<vault>/.obsidian/plugins/agate/` and enable Agate under Community plugins.

To try everything in this guide without touching your own vault, open the repo's `demo-vault/` as a vault and start with `Start here.md` (examples for every surface are in `tests/`).

## 2. Your first chart (five minutes)

The fastest way: open a base, add a view, set its layout to **Agate chart**. The empty view offers two buttons.

- **Pick a recipe** lists ready-made charts (timeline, bars, scatter, histogram, line over time, calendar heatmap, folder sunburst, link graph, arc diagram, travel globe, sankey, beeswarm). Pick one and Agate asks which of the base's properties to use for each part ("When", "Colour by"), offering only properties of the right type, then writes the spec into your spec folder and points the view at it. The same picker is in the command palette: **New chart from recipe**.
- **Copy prompt for an LLM** copies a description of this base (its properties and their types, three sample rows, how Agate passes data, the extras) to the clipboard. Paste it into any AI assistant, say what chart you want, and save the reply as a `.vl.json` file in your spec folder. If the chart errors, the error box has a **Copy error** button for the next round.

Your own recipes: set **Recipe folder** in Settings → Agate, and any spec in it with a `usermeta.agate.recipe` block joins the picker. `demo-vault/tests/charts/recipes/count-by-decade.vl.json` is a small example; the format is described in the architecture doc (D13).

By hand:

1. Make sure you have a base. Any `.base` file works; a simple one is "all notes tagged `book`".
2. Create a spec file, for example `charts/ratings.vl.json`:

   ```json
   {
     "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
     "data": { "name": "base" },
     "mark": { "type": "bar", "tooltip": true },
     "encoding": {
       "y": { "field": "note.genre", "type": "nominal", "sort": null },
       "x": { "aggregate": "mean", "field": "note.rating", "type": "quantitative" }
     }
   }
   ```

3. Open the base, add a view, set its layout to **Agate chart** (the rounded-square icon with a rising line), open the view options and pick the spec file.
4. Filter, sort and group from the Bases toolbar. The chart follows without redrawing from scratch, so selections survive.

Embed the view anywhere with `![[Books.base#Ratings]]`, or drop the base onto a Canvas.

### How fields are named

Every note becomes one row. Field names are the Bases property ids you already see in the toolbar:

| In Bases | In the spec | Example value |
|---|---|---|
| a note property | `note.rating` | `4` |
| a file property | `file.name`, `file.path`, `file.mtime` | `"Dune"` |
| a formula | `formula.age` | `61` |
| the group, when grouped | `group` | `"sci-fi"` |

Agate converts the properties the spec mentions even if they are hidden in the Properties menu, so hiding a column never breaks a chart.

## 3. Charts inside notes

The ```` ```agate ```` code block renders a spec in a note. Three forms:

````markdown
```agate
{ "mark": "bar", "data": { "values": [{"a": "x", "b": 3}] }, "encoding": { … } }
```
````

````markdown
```agate
spec: charts/ratings.vl.json
data: [{ "note": { "genre": "sci-fi", "rating": 5 } }]
```
````

````markdown
```agate
spec: ratings.vl.json
base: Library/Books.base
view: Table
```
````

The first is a bare spec. The second adds inline rows. The third pulls rows from a base's query, reusing that view's filters and property order; it renders a hidden Bases view underneath, which is why the Bases toolbar shows above such charts.

## 4. Building a new visualisation

The fastest path is to start from something that already works and change it in small steps.

1. Find a close example in the [Vega-Lite gallery](https://vega.github.io/vega-lite/examples/) (or the [Vega gallery](https://vega.github.io/vega/examples/) for custom layouts).
2. Replace its `data` with `{ "name": "base" }` and its field names with `note.…`, `file.…` or `formula.…`.
3. Save it as a file in your spec folder, not as an inline spec. Agate watches spec files, so every save redraws every chart that uses it. Keep the note with the chart open in a split next to the spec.
4. When a field comes out empty, run **Agate: Debug: dump first Bases row** from the command palette and look at the console (Cmd/Ctrl+Opt+I). It prints the raw Bases values and the converted row, which tells you the exact field names and types.
5. For harder layouts, prototype in the [Vega editor](https://vega.github.io/editor/): paste the dumped row as inline `values`, get it right there, then switch back to `{ "name": "base" }`.

Things that trip people up:

- Vega-Lite sorts discrete axes alphabetically. Add `"sort": null` to keep the order rows arrive in, so the Bases Sort menu controls bar order.
- A single Vega-Lite view without `width` fills its pane. Facets, concat and repeat need an explicit width.
- Dates arrive as ISO strings; use `"type": "temporal"` and Vega parses them.
- Prefer a Bases formula over a Vega transform when the calculation is about one note (age, decade, a URL). It shows up in the Bases table too, and the spec stays short.

## 5. Working quickly

- Set **Default spec folder** (Settings → Agate) to `charts`. Then `spec: ratings.vl.json` finds `charts/ratings.vl.json` from any note.
- Write one spec, use it in many views. The same file can back a filtered view, a grouped one and an embed in a daily note; Bases handles the differences.
- Set the look once: the `obsidian` theme follows your Obsidian theme and light/dark mode. Use **Config overrides** for vault-wide tweaks (fonts, a mark colour) instead of repeating them in every spec.
- Per-chart overrides (theme, renderer, interactive, export menu) live in the view options of a base, or as envelope keys in a block.
- In Canvas, dragging the card beats dragging inside the chart. Prefer hover tooltips over brushes there, or set `interactive: false` for a static picture.
- Turn on **Export menu** when you want SVG/PNG out of a chart.
- Put an embedded Agate view in a note template (`![[Projects.base#Burn-down]]`) to get the same chart in every new note.

## 6. Per-note external data

Sometimes each note stands for something whose data lives elsewhere: a stock, a weather station, a sensor, a project with its own CSV export. Bases formulas cannot fetch anything, so Agate does it: a spec can ask for one extra dataset, built by loading a file or URL for every row.

### The three steps

1. Give each note a pointer: either a property that holds the location (`data: "[[sales-2026.csv]]"`, `data: https://example.com/x.csv`) or an id the base can turn into one (`fred: SP500`).
2. Optionally, build the location with a formula in the base, so notes stay short:

   ```yaml
   formulas:
     csv: '"https://fred.stlouisfed.org/graph/fredgraph.csv?id=" + fred'
   ```

3. Declare it in the spec under `usermeta`, which Vega and Vega-Lite both carry along untouched:

   ```json
   "usermeta": { "agate": { "rowData": { "name": "series", "from": "formula.csv" } } }
   ```

Dataset `series` now holds every loaded record of every row, and each record carries its note's `file`, `note`, `formula`, `group` and a `rowIndex` (its position in the Bases order). Draw one small chart per note by grouping or faceting on `rowIndex` or `file.name`.

### What the pointer can be

| Property value | What Agate does |
|---|---|
| a vault path or a link, `[[data/x.csv]]` | reads the file from the vault |
| an `http(s)` URL | fetches it, if **Load remote data** is on |
| a URL with a custom scheme, `myplugin://…` | asks the add-on that registered the scheme |
| a list, `[3, 4, 4, 5]` | uses it directly as records `{index, value}` |
| empty | the row contributes nothing |

The format comes from the extension (`.csv`, `.tsv`, `.json`); otherwise Agate sniffs the text. Override with `"format": {"type": "csv"}` in the `rowData` entry.

### Behaviour worth knowing

- Remote URLs are off by default; nothing leaves your machine until you turn on **Load remote data**.
- Responses are cached in memory for 10 minutes. **Agate: Refresh remote data and re-render charts** clears the cache.
- At most two requests run at once per site, with two retries on network errors and server errors.
- One failing note leaves its row empty and logs a warning; the chart shows an error only when every row fails, and the message names the URL.

The worked example is `demo-vault/tests/Markets`: twelve notes, one per FRED series, drawn as a table with a cubism-style horizon column (`tests/charts/horizon-table.vg.json`).

## 7. A table with a chart column

Add `"cells": "cells"` next to `rowData` and Agate also hands the spec the view's visible properties: one record per note and column, with the display name, the value and its text. The spec can then lay out text columns that follow the Bases Properties menu (show, hide, reorder) and give the rest of the width to a chart. `charts/horizon-table.vg.json` is the template.

## 8. Theme, dark mode and colour

- Theme `obsidian` derives fonts, text colours, gridlines and a category palette from your Obsidian theme, and redraws when you switch light/dark.
- Theme `instrument` is `obsidian` redrawn as a monochrome readout, after the demo vault's hike dashboard: the theme's monospace font, ink-coloured marks and small filled dots, no axis lines or ticks, dotted grids, numeric y labels inside the plot, axis titles as small labels above each plot, and the accent for selections. It suits dense time series and small multiples; pick it per chart (the view's **Theme** option) or vault-wide.
- The other themes are Vega's stock themes, most with a fixed white background.
- A spec that declares a signal (Vega) or param (Vega-Lite) named `agateDark` with a plain `value` gets `true` in dark mode. The horizon examples use it to reverse their colour ramp so small changes stay close to the background. In the Vega editor the spec's own default applies.
- A spec that declares `agateColors` (a plain `value` object, used as the defaults outside Obsidian) gets the active theme's colours by role: `text`, `muted`, `faint`, `background`, `border`, `accent`, and the named colours `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`. Use them in expressions, e.g. `"color": {"expr": "agateColors.yellow"}` or a halo in `agateColors.background`. Charts re-render when the theme changes. The hike dashboard in `demo-vault/charts/` uses no other colours.

## 9. Images in tooltips

A tooltip field titled `image` is drawn as a picture, and one titled `title` becomes the heading. Point it at a note property or formula that holds an image URL:

```json
"tooltip": [
  { "field": "file.name", "title": "title" },
  { "field": "formula.cover", "title": "image" },
  { "field": "note.author", "title": "Author" }
]
```

The repo vault's `tests/Library/Books.base` builds `formula.cover` from each book's ISBN with Open Library's covers service (`tests/Surfaces/11 Tooltip images`). Images load the way any remote image in a note does; **Load remote data** governs chart data only.

## 10. Gallery: structure, maps, flows

These examples use Vega layouts that other Obsidian chart plugins do not have. Each is a spec in `demo-vault/tests/charts/` with notes to match; open `tests/Surfaces/12 Gallery` in that vault to see them all.

| Example | Spec | Data it needs | Agate extras |
|---|---|---|---|
| DaisyDisk-style vault sunburst, click to zoom | `vault-sunburst.vg.json` | any base; a base with no filters covers the vault | `tree` |
| Link graph (force layout) | `link-graph.vg.json` | notes that link to each other, a `topic` property | `edges`, `open` |
| Arc diagram over time | `link-arcs.vg.json` | linked notes with a `created` date | `edges`, `open` |
| Travel globe, great-circle routes | `travel-globe.vg.json` | place notes with `lat`/`lon`, trip notes with `from:`/`to:` links | `open` |
| Sankey (genre → status → rating) | `reading-sankey.vg.json` | any categorical properties; change the three formulas | none |
| Linked dashboard (brush filters other panels) | `reading-dashboard.vl.json` | books with `published`, `genre`, `pages`, `rating` | `open` |
| Mood beeswarm | `mood-beeswarm.vg.json` | daily notes with `date`, `mood`, `energy`, `sleep` | `open`, `agateDark` |

The extras, all declared under `usermeta.agate` in the spec:

- `"edges": "edges"` adds a dataset of links between the notes of the base (`source`, `target` as row positions, `count`, names and paths). Links to notes outside the base are left out, so the filter decides the graph.
- `"tree": "tree"` adds the folder hierarchy: one node per folder (root `/`) and per note, with `parent`, `depth`, `ancestors`, and `size` and `count` totals. Feed it to Vega's `stratify` and then `partition`, `treemap` or `tree`.
- `"open": "click"` opens the note behind a mark when it is clicked (Cmd/Ctrl for a new tab). It works for any mark whose data carries `file.path`, which base rows and every Agate dataset do.

## 11. Experimental: big numbers as note text

A row of headline numbers (books read, mean rating, pages) can be drawn by Vega as text marks, but SVG text does not wrap, cannot be selected and uses the chart font. Add one line to the spec instead:

```json
"usermeta": {"agate": {"output": "stats"}}
```

Agate then runs the spec without drawing it and shows the rows behind its first mark as HTML: each row's `value` large, its `label` small under it, and an optional `note`. Vega still does all the work (filters, aggregates, formatting), the numbers follow the base like any chart, and they wrap and select like note text in the note's own fonts. Outside Agate the spec draws its own marks, so give it a simple text layer as a fallback. `demo-vault/tests/Surfaces/13 Stats.md` shows both approaches side by side; the specs are `tests/charts/stats-row-vega.vl.json` and `stats-row-html.vl.json`.

Rows can also carry a secondary value. A numeric `change` is shown with an arrow for its direction (▲ 0.4, ▼ −3), in the theme's green when it is good news and red when not; up is good unless the row says `better: "down"` (for time, cost, errors). A text `change` such as "+12%" gives its direction by its sign. Put what it is compared against in `note`.

Two things to know. In Vega-Lite's `aggregate`, a field written `note.rating` is read as one flat name, so copy nested fields out with a `calculate` first. And the format may still change: this is experimental.

## 12. Troubleshooting

| You see | Likely cause |
|---|---|
| "No spec yet." | The Agate view has no spec file or inline spec; open the view options. |
| Empty chart, no error | Field names do not match. Run the dump command and compare. |
| Bars in alphabetical order | Missing `"sort": null` on the discrete axis. |
| "Remote URL blocked" | Turn on **Load remote data**. |
| `net::ERR_…` in a per-row error | Network or proxy problem; open the URL from the message in a browser. |
| White box in dark mode | The vault theme is a stock Vega theme; switch to `obsidian`. |
| Chart did not pick up a spec edit | Inline specs are not watched; move it to a file, or reopen the note. |

## 13. Further reading

- `README.md`: overview, settings, limits, API for plugin authors.
- `docs/adr/0001-architecture-and-roadmap.md`: how it works and why (D3 surfaces, D4 rows, D7 API, D11 settings, D12 per-row data).
- `docs/why-agate.md`: how Agate compares with other ways to chart in Obsidian.
- `docs/future-features.md`: what might come next.
