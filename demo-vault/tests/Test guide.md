---
tags: [agate-test]
---
# Agate tests

This folder exists to exercise the plugin; the rest of the vault is the showcase (see [[Start here]]). Each note in `tests/Surfaces/` covers one way a chart can appear and says what to expect. `M0 Checklist.md` is the list to walk through for the spike.

## Setup (once)

1. In the repo: `npm install`, then `npm run dev` (leave it running) and, in a second terminal, `npm run install:local`.
2. Open `demo-vault/` as a vault. When Obsidian asks about community plugins, choose **Trust author and enable plugins**. If it does not ask: Settings → Community plugins → turn off Restricted mode → enable **Agate**.
3. Settings → Community plugins → Agate → turn on **Debug logging** for the spike. Open the developer console with `Cmd/Ctrl+Shift+I`; Agate logs under `[agate]`.
4. Optional: install the community plugin **Hot Reload** into this vault so rebuilds from `npm run dev` load automatically. Otherwise use the command palette → **Reload app without saving** after each build.

## Where things are

- `tests/Library/` — 15 book notes with `author`, `genre`, `rating`, `pages`, `published`, `status` properties. Two notes have missing values on purpose. Books and places that share a name with a showcase note carry a ` (test)` suffix, so every `[[link]]` in the vault resolves to one note.
- `tests/Library/Books.base` — the base. One Table view and six `agate` views (spec from file, inline spec, grouped, a pure Vega spec).
- `tests/charts/` — Vega-Lite (`*.vl.json`) and Vega (`*.vg.json`) specs. They reference a dataset named `base`; Agate fills it with the query result.
- `tests/geo/world-110m.json` — TopoJSON for the map tests (from the `world-atlas` package, ISC licence).
- `tests/data/sales.csv` — for the `data.url` loader test.
- `tests/Markets/` — twelve FRED series notes and `Markets.base` (per-row data example).
- `tests/Ideas/`, `tests/Places/`, `tests/Trips/`, `tests/Journal/`, `tests/Vault.base` — data for the gallery (`tests/Surfaces/12 Gallery`).
- `tests/Surfaces/` — one note per surface, numbered in the order worth trying.

## Surfaces

1. [[tests/Surfaces/1 Inline spec]] — bare spec in a block, inline values, per-chart theme
2. [[tests/Surfaces/2 Spec file]] — `spec:` file, inline rows, spec-file watch
3. [[tests/Surfaces/3 CSV from vault]] — `data.url` via the vault loader; remote blocked
4. [[tests/Surfaces/4 Base embed]] — `![[Books.base#View]]` embeds of the `agate` view
5. [[tests/Surfaces/5 Base block]] — a ```base block with an `agate` view inline
6. [[tests/Surfaces/6 Agate with base]] — `base:` in an `agate` block (the synthesis path)
7. [[tests/Surfaces/7 Geo]] — geoshape + TopoJSON, no add-on
8. [[tests/Surfaces/8 Broken]] — every failure mode shows an error box
9. [[tests/Surfaces/Canvas.canvas]] — text card, `.base` card, note card, static map card
10. [[tests/Surfaces/10 Markets table]] — per-row CSV from FRED, table cells, horizon chart (needs network)
11. [[tests/Surfaces/11 Tooltip images]] — cover image from a note's URL in the tooltip (needs network)
12. [[tests/Surfaces/12 Gallery]] — sunburst, link graph, arc diagram, travel globe, sankey, linked dashboard, beeswarm
13. [[tests/Surfaces/13 Stats]] — live big numbers: drawn by Vega, or computed by Vega and shown as HTML (experimental)

Also open [[tests/Library/Books.base]] directly and switch views from the toolbar.
