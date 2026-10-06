# Changelog

All notable changes to Agate. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) with the pre-1.0 convention that a minor bump may break.

## [Unreleased]

### Added

- Per-row data: a spec can declare `usermeta.agate.rowData: {name, from}`. For every base row Agate loads what the `from` property points at (vault path, link, URL, or an inline list), parses it (CSV, TSV, JSON) and puts the records, each carrying its parent row's `file`, `note`, `formula`, `group` and `rowIndex`, into the named dataset. One small chart per note without a facet over a list property. Remote responses are cached for 10 minutes.
- Table cells: `usermeta.agate.cells: "cells"` gives a spec one record per row and visible property (Properties menu order, display names), so a chart can draw the Bases view as a table with a chart column.
- Command "Refresh remote data and re-render charts".
- `agateDark` environment signal: a Vega signal or Vega-Lite param of that name (with a plain `value`) is set to true when Obsidian is in dark mode, and the chart re-renders when the mode changes. Outside Agate the spec keeps its own default.
- Example: `test-vault/Markets`, twelve FRED series (indices, VIX, rates, FX, oil, crypto) drawn as a cubism-style horizon table (`charts/horizon-table.vg.json`) and as plain horizon strips (`charts/horizon.vg.json`).

### Changed

- Remote loads run at most two at a time per host and retry network errors, 429 and 5xx twice with backoff; the error names the URL.

## [0.0.2] - 2026-09-27

### Added

- `Agate chart` view type for Bases: pick it in a base's view menu, point it at a Vega or Vega-Lite spec (file in the vault or inline), and the base's rows become the chart's `base` dataset. Filters, sort, group and the Properties menu drive the chart; brushes and selections survive a filter change.
- ```` ```agate ```` code block for charts in notes: a bare spec, or an envelope with `spec:` (file or inline), inline `data:`, and `base:`/`view:` to pull rows from a `.base` file's query.
- Rows mirror Bases property ids (`note.rating`, `file.name`, `formula.age`), so a Vega field string is what you see in Bases. `group` is set when the view is grouped.
- Vault-aware data loading: `data.url` resolves like a link; remote URLs are off unless enabled in settings.
- Themes: `obsidian` (follows the active Obsidian theme and light/dark mode) plus the Vega named themes; vault-wide config overrides and an optional theme file; per-chart overrides.
- Static mode (`interactive: false`) for cards and embeds where gestures conflict.
- Settings tab (theme, renderer, export menu, interactivity, dataset name, remote data, block aliases, debug logging).
- Extension API for other plugins (`app.plugins.plugins.agate.api`, `agate:ready` event): data schemes, expression functions, themes, spec preprocessors, and Agate's bundled `vega` instance.
- Optional handling of ```` ```vega ```` and ```` ```vega-lite ```` blocks.
- Default spec folder setting: a spec path that does not resolve on its own is looked up there.
- Plugin icon.

### Known limitations

- In Canvas, dragging a card wins over an in-chart brush; tooltips work once the card is selected.
- Sparklines inside the core Table view are not possible with the current Bases API; use a faceted Agate view instead.
