# Changelog

All notable changes to Agate. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [Semantic Versioning](https://semver.org/) with the pre-1.0 convention that a minor bump may break.

## [Unreleased]

### Added

- Quickstart: every code snippet has a Copy button, and snippets from a spec also copy the whole spec (or base) as it is at that step.

### Changed

- Editing specs goes through Obsidian: **Edit spec** on a chart and the commands **Edit the spec of the last chart** and **Edit a spec file** open the file in whatever Obsidian uses for it, split left of the chart; Agate recommends the [JSON Editor](https://community.obsidian.md/plugins/json-editor) community plugin. If nothing opens `.json`, a notice says what to install.
- Settings: new **Editing specs** group (a link to the recommended plugin, and a toggle for Obsidian's Detect all file extensions so specs show in the file explorer); the theme settings moved into their own **Theme** group, below Data.

### Fixed

- Quickstart bookshelf specs: rows are 40px per genre (`"height": {"step": 40}`), so the cover thumbnails fit; the title no longer has a hard-coded light colour that vanished in light themes. Quickstart pictures are rendered at the specs' own height.

### Removed

- Agate's own spec editor pane (0.2.0) and the **Edit spec in Agate** file menu item: a dedicated JSON plugin does the job better.

## [0.2.0] - 2026-10-20

### Added

- Spec editor: **Edit spec** on a chart (hover, top right), the commands **Edit the spec of the last chart** and **Edit a spec file**, or **Edit spec in Agate** in a JSON/YAML file's menu open the spec in a pane left of the chart. It saves as you type while the spec parses, so the chart redraws beside it; otherwise the status line shows the parse error and nothing is saved. On phones it opens in a new tab.
- Recipe **Headline numbers**: a row of big numbers as note text over the base (how many notes; total and average of a number; latest and first date; most common value). Every role is optional and only the mapped parts appear; uses the experimental stats output.

### Changed

- Docs gallery: every example links to its note, base and data in the demo vault, next to its spec.

## [0.1.0] - 2026-10-19

### Added

- Textures for SVG charts: declare hatching, dots or textures.js-style shapes under `usermeta.agate.textures` and use `url(#name)` wherever a colour goes, including scale ranges, so legends show them too. Kinds `lines` (any orientation, arrays cross-hatch), `circles` and `paths` (`squares`, `nylon`, `waves`, `woven`, `crosses`, `caps`, `hexagons`, or your own path), plus `shapeRendering` and `rough` for a hand-drawn wobble. SVG renderer only; with canvas each texture falls back to a flat colour. Guide: "Textures: hatching and dots".
- API keys from environment variables: a URL in a spec (data, per-row data or image marks such as map tiles) can contain `{env:NAME}`, filled from the OS environment at fetch time, desktop only. A name is filled only for the one host the new **Environment variables in URLs** setting allows it for (`NAME host` per line), so a shared spec cannot send the key elsewhere. Keyed images reach the chart as `blob:` URLs and errors show the placeholder, so the key stays out of the DOM, exports and messages. Guide: "Basemaps under a route" and "Providers that need an API key".
- Docs site in `docs/` for GitHub Pages: a main page, a gallery (Minard, Du Bois, Redlining in Brooklyn, Gapminder, vault edge bundling, travel globe, vault sunburst, themes) and a step-by-step quickstart from 26 book notes to a bookshelf chart with cover tooltips and headline numbers. Starter files to follow along in `docs/downloads/reading-starter.zip`.
- Demo vault charts: Du Bois's 1900 furniture plate as a static chart in a note; Brooklyn's 1938 HOLC grades (all 66 zones over today's shoreline, Long Island state plane projection, textures); Gapminder's wealth and health of nations with one note and one CSV per country; hierarchical edge bundling of the vault's links (pure Vega); a theme sampler; reading stats; a custom Du Bois theme file (`charts/themes/du-bois.json`).
- Render tests: `AGATE_PREVIEW_THEME` previews specs in any stock theme or theme file.
- Demo board games: each game note has an `image` property (the lead image of its Wikipedia article, mostly the box), and the collection chart's tooltip shows it as a picture.
- Hike dashboard basemap: "Auto" is now the USGS 3DEP multidirectional hillshade (keyless, US only, from lidar terrain), fetched as one image for the map frame: multiplied into the background in light mode, drawn faintly in dark mode. Esri hillshade, OpenTopoMap, satellite and USGS Topo stay in the basemap menu.
- Stats blocks hide the Bases title and toolbar and the fixed view height around them, so a stats row in a note reads as a line of numbers. The Interview prep and AT Georgia notes use live stats (`charts/interview-stats.vl.json`, `charts/hike-stats.vl.json`, the hike's from its GPS tracks) instead of numbers written by the generator.
- `demo-vault/` Interview prep (replaces the Projects hub and its gantt): 75 real practice attempts, scrubbed to their properties and a one-line question (`scripts/data/interview-attempts.json`; answers, coaching notes and anything naming an employer, product or real project left out), a prep note per domain, and a base with two views: cold grade over time with a rolling mean and re-test rings, and problems and mean grade per domain. The re-test cut-off is a `retestFrom` param.
- Experimental: stats as note text. A spec with `usermeta.agate.output: "stats"` is run headlessly and the rows behind its first mark (`value`, `label`, optional `note`) are shown as a row of big HTML numbers (styled by Agate, wrapping and selectable) instead of a chart, so headline numbers can follow a base. Rows may carry a `change`, shown with an arrow for its direction, green or red by whether that is good news (`better: "down"` flips it). Test note: `demo-vault/tests/Surfaces/13 Stats.md`, beside the same numbers drawn by Vega.
- Theme `instrument`: the `obsidian` theme redrawn as a monochrome readout (monospace, ink marks and dots, no axis lines, dotted grids, y labels inside the plot, corner axis titles, accent selections), after the demo hike dashboard, which now uses it. Pick it per chart or vault-wide.
- `agateColors` environment signal: a spec that declares it gets the active Obsidian theme's colours by role (`text`, `muted`, `background`, `accent`, `yellow`, `blue`, …), so a chart can colour annotations, halos and highlights from the theme instead of hard-coding them.
- `make extras` downloads the demo vault's themes (AnuPpuccin, Tufte, Minimal) and companion plugins (Tufte Suite, Side-Notes) into `demo-vault/.obsidian/` (not committed: they keep their own licences). The vault opens in Tufte with both plugins enabled; the Russian campaign note shows Minard's map as a Tufte Suite figure with its caption and notes on reading it in the margin beside it. The `agate-demo` CSS snippet is now enabled (it was never switched on) and keeps figure callouts at text width in the editor.
- Hike dashboard (`demo-vault/charts/hike-dashboard.vl.json`), redrawn as a monochrome instrument readout: as wide as the note, every reading a dot, monospace labels inside the plots, all panels on a shared local-time axis with the camps as dotted blocks on the speed panel (the tracks now log overnight at camp, so the sun is a full daily curve), day breaks marked by circles on the map instead of colours, the projection fitted to the route and a hillshade basemap filling the frame, the theme's accent only for hover and selection. Before that, in this release: the route and heights are now the real Appalachian Trail (OpenStreetMap ways, Copernicus DEM, committed as `scripts/data/at-georgia.json`) with pace and heart rate derived from the smoothed grade, so the lines no longer jitter; every colour comes from the theme (category palette and `agateColors`); x axes run exactly from start to finish; breaks are left out of the speed, heart-rate and sun lines; map labels with a halo so they read on any basemap; a sun panel (the sun's altitude at each GPS point, computed in the spec, dimmed by cloud cover) and a temperature panel with hourly rain bars. Temperature and cloud are the real hourly values for the hike days (Open-Meteo archive); the rain is invented. Fixed: the "Auto" basemap never switched to satellite in dark mode.
- `scripts/demo-vault.mjs` only seeds `.obsidian/` settings that are missing, so regenerating no longer resets the theme or plugins chosen in Obsidian.
- `demo-vault/`: a made-up personal vault (PARA folders, journal) with a note per area that opens with context and numbers and embeds the area's base: a three-day Appalachian Trail hike (route on a static OpenTopoMap basemap, hover the route for elevation, speed and heart rate, brush to zoom), travel globe coloured by family, work and personal trips (one note per trip with ordered stops), reading as a timeline or a genre → outcome → time-taken sankey, board-game collection and game nights, project timeline, who-I-meet heatmap, people-and-projects graph, habits and mood, a vault sunburst rooted at `notes/`, and a replica of Minard's map of Napoleon's Russian campaign with the battles as clickable notes. Each area note is designed for one of three looks (elegant: Minimal light with serif; dark: Minimal dark; colourful: AnuPpuccin) with charts tailored to it, and reads like a note someone keeps: a row of big numbers, observations computed from the data, a to-do list. CSS snippets in `demo-vault/.obsidian/snippets/`. Generated by `scripts/demo-vault.mjs` with a fixed seed; `make demo` builds and links the plugin into it.
- Per-row data: a spec can declare `usermeta.agate.rowData: {name, from}`. For every base row Agate loads what the `from` property points at (vault path, link, URL, or an inline list), parses it (CSV, TSV, JSON) and puts the records, each carrying its parent row's `file`, `note`, `formula`, `group` and `rowIndex`, into the named dataset. One small chart per note without a facet over a list property. Remote responses are cached for 10 minutes.
- Table cells: `usermeta.agate.cells: "cells"` gives a spec one record per row and visible property (Properties menu order, display names), so a chart can draw the Bases view as a table with a chart column.
- Command "Refresh remote data and re-render charts".
- `agateDark` environment signal: a Vega signal or Vega-Lite param of that name (with a plain `value`) is set to true when Obsidian is in dark mode, and the chart re-renders when the mode changes. Outside Agate the spec keeps its own default.
- Recipes: **Pick a recipe** in an empty Agate view (or the **New chart from recipe** command) lists twelve built-in charts; Agate asks which property fills each role, offering only properties of the right type, writes the spec into the spec folder and points the view at it. Specs with `usermeta.agate.recipe` in the new **Recipe folder** setting join the list.
- **Copy prompt for an LLM** (button and command): the base's properties, types and sample rows plus Agate's conventions, ready to paste into any assistant. The error box has **Copy error**.
- Structure datasets: `usermeta.agate.edges` gives a spec the links between the notes of the base (from Obsidian's resolved link index, by row position, ready for Vega's force layout); `usermeta.agate.tree` gives the folder hierarchy with per-folder byte and file totals and ancestor lists, ready for `stratify` and `partition`.
- Open on click: `usermeta.agate.open: "click"` (or `"dblclick"`) opens the note behind a mark; Cmd/Ctrl opens it in a new tab.
- Gallery (`demo-vault/tests/Surfaces/12 Gallery`): DaisyDisk-style zoomable vault sunburst, link graph, arc diagram over time, travel globe with great-circle routes, reading sankey, linked dashboard and mood beeswarm; with test notes in `Ideas/`, `Places/`, `Trips/`, `Journal/`.
- Tooltip images: a tooltip field titled `image` shows as a picture (styled to fit the tooltip). Example: the Books base builds `formula.cover` from each note's `isbn` with Open Library covers (`charts/covers-tooltip.vl.json`).
- Draft docs: `docs/guide.md` (getting started, building charts, tips, per-note data) and `docs/why-agate.md` (pros and cons against alternatives).
- Example: `demo-vault/tests/Markets`, twelve FRED series (indices, VIX, rates, FX, oil, crypto) drawn as a cubism-style horizon table (`charts/horizon-table.vg.json`) and as plain horizon strips (`charts/horizon.vg.json`).

### Changed

- Minard's map: thin flank columns have a minimum band width, and only the battles are interactive (the band no longer has a tooltip).
- `scripts/demo-vault.mjs` now produces every hand-made part of the demo vault (notes in `scripts/data/notes/`, map files in `demo-vault/tests/geo/`, Gapminder data in `demo-vault/tests/data/`), so regenerating loses nothing.
- Guide: sections on basemaps, keyed providers and textures.
- Container-width charts resize themselves only: Agate sets the chart's container-sized `width`/`height` signals directly instead of firing a window-wide `resize` event (which made every chart and the workspace re-measure), and ignores an immediate bounce back to the previous width (a scrollbar toggling). Fixes a container-width chart that could re-render in a loop, reloading its images, until the window went blank.
- One repo vault (ADR-0002): `test-vault/` moved into `demo-vault/tests/`, so the showcase and the test fixtures live in one vault and every chart in it is rendered by the test suite. Test notes that share a name with a showcase note got a ` (test)` suffix; test bases only look inside `tests/`. `npm run install:local` now targets `demo-vault/`.
- A spec's `description` no longer pops up as an Obsidian tooltip over the whole chart. Vega puts descriptions in `aria-label`, which Obsidian shows on hover; Agate moves them to `aria-description`, so screen readers still get them.
- "Load remote data" now also covers images Vega fetches itself (image marks such as map tiles); with it off they are skipped and the rest of the chart draws.
- Theme `obsidian`: the category palette no longer repeats the accent when the theme's accent is one of its named colours (Nord's accent is its red), so two categories never share a colour.
- Theme `obsidian`: Vega-Lite text marks use the theme's text colour (they were black, unreadable in dark mode).
- The Agate chart view has its own line icon in the Bases view picker (a rounded square with a rising spline), drawn in the same style and stroke as Table, Cards and List. The settings tab carries the Agate icon (Obsidian 1.13.7 does not draw icons for community-plugin tabs yet).
- Remote loads run at most two at a time per host and retry network errors, 429 and 5xx twice with backoff; the error names the URL.

### Fixed

- Brooklyn HOLC data: the vault copy was missing 15 of the 23 D-graded zones (Red Hook, downtown, Williamsburg, Bushwick) and its rings were wound the wrong way for d3-geo, which filled the whole frame.
- Gapminder data was cut off alphabetically after "Slovenia" (116 of 142 countries).

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
