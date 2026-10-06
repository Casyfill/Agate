<img src="docs/images/agate-logo.svg" alt="Agate" width="96" align="right">

# Agate

Vega and Vega-Lite charts inside Obsidian, fed by [Bases](https://help.obsidian.md/bases). Write a chart spec once; Bases decides which notes it shows. Filters, sort and grouping in the Bases toolbar update the chart in place.

**Status: pre-release.** Works, tested, not yet in the community plugin directory. Install through [BRAT](https://github.com/TfTHacker/obsidian42-brat) (`Casyfill/Agate`) or from a GitHub release.

## What you get

Two things, one renderer.

### 1. A Bases view that is a chart

A new Bases view type, **Agate chart**. Open any base, add a view, choose the Agate layout, point it at a spec. The base's rows arrive in the chart as a dataset named `base`, one row per note:

```json
{
  "file":    { "name": "Dune", "path": "Library/Dune.md", "ext": "md", "folder": "Library", "ctime": "…", "mtime": "…", "size": 4123 },
  "note":    { "rating": 5, "genre": "sci-fi", "published": "1965-08-01" },
  "formula": { "age": 61 },
  "group":   "sci-fi"
}
```

Field names are the Bases property ids, so `"field": "note.rating"` in a spec is the same `note.rating` you see in the Bases toolbar. `group` appears when the view is grouped. Filters, sort, grouping and the Properties menu are the chart's controls; change them and the chart updates in place.

Because it is an ordinary Bases view, the chart shows up everywhere a base does: in the base's own tab, embedded in a note with `![[Books.base#Ratings]]`, in a ```` ```base ```` code block, in the sidebar, and on a Canvas card.

### 2. Charts inside notes

Rendering a Vega or Vega-Lite spec from a code block in a note is not new; the [Vega Visualizations](https://github.com/Justin-J-K/obsidian-vega) plugin has done that for years with ```` ```vega ```` and ```` ```vega-lite ```` blocks. What it cannot do is feed a chart from Bases or any other live data inside the vault. Agate's block does:

````markdown
```agate
spec: charts/ratings-by-genre.vl.json   # a file in the vault, or an inline spec
base: Library/Books.base                # optional: rows from this base's query
view: Table                             # optional: reuse that view's filters and property order
```
````

The block is called ```` ```agate ```` so the two plugins can coexist. A bare spec pasted into it works as-is; the envelope form above adds `spec:` (file or inline), `data:` (inline rows), and `base:`/`view:` to pull rows from a `.base` file's query. Without `base:`, the spec's own `data` applies: inline `values`, or a `url` that resolves inside the vault the way a link does (`data/sales.csv`). Remote URLs are off by default and can be enabled in settings.

If you do not use the Vega Visualizations plugin, a setting lets Agate also handle ```` ```vega ```` and ```` ```vega-lite ```` blocks, so existing notes render through Agate with its themes and vault loader. With both plugins enabled that setting is left off: Obsidian allows one handler per block language.

## Quick start

1. Install and enable Agate (Bases, a core plugin, must be on).
2. Create a spec file, say `charts/ratings.vl.json`:
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
3. Open a base, add a view, set its layout to **Agate chart**, and in the view options choose the spec file.
4. Use the toolbar: filter, sort, group, show or hide properties. The chart follows. `"sort": null` on a discrete axis keeps the order rows arrive in, so the Bases sort menu controls bar order.

Tips: hidden properties are still converted when the spec refers to them, so a spec never breaks because a column was hidden. Vega-Lite specs without a width fill their container. For one small chart per note, use a Vega-Lite `facet` on `file.name`.

## One small chart per note

A spec can ask Agate to load data for every row. Put a path, link or URL to a CSV/JSON in a property (or a formula that builds one), then declare it in the spec:

```json
"usermeta": { "agate": { "rowData": { "name": "series", "from": "formula.csv" } } }
```

Dataset `series` then holds every row's records, each with its note's `file`, `note` and `formula` fields and a `rowIndex`, so the spec can draw one strip per note. Add `"cells": "cells"` next to it to also get the view's visible properties as table cells, and the Properties menu decides the columns. `test-vault/Markets` shows both: twelve [FRED](https://fred.stlouisfed.org) series as a table with a cubism-style horizon column. Remote URLs need **Load remote data** on; responses are cached for 10 minutes ("Refresh remote data" clears them).

A spec that declares a signal (Vega) or param (Vega-Lite) named `agateDark` with a plain `value` gets `true` in dark mode and is re-rendered when the mode changes; the horizon examples use it to reverse their colour ramp. In the Vega editor the spec's own default applies.

## Settings

Vault-wide defaults, each overridable per chart (view options in a base, envelope keys in a block): a default spec folder (a spec path that does not resolve on its own is looked up there, so `spec: ratings.vl.json` finds `charts/ratings.vl.json`), theme (`obsidian` follows your Obsidian theme and light/dark mode live; the Vega named themes are also there), a config override block, an optional theme file in the vault, renderer (SVG or canvas), the export menu, interactivity (off renders a static picture), the dataset name, remote data loading, and whether Agate should also handle ```` ```vega ```` / ```` ```vega-lite ```` blocks (off by default; conflicts with the obsidian-vega plugin).

## Limits worth knowing

- Bases data flows only into a registered Bases view; Agate cannot run a base query on its own. The ```` ```agate ```` block with `base:` works by rendering a hidden base view, which is why the Bases toolbar appears above such charts.
- In Canvas, dragging the card wins over drag-based selections (interval brushes). Tooltips and hover highlights work once the card is selected. The example specs use hover, not brushes.
- Charts inside the core Table view (sparklines per row) need a Bases API that does not exist yet.

## For plugin authors

Agate exposes `app.plugins.plugins.agate.api` (and fires `agate:ready`): register data URL schemes, Vega expression functions, themes, and spec preprocessors, or render a chart into your own element. Add-ons must use `api.vega` rather than bundling their own Vega, so registrations land in the instance that draws. Details in `docs/adr/0001-architecture-and-roadmap.md` (D7).

## Development

Prerequisites: Node 22.12 or newer (`.nvmrc`), Obsidian 1.13.0 or newer.

```sh
npm install
npm run dev                 # esbuild in watch mode -> main.js
npm run install:local       # symlink into test-vault/.obsidian/plugins/agate/
```

Open `test-vault/` as a vault and start with `Start here.md`. For another vault: `AGATE_VAULT=/path/to/vault npm run install:local`. `npm run check` (or `make check`) runs typecheck, lint and tests; `make help` lists everything. The user guide (draft) is `docs/guide.md` and the comparison with other chart plugins (draft) is `docs/why-agate.md`. How testing is layered is in `docs/testing.md`; decisions and roadmap in `docs/adr/`; the backlog in `docs/future-features.md`; the original goals in `docs/goals.md`.

## Releasing

Releases are tag-driven. A GitHub release whose tag equals the `version` in `manifest.json` is what Obsidian downloads `main.js`, `manifest.json` and `styles.css` from, so the tag, the manifest and `versions.json` have to agree; `version-bump.mjs` keeps them in step and the release workflow refuses a mismatch.

1. Add a `## [x.y.z]` section to `CHANGELOG.md`, merge to `main`, CI green.
2. `make release VERSION=x.y.z`: runs `make preflight` (clean tree, on `main` and in sync, `LICENSE` and `CHANGELOG.md` present, `npm run check`, production build), then `npm version x.y.z` (bumps `manifest.json` and `versions.json`, commits) and `git push --follow-tags`.
3. The `Release` workflow builds from the tag, checks tag == manifest version, and drafts a GitHub release with the three files attached.
4. Review the draft on GitHub and publish it.

By hand: `npm version x.y.z && git push --follow-tags`. The first-time publishing checklist (community directory, guideline review) is `docs/releasing.md`.

## License

MIT. Vega, Vega-Lite and vega-embed are bundled under their own BSD-3-Clause licenses.
