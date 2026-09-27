# Future features

Ideas parked for after 0.1.0. Not commitments; reviewed when 0.1.0 ships. Each entry says what it is, why it might matter, and roughly what it costs. Items marked "needs Obsidian API" wait on a public hook that does not exist yet.

## Asked for

**Small chart per note (sparklines).** One Agate view, one Vega-Lite spec with `facet: {field: "file.name"}`, one tiny chart per note. Works today with a list property (`history: [3, 4, 4, 5]`) via `flatten`. Cost: a fixture spec and a docs section; no code. Keep it in the first docs pass.

**Pull chart data through a link.** A note property that is a link (`series: [[2026 revenue]]`) points at a note or a CSV/JSON file; Agate follows the link and turns that target into the row's data (frontmatter list, a table in the note, or a CSV). Fits the row model as `note.series` resolved to an array, or as a `link://` data scheme through the D7 loader. Cost: medium; the loader half is small, deciding what "the data in a note" means (frontmatter list? first table? code block?) is the work.

**Sparkline inside the core Table view.** Today: a Bases formula can emit `html('<svg …>')` per row with `list.map()`/`join()`; ugly but no plugin needed, worth a documented snippet. Clean version: Agate registers a `sparkline(list)` formula function returning an `HTMLValue`. Needs Obsidian API: formula-function registration for plugins is announced in the Bases docs but not in the 1.13 typings. Watch `obsidian.d.ts` for it.

**"Mimic" theme.** A Vega theme generated from the active Obsidian theme and regenerated on load and on theme change. The current `obsidian` theme already does the dynamic part (reads CSS variables at render time, re-renders on `css-change`). What "mimic" adds: a richer derivation (more variables sampled, a contrasting categorical palette built from the theme's accent and its named colours, light/dark-aware sequential ramps, fonts from the body text not just the interface), and a "Save as theme file" action that snapshots the generated config into the vault so it can be inspected, tweaked, and used as a static theme. Cost: small for the snapshot, medium for a palette derivation that looks good across community themes.

## Own suggestions

**Export commands.** "Save chart as SVG/PNG" from a right-click on the chart or the command palette, independent of the vega-embed actions menu. Small; vega-embed already has the code path.

**Open the spec from the chart.** Context-menu item on a chart: open its `.vl.json` in a split, or (for inline specs) jump to the block. Small.

**Charts about the current note.** Bases supports `this` in embedded bases (the embedding note). A spec could bind Vega-Lite `params` to the embedding note's frontmatter, so one chart template in a note template shows that note's data. Needs `BasesViewConfig.getEvaluatedFormula` (exists, 1.10.2). Medium.

**Several bases in one chart.** Envelope key `bases:` mapping dataset names to `.base` paths, each synthesized as its own hidden view feeding one Vega spec. The renderer already takes named datasets. Medium; the hard part is lifecycle (several `BasesView`s per block).

**Row limit and sampling.** For an unfiltered base with thousands of notes: a `limit`/`sample` option so a chart stays responsive. Small.

**Copy data.** "Copy rows as CSV/JSON" from the chart menu, useful for debugging specs in the Vega editor. Small.

**Static default in Canvas.** If Canvas users keep tripping over drag versus tooltip, detect the Canvas container and default `interactive` to off there. Two lines; waiting for a real complaint.

**Live spec editing.** A side pane that edits the spec of the focused chart with immediate re-render and Vega's validation errors inline. Large; only if people write many specs.

**Tooltips with links.** Render tooltip values through Obsidian's `Value.renderTo` so a `file.name` in a tooltip is a working link. Medium, and tooltips are a vega-tooltip concern; would need a custom tooltip handler.

**Canvas renderer default if hover isolation proves insufficient.** The `isShown` problem is handled by stopping `mouseover` at the chart element. If some Obsidian handler still reaches SVG marks, the canvas renderer sidesteps it (event targets become an HTMLCanvasElement) at the cost of styleable SVG.

**End-to-end tests.** `wdio-obsidian-service` against `test-vault/` in CI once the manual checklist is longer than a screen.

**Declarative settings (`getSettingDefinitions`).** Obsidian 1.13 indexes plugin settings for its settings search only when the tab implements the declarative API. The lint rule flags this; adopting it is mechanical. Small; M2 candidate.

## Dropped

**Dataview as a data source.** Decided out of scope on 2026-09-26. The `DataSchemeProvider` interface stays because it is the general hook; nobody is building the Dataview adapter.
