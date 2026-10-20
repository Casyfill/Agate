---
name: agate-chart
description: Build charts for the Agate Obsidian plugin, which draws Vega and Vega-Lite specs over Obsidian Bases. Use when asked to chart, plot, map or visualise notes in an Obsidian vault, to write or fix an Agate spec (.vl.json, .vg.json) or a .base view that uses one, or to add headline numbers, maps with basemaps, hatching textures, networks, per-note data or a chart in a note.
---

# Building Agate charts

Agate draws a Vega or Vega-Lite spec over the notes an Obsidian base picks. The base (a `.base` file) is the query; the spec is a plain JSON file; Agate hands the spec the base's rows and redraws when notes, filters or the spec file change. You work on files only: notes, `.base` files and spec files in the vault.

## Workflow

1. **Find the notes and their properties.** Read the `.base` file the user means (or the folder of notes). Look at the frontmatter of three or four notes. Note each property's name and type: text, number, date (`YYYY-MM-DD`), list, link (`"[[Note]]"`), boolean. If there is no base yet, write one (format in `reference/data.md`).
2. **Pick the form.** Start from a built-in recipe or a worked example when one fits (`reference/examples.md`); otherwise write Vega-Lite. Use full Vega only for layouts Vega-Lite lacks: force-directed graphs, trees and partitions, edge bundling, custom geo.
3. **Write the spec file** in the vault's spec folder (often `charts/`), named `<what>.vl.json` (Vega-Lite) or `<what>.vg.json` (Vega). Follow the conventions below.
4. **Wire it up.** Add an `agate` view to the base that points at the spec (`specFile:`), and if the user wants it in a note, embed it: `![[Books.base#View name]]`, or use an `agate` code block (`reference/data.md`).
5. **Check it renders** before you hand it over (`reference/check.md`): a copy of the spec with a few real rows inlined must render with no errors and no `WARN` lines.
6. **Tell the user** which files you created or changed, which view to open, and which Agate settings it needs (Load remote data for URLs and map tiles; Environment variables in URLs for API keys; the SVG renderer for textures).

## Conventions every spec follows

- **Data:** `{"data": {"name": "base"}}` (Vega-Lite) or `{"name": "base"}` in `data` (Vega). Never inline the rows in the real spec; Agate injects them.
- **Fields are Bases property ids:** `note.genre` (frontmatter), `file.name`, `file.path`, `file.ctime`, `file.mtime`, `file.size`, `file.tags`, `formula.cover` (base formulas), and `group` when the view is grouped. In Vega-Lite write them as field strings (`"field": "note.rating"`); in expressions write `datum["note"]["rating"]` or `datum.note.rating`.
- **Types:** dates arrive as ISO strings (use `"type": "temporal"` or `toDate()`); links as `"[[...]]"` strings or paths; lists as arrays; numbers as numbers.
- **Prefer a base formula** for per-note calculations (age, decade, a URL built from an ISBN): it shows in the Bases table too and keeps the spec short.
- **Size:** leave out `width` for a single Vega-Lite view; it fills the pane. Give facets and concats an explicit `width`. Give a discrete y axis a step height when marks need room: `"height": {"step": 40}`.
- **Look:** do not set `background`, font or axis and text colours; the Obsidian theme supplies them. For colours that follow the theme, use `agateColors` (`reference/look.md`).
- **Order:** `"sort": null` on a discrete axis keeps the order the Bases Sort menu gives.
- **Clicks:** `"usermeta": {"agate": {"open": "click"}}` opens the note behind a clicked mark (marks whose datum carries `file.path`).
- **Tooltips:** a tooltip field titled `"title"` becomes the heading; one titled `"image"` with an image URL is drawn as a picture.
- **Schema:** Vega-Lite v6 (`"$schema": "https://vega.github.io/schema/vega-lite/v6.json"`) or Vega v6 (`".../vega/v6.json"`).

## What Agate adds to a plain spec

All of these are declared under `"usermeta": {"agate": {…}}`, which Vega ignores, so specs stay portable. Details and examples are in `reference/extras.md`.

| Key | Gives the spec |
|---|---|
| `open` | click a mark to open its note |
| `rowData` | each note's own CSV/JSON file or URL, loaded into a dataset |
| `cells` | the view's visible properties, for table layouts with a chart column |
| `edges` | the links between the base's notes, for networks |
| `tree` | the folder hierarchy, for sunbursts, treemaps, edge bundling |
| `output: "stats"` | headline numbers shown as note text instead of a chart |
| `textures` | hatching, dots and patterns usable as fills (SVG renderer) |

Plus: map tiles under a route (basemaps), API keys from environment variables (`{env:NAME}` in URLs), the `agateDark` and `agateColors` signals, and themes. Read `reference/extras.md` and `reference/look.md` before using any of them.

## Reference files

- `reference/data.md`: rows and fields, `.base` files, code blocks and embeds, static charts.
- `reference/extras.md`: every `usermeta.agate` key, basemaps, `{env:NAME}` keys.
- `reference/look.md`: themes, theme files, `agateDark`, `agateColors`, textures, sizing.
- `reference/examples.md`: the 13 built-in recipes and worked examples to start from.
- `reference/check.md`: rendering a spec outside Obsidian to catch errors.

## Don't

- Don't inline rows in the real spec, or set `width` on a single Vega-Lite view.
- Don't hard-code colours for text, axes or backgrounds.
- Don't write an API key into a spec; use `{env:NAME}` (`reference/extras.md`).
- Don't invent `usermeta.agate` keys; only the ones above exist.
