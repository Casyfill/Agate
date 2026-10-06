# Why Agate

> Draft, 2026-10-06. Not reviewed. Claims about other plugins come from their listings and READMEs as of this date and need checking before this is published anywhere.

## The short version

Agate is for people who want charts over their notes and are willing to write a chart spec to get exactly the chart they mean. Bases picks the notes; Vega draws them. Nothing in between invents a query language or a chart model of its own.

If you want a bar chart in two clicks and never want to see JSON, one of the simpler Bases chart plugins will serve you better. If you want a horizon table of twelve market series pulled live from FRED, a map, a brushable scatter plot, or a chart that looks the same in your vault and in a paper, Agate is built for that.

## What Agate bets on

1. Bases is the query engine. Filters, formulas, sort, grouping and the Properties menu already exist, are maintained by Obsidian, and users know them. Agate adds no query syntax.
2. Vega and Vega-Lite are the chart grammar. They are declarative, documented, have a large example gallery and an online editor, and cover statistical charts, maps, custom layouts and interaction.
3. Specs stay portable. A spec file is plain Vega or Vega-Lite; it runs in the Vega editor with sample rows. Agate's extras live under `usermeta`, which Vega ignores.
4. The chart is a Bases view, so it appears wherever a base can: its own tab, embeds, code blocks, the sidebar, Canvas.
5. Notes can point at data that is not in the vault (per-row data), because many notes stand for something measured elsewhere.

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

- One grammar for everything from a bar chart to a world map, a horizon table or a linked scatterplot matrix.
- The Bases toolbar drives the chart: filter, sort, group and show/hide properties without editing the spec, and selections survive those changes.
- Field names are the Bases property ids users already see (`note.rating`, `formula.age`).
- Specs are reusable across views, vaults and the Vega editor.
- Theme `obsidian` follows the active theme and light/dark mode; `agateDark` lets a spec adapt its own colours.
- Per-row data loads a CSV, JSON or URL for every note, with caching, retries and remote access off by default.
- Table cells let a spec draw the view as a table whose columns follow the Properties menu, with a chart column.
- Extension API: other plugins can add data schemes, expression functions, themes and spec preprocessors, and render charts into their own views.
- Tested headlessly: every example spec renders to SVG in CI.

## Cons and limits

- You have to write or adapt Vega(-Lite) JSON. The learning curve is real, and the error messages are Vega's.
- `main.js` is about 0.9 MB because Vega, Vega-Lite and vega-embed are bundled.
- No charts inside core Table cells: Obsidian has no API for plugins to render there yet. The table layout is Agate's own view instead.
- Bases data reaches Agate only through a mounted Bases view; there is no headless query, so the `base:` code block renders a hidden view and shows the Bases toolbar.
- In Canvas, dragging a card wins over in-chart brushing.
- The remote-data cache lives in memory only; every app start fetches again.
- Mobile is checked in device emulation only so far.
- Pre-1.0, one maintainer. Add-ons are tied to Agate's bundled Vega version.

## When not to use Agate

- You need two or three standard charts and want them configured by clicking. Use a Bases chart plugin.
- You live in Dataview and do not use Bases. Use Obsidian Charts or Charts View.
- You want analysis (models, joins across large datasets) rather than charts of your notes. Do it outside Obsidian and link the result.

## Open questions for the review

- Which comparisons matter most to readers, and are any of the listed plugins abandoned or merged since?
- Should the doc lead with the horizon table screenshot as the "why"?
- Is the "willing to write a spec" framing right, or should Agate also ship a small gallery of ready-made specs to lower that bar?
