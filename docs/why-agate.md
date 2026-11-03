# Why Agate

> Comparisons with other plugins come from their directory listings and READMEs as of October 2026.

## In short

Agate is for people who want dynamic, custom-looking visualizations of their notes, built on Obsidian's own Bases and the mature Vega and Vega-Lite ecosystem.

I wanted something built on existing, proven technology, yet versatile enough for graphics at the highest level and in the style I prefer. I think Agate comes pretty close.

### A few extras

Full disclosure: I'm opinionated, and Agate matches my preferences. It includes a few extras I wanted myself, even though they go beyond the plain Bases + Vega stack:

- Big numbers: live aggregates shown as note text rather than drawn marks. Unexpectedly, this became the feature I use most. ([guide](guide.md#11-experimental-big-numbers-as-note-text), [example spec](../demo-vault/tests/charts/stats-row-html.vl.json))
- Per-note data: a note can point to its own local or remote data file, which is handy for time series or live data on a topic. ([guide](guide.md#6-per-note-external-data), examples: [horizon table](../demo-vault/tests/charts/horizon-table.vg.json), [Gapminder](../demo-vault/charts/gapminder.vl.json))
- API keys kept in Obsidian's secret storage, mostly for basemap tiles under maps. ([guide](guide.md#basemaps-under-a-route), [hike dashboard](../demo-vault/charts/hike-dashboard.vl.json))
- Hatched and dotted fills, because I like them (SVG renderer only). ([guide](guide.md#textures-hatching-and-dots-svg-only), [redlining map](../demo-vault/charts/redlining-brooklyn.vl.json))

## What you can make

Every example below is a spec file in the repo vault with notes to match; `tests/Surfaces/12 Gallery` embeds them all, and the [website gallery](https://casyfill.github.io/Agate/gallery.html) has more. They run from collections of notes, through the links between them, to time and place.

| Example | What it shows | What it uses | Spec |
|---|---|---|---|
| Linked dashboard | Brush a timeline and the other panels filter | Vega-Lite selections across views, on top of the Bases toolbar filters | [`reading-dashboard.vl.json`](../demo-vault/tests/charts/reading-dashboard.vl.json) |
| Sankey | Notes flowing across three properties (genre → status → rating band) | Vega transforms | [`reading-sankey.vg.json`](../demo-vault/tests/charts/reading-sankey.vg.json) |
| Mood beeswarm | One dot per daily note, never overlapping, color and size from properties; click a dot to open the day | Force layout along a time axis, open on click | [`mood-beeswarm.vg.json`](../demo-vault/tests/charts/mood-beeswarm.vg.json) |
| Tooltip images | A cover picture in the tooltip, from a URL a formula builds per note | A tooltip field titled `image` | [`covers-tooltip.vl.json`](../demo-vault/tests/charts/covers-tooltip.vl.json) |
| Link graph | The notes of a base and the links between them, force-directed, colored by a property; hover lights up neighbors | Links from Obsidian's link index and Vega's force layout. Unlike the core graph view, the base decides which notes are in and properties drive size and color | [`link-graph.vg.json`](../demo-vault/tests/charts/link-graph.vg.json) |
| Arc diagram over time | The same links, notes placed on a timeline by creation date; long arcs are ideas reaching back | Links dataset plus a time scale | [`link-arcs.vg.json`](../demo-vault/tests/charts/link-arcs.vg.json) |
| Vault sunburst | DaisyDisk-style rings of folders sized by bytes; click to zoom into a folder, click a file to open it | The folder tree with totals, Vega's partition layout, open on click | [`vault-sunburst.vg.json`](../demo-vault/tests/charts/vault-sunburst.vg.json) |
| Travel globe | Trips as great-circle routes between place notes on an orthographic globe you drag to spin, or a flat projection | Vega's map projections; trips link places with ordinary `[[links]]` | [`travel-globe.vg.json`](../demo-vault/tests/charts/travel-globe.vg.json) |
| Horizon table | One row per note with its properties as columns and a cubism-style horizon chart of an external time series; hover runs a cursor across all rows | Per-note data (each note's CSV or URL), table cells that follow the Properties menu, dark-mode aware colors | [`horizon-table.vg.json`](../demo-vault/tests/charts/horizon-table.vg.json) |

How each one works, and the `usermeta.agate` switches they use (`rowData`, `cells`, `edges`, `tree`, `open`, `agateDark`), is in the [user guide](guide.md), sections 6 to 10.

## Why Vega and Vega-Lite

[Vega](https://vega.github.io/vega/) and [Vega-Lite](https://vega.github.io/vega-lite/) are languages for describing a chart as JSON. You say what the data is and how its fields map to marks, positions and colors, and the library draws it. Vega-Lite is the short form for most charts; Vega is the full language underneath, for custom layouts and interaction. Agate takes both.

### Mature and widely used

The University of Washington's Interactive Data Lab started Vega in 2013, and the Vega-Lite paper won the Best Paper Award at IEEE InfoVis 2017. The same specs run in Python through Altair, in JupyterLab and Observable notebooks, in Streamlit apps, in Kibana dashboards and in Power BI through Deneb. One grammar covers bar charts, maps and globes, force-directed networks, hierarchies, sankeys and linked dashboards, with tooltips, brushing and sliders, drawn as SVG or canvas and exportable as SVG or PNG. Hundreds of published examples ([Vega-Lite](https://vega.github.io/vega-lite/examples/), [Vega](https://vega.github.io/vega/examples/)) are there to copy and adapt, and the [online editor](https://vega.github.io/editor/) runs any spec outside Obsidian.

### Data, grammar and design kept apart

A spec keeps three things separate: where the rows come from (`data`), how fields turn into marks (`mark`, `encoding`, `transform`), and how it all looks (`config`, or a theme). Broadly, it's the split between HTML, JavaScript and CSS on a web page, and it means each part changes without touching the others:

- Same chart, different data: point a spec at another base and it draws your trips instead of your books.
- Same chart, different look: Agate's `auto` theme restyles every chart to match your vault and its light or dark mode; switch to one of Vega's stock themes, or your own, in one setting.
- Same data, different chart: a bar chart becomes a dot plot or a heatmap by changing the mark and an encoding or two.

### Plain files that assistants already know

Specs sit next to your notes, diff and version like any text, and keep working in the Vega editor, Altair or a notebook if you ever stop using Agate. And a decade of public specs means chat assistants and coding agents write and fix Vega-Lite well, which is what Agate's **Copy prompt for an LLM** and the `agate-chart` skill rely on.

## How Agate fits it into Obsidian

### Bases picks the notes

Bases is the query engine: filters, formulas, sort, grouping and the Properties menu already exist, Obsidian maintains them, and you know them. Agate adds no query syntax. The toolbar drives the chart without editing the spec, and selections survive those changes. Field names are the property ids you already see (`note.rating`, `formula.age`), and the chart appears wherever a base can: its own tab, an embed, a code block, the sidebar, Canvas.

### Your vault is data too

Links between notes and the folder tree reach a spec as datasets, so graphs, arc diagrams, sunbursts and treemaps follow the base's filter. Notes can point at data that lives outside the vault, because many notes stand for something measured elsewhere. And charts lead back into the vault: with `open: "click"`, clicking a point, an arc or a node opens its note.

### Specs stay portable

A spec file is plain Vega or Vega-Lite and runs in the Vega editor with sample rows. Agate's extras live under `usermeta`, which Vega ignores. Other plugins can extend Agate through its API (data schemes, expression functions, themes, spec preprocessors), and every example spec renders to SVG in CI.

## The alternatives

Agate is built on Vega and Vega-Lite and is opinionated about it: you get a full chart grammar, and in exchange charts are JSON specs. If Agate isn't your cup of tea (let me know why!), there are a few alternatives:

| Plugin | What it is | Good at | How it differs from Agate |
|---|---|---|---|
| [Charts View](https://community.obsidian.md/plugins/obsidian-chartsview-plugin) | Code blocks for Ant Design Charts (AntV), fed by Dataview, CSV files or inline data | Mature and widely used; a chart wizard; word clouds, treemaps, org charts and dual-axis charts out of the box | Reads Dataview, not Bases. Chart types and styling are whatever the library's options allow, and clicking a mark runs a search rather than opening the note |
| [Vega Visualizations](https://community.obsidian.md/plugins/obsidian-vega) | ```` ```vega ```` / ```` ```vega-lite ```` code blocks; the idea Agate grew from | The same grammar as Agate, with nothing extra to learn | Renders static specs: the data lives in the spec, with no connection to Bases, Dataview or your notes. Not updated in about three years |
| [Bases Charts](https://community.obsidian.md/plugins/bases-charts), and its ECharts fork [Bases Chart Views](https://community.obsidian.md/plugins/bases-chart-views) | Bases view types: pick an X property and numeric Y properties. Bases Charts draws scatter, line and bar; the fork adds area, pie and radar | Charts with no spec; Bases filters, sort and grouping apply | The chart is the plugin's own settings in the `.base` file, so it stops where its options stop and doesn't travel to other tools. The fork's AI Chart writes a free-form ECharts option, but that chart is drawn from the saved option rather than the live query |

## Limits

### Known limits

- Charts beyond the thirteen recipes mean writing or adapting Vega JSON, yourself or with an assistant, and the error messages are Vega's.
- `main.js` is about 0.9 MB because Vega, Vega-Lite and vega-embed are bundled.
- No charts inside core Table cells: Obsidian has no API for that yet, so Agate draws its own table layout instead.
- In Canvas, dragging a card wins over brushing inside the chart.
- Remote data is cached in memory only; every app start fetches again.
- Tested on desktop and iPhone; not yet on Android.
- Pre-1.0, one maintainer. Add-ons are tied to Agate's bundled Vega version.

### When to use something else

1. You don't want to use Bases, or to work with Vega specs. For a few standard charts configured by clicking, use Bases Charts; if you live in Dataview, use Charts View.
2. Your data is huge (millions of notes or rows).
3. You want interactive, Leaflet-style maps you pan and zoom.
4. You want analysis (models, joins across large datasets) rather than charts of your notes. Do it outside Obsidian and link the result.
