# Why Agate

> Draft, 2026-10-06 (gallery added the same day). Not reviewed. Claims about other plugins come from their listings and READMEs as of this date and need checking before this is published anywhere.

## The short version

Agate is for people who want charts over their notes and are willing to write a chart spec to get exactly the chart they mean. Bases picks the notes; Vega draws them. Nothing in between invents a query language or a chart model of its own.

If you want a bar chart in two clicks and never want to see JSON, one of the simpler Bases chart plugins will serve you better. If you want a horizon table of twelve market series pulled live from FRED, a map of your travels on a globe you can spin, a picture of how your notes link up over time, a brushable scatter plot, or a chart that looks the same in your vault and in a paper, Agate is built for that.

## What you can build with Agate and not with the others

Every example below is a spec file in the repo's test vault with notes to match; `Surfaces/12 Gallery` in the test vault embeds them all. As far as their listings show, none of the Bases chart plugins draws any of these.

| Example | What it shows | Why it needs Agate | Spec |
|---|---|---|---|
| Horizon table | One row per note with its properties as columns and a cubism-style horizon chart of an external time series; hover runs a cursor across all rows | Per-row data (each note's CSV or URL), table cells that follow the Properties menu, dark-mode aware colours | [`horizon-table.vg.json`](../test-vault/charts/horizon-table.vg.json) |
| Vault sunburst | DaisyDisk-style rings of folders sized by bytes; click to zoom into a folder, click a file to open it | The folder tree with totals, Vega's partition layout, open on click | [`vault-sunburst.vg.json`](../test-vault/charts/vault-sunburst.vg.json) |
| Link graph | The notes of a base and the links between them, force-directed, coloured by a property; hover lights up neighbours | Links between the base's notes from Obsidian's link index; Vega's force layout. Unlike the core graph view, the base decides which notes are in and properties drive size and colour | [`link-graph.vg.json`](../test-vault/charts/link-graph.vg.json) |
| Arc diagram over time | The same links, notes placed on a timeline by creation date; long arcs are ideas reaching back | Links dataset plus a time scale | [`link-arcs.vg.json`](../test-vault/charts/link-arcs.vg.json) |
| Travel globe | Trips as great-circle routes between place notes on an orthographic globe you drag to spin, or a flat projection | Vega's map projections; trips link places with ordinary `[[links]]` | [`travel-globe.vg.json`](../test-vault/charts/travel-globe.vg.json) |
| Sankey | Notes flowing across three properties (genre → status → rating band) | Built from Vega transforms; no chart plugin option list can express it | [`reading-sankey.vg.json`](../test-vault/charts/reading-sankey.vg.json) |
| Linked dashboard | Brush a timeline and the other panels filter | Vega-Lite selections across views, on top of the Bases toolbar filters | [`reading-dashboard.vl.json`](../test-vault/charts/reading-dashboard.vl.json) |
| Mood beeswarm | One dot per daily note, never overlapping, colour and size from properties; click a dot to open the day | Force layout along a time axis, open on click | [`mood-beeswarm.vg.json`](../test-vault/charts/mood-beeswarm.vg.json) |
| Tooltip images | A cover picture in the tooltip, from a URL a formula builds per note | A tooltip field titled `image` | [`covers-tooltip.vl.json`](../test-vault/charts/covers-tooltip.vl.json) |

How each one works, and the `usermeta.agate` switches they use (`rowData`, `cells`, `edges`, `tree`, `open`, `agateDark`), is in the [user guide](guide.md), sections 6 to 10.

## What Agate bets on

1. Bases is the query engine. Filters, formulas, sort, grouping and the Properties menu already exist, are maintained by Obsidian, and users know them. Agate adds no query syntax.
2. Vega and Vega-Lite are the chart grammar. They are declarative, documented, have a large example gallery and an online editor, and cover statistical charts, maps, custom layouts and interaction.
3. Specs stay portable. A spec file is plain Vega or Vega-Lite; it runs in the Vega editor with sample rows. Agate's extras live under `usermeta`, which Vega ignores.
4. The chart is a Bases view, so it appears wherever a base can: its own tab, embeds, code blocks, the sidebar, Canvas.
5. Notes can point at data that is not in the vault (per-row data), because many notes stand for something measured elsewhere.
6. The vault's own structure is data too. Links between notes and the folder tree are handed to the spec like any other dataset, so graphs and hierarchies are charts, not separate features.

## The alternatives

| Option | What it is | Good at | Where it falls short for this use |
|---|---|---|---|
| Bases core views (Table, Cards, List) | Obsidian's own views | Zero setup, fast, edits in place | No charts |
| Bases chart plugins: Bases Chart, Charts for Bases, Bases Chart Views (ECharts), Bases Charts, Bases Chart Layouts, Scatter Plot for Bases (to verify) | New Bases view types with a fixed set of chart types configured through view options | Quick standard charts with no spec; some add AI-generated ECharts | Limited to the chart types each ships; customisation stops at its options; specs are not portable |
| Vega Visualizations (`obsidian-vega`) | ```` ```vega ```` / ```` ```vega-lite ```` code blocks | Same grammar as Agate, mature | No Bases or vault-data integration; data must be inline or a URL |
| Obsidian Charts (Chart.js), Charts View (AntV), with Dataview | Code blocks for a charting library, often fed by Dataview | Familiar libraries, many examples | Separate query language (Dataview), chart config tied to one library, no Bases toolbar |
| Tracker | Plots values tracked across daily notes | Habit and journaling charts with little setup | Built around time series from notes; not a general chart grammar |
| DataviewJS plus any JS library | Arbitrary JavaScript in a note | Anything is possible | Code in notes, no sandbox, breaks with library or Dataview changes, hard to share |
| Mermaid `xychart` | Built-in diagram syntax | No plugin | Very few chart types, no data binding |
| Outside Obsidian (spreadsheet, Observable, Jupyter) | Separate tools | Best-in-class analysis | Data leaves the vault; charts are screenshots or links, not live views |

## Pros

- One grammar for everything from a bar chart to a spinning globe, a horizon table, a zoomable sunburst or a link graph (see the table above).
- The Bases toolbar drives the chart: filter, sort, group and show/hide properties without editing the spec, and selections survive those changes.
- Field names are the Bases property ids users already see (`note.rating`, `formula.age`).
- Specs are reusable across views, vaults and the Vega editor.
- Theme `obsidian` follows the active theme and light/dark mode; `agateDark` lets a spec adapt its own colours.
- Per-row data loads a CSV, JSON or URL for every note, with caching, retries and remote access off by default.
- Table cells let a spec draw the view as a table whose columns follow the Properties menu, with a chart column.
- Links between notes and the folder tree are datasets a spec can ask for, so graphs, arc diagrams, sunbursts and treemaps follow the base's filter.
- Charts are a way into the vault: with `open: "click"` a click on a point, an arc or a node opens its note.
- Extension API: other plugins can add data schemes, expression functions, themes and spec preprocessors, and render charts into their own views.
- Tested headlessly: every example spec renders to SVG in CI.

## Cons and limits

- Charts beyond the recipes mean writing or adapting Vega(-Lite) JSON. Recipes cover the common cases by asking only which property goes where, and "Copy prompt for an LLM" hands an assistant everything it needs, but the error messages are still Vega's.
- `main.js` is about 0.9 MB because Vega, Vega-Lite and vega-embed are bundled.
- No charts inside core Table cells: Obsidian has no API for plugins to render there yet. The table layout is Agate's own view instead.
- Bases data reaches Agate only through a mounted Bases view; there is no headless query, so the `base:` code block renders a hidden view and shows the Bases toolbar.
- In Canvas, dragging a card wins over in-chart brushing.
- The remote-data cache lives in memory only; every app start fetches again.
- Mobile is checked in device emulation only so far.
- The gallery examples have been checked as headless renders, not yet click by click in Obsidian; the force layouts and the sankey are hand-built specs that are longer than a typical chart.
- Pre-1.0, one maintainer. Add-ons are tied to Agate's bundled Vega version.

## When not to use Agate

- You need two or three standard charts and want them configured by clicking. Use a Bases chart plugin.
- You live in Dataview and do not use Bases. Use Obsidian Charts or Charts View.
- You want analysis (models, joins across large datasets) rather than charts of your notes. Do it outside Obsidian and link the result.

## Open questions for the review

- Which comparisons matter most to readers, and are any of the listed plugins abandoned or merged since?
- Should the doc lead with screenshots of the gallery (horizon table, sunburst, globe) as the "why"?
- The gallery layouts now ship as recipes. Should community recipes be fetched from a shared repository (needs network access and vetting), or stay copy-a-file?
