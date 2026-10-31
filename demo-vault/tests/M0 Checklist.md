---
tags: [agate-test]
---
# M0 spike checklist

Goal: answer the five questions from ADR-0001 M0 with evidence, not impressions. Tick, and where something is off write one line of what you saw. Console output with Debug logging on is the evidence for the data-shape questions.

## (a) Bases view renders and follows the toolbar

- [x] Open `tests/Library/Books.base`. View **Ratings** shows a horizontal bar chart with one bar per genre. (Table view is a table; `age` formula fixed in round 2.)
- [x] Switch to **Scatter**, **Timeline**, **Histogram (Vega)**, **Grouped**, **Inline spec**. Each renders.
- [x] In **Scatter**: add a filter (toolbar → Filters → `note.rating >= 4`). Points disappear without the chart flashing/re-embedding.
- [x] In **Scatter**: brush a region, then change the filter again. The brush is still there.
- [x] In **Ratings**: toolbar → Properties → hide `note.genre`. Chart breaks (expected: the field is no longer converted). Show it again; chart returns.
- [x] Round 2: **Ratings** spec now has `sort: null`, so the Bases sort menu (toolbar → Sort → rating) should reorder the bars. Vega-Lite otherwise sorts discrete axes alphabetically.
- [x] `tests/Surfaces/4 Base embed`: all three embeds render in reading view and in live preview.
- [x] `tests/Surfaces/5 Base block`: renders; editing the filter in the block updates the chart.
- [x] Round 2: console (debug on) now prints `[agate] first entry …` as a Verbose-level line since 0.4.2 (turn on Verbose in DevTools; it was console.debug, hidden by DevTools' default level). Expand it and result (2026-09-26): instanceof works (ctor names minified); rating/pages/age/decade → numbers, tags → array, strings → strings, dates → parseable strings, group set. D4 confirmed.

## (b) Synthesized ```base from an agate block

- [x] Round 2: `tests/Surfaces/6 Agate with base`: all three charts show data (round 1: only the second did; cause was property selection by view `order`, now the spec is scanned for the fields it uses).
- [x] Edit `tests/Library/Dune (test).md` → `rating: 1`. All three update (sci-fi bar drops, a point moves). Set it back.
- [ ] If instead: error box → copy the message. Blank → check console for `[agate] synthesized base block` and whatever follows. Note whether the Bases toolbar appears above the chart (it should, this is a normal base embed).

## (c) Interactivity

- [x] Reading view, `tests/Surfaces/4 Base embed` → Scatter: tooltip appears on hover, brush works, page does not scroll while brushing.
- [x] Live preview (Settings → Editor → Default editing mode: Live Preview, i.e. the editing mode that renders blocks in place; Source mode shows raw text), same note: same three checks.
- [x] Round 3: hover a point. Round 2 had Obsidian's page preview open under the tooltip; the SVG `isShown` shim now answers `false` so the hover handler bails. Preview gone, error gone (2026-09-26).
- [x] Round 4 (2026-09-27): the shim is removed; the chart element stops `mouseover` bubbling instead. Re-check in reading view, live preview, an embed and a Canvas card: no `isShown` error in the console, no page preview under a tooltip, tooltips and brush still work.
- [x] `tests/Surfaces/Canvas.canvas`: in the `.base` card (Scatter), brush loses to card drag. Decision: brushes are spec-level (the plugin adds none); fixtures keep tooltips only in Canvas; documented as a Canvas limitation.
- [x] Round 2: Canvas note card `9 Canvas card text` shows the scatter (round 1: blank, same property-selection cause).
- [x] Canvas static map card: no tooltip on hover, no console errors.
- [x] `tests/Surfaces/7 Geo`: second map is static (`interactive: false`), first has tooltips.
- [x] Mobile: checked in DevTools device mode only; real device still open.

## (d) Geo via vault loader

- [x] `tests/Surfaces/7 Geo`: both maps render with country shapes.
- [x] Console shows no loader errors. Rename `tests/geo/world-110m.json` temporarily → an error icon top left of each map; its hover text and click box name the missing path. Rename back.

## (e) Size and load time

- [x] `main.js` size (from `npm run build` output): ______ MB
- [x] Console → `[agate] loaded, vega x.y.z`. Time from app start to that line vs. a vault without Agate: noticeable? ______
- [ ] Mobile load time, if tried: ______

## Lifecycle and errors

- [x] `tests/Surfaces/8 Broken`: six error boxes; console shows `[agate] render error` as a warning with the message (fine).
- [x] `tests/Surfaces/1 Inline spec`: toggle light/dark. First chart follows, quartz chart does not.
- [x] Settings → Agate → Theme → `dark`. All Obsidian-themed charts switch. Back to `obsidian`.
- [x] Settings → Config overrides → `{"mark": {"color": "#e93147"}}`. Bars turn red where the spec does not set a colour.
- [x] Resize the pane with a chart. Vega-Lite charts without explicit width re-fit.
- [x] Console: type `window.__agateViews` into the console prompt and press Enter (debug on; also logged as `[agate] live views: n` after each render). Open several charts, note the number, close their tabs, check again: should drop back to the number of charts still visible.
- [x] Disable the plugin in settings. No errors; charts disappear; `.base` views show "view type not found" or fall back, whichever Obsidian does.

## Round 1 findings (2026-09-26)

- `e.isShown is not a function` (app.js) when interacting with a chart: Obsidian extends `HTMLElement.prototype.isShown` and calls it on event targets; Vega's SVG marks are `SVGElement`s. Round 2 ships a shim on `SVGElement.prototype`. Check the error is gone.
- Only properties in the view's `order` were converted, so views without an order (every `base:` block without `view:`) had no `note.*` fields. Round 2 scans the spec for referenced properties.
- Bases `today() - published` is a Duration, not a number; `age` formula now `today().year - published.year`.
- Vega-Lite sorts discrete axes alphabetically unless `sort: null`; the ADR claimed input order was kept. Corrected in ADR D3.
- "Infinite extent" warnings came from the first Vega run happening before rows were injected. Round 2 inlines the rows into the spec for the first run.
- `WARN Dropping "fit-y" because spec has discrete height`: Vega-Lite's own message for `width: container` with a `step` height. Harmless, left as is.
- Bundle 885 KB, load time fine. `isDesktopOnly` stays false pending a real device.

## Decisions this feeds

- D3 fallback needed? (b) says.
- `interactive` default per surface: (c) says. Especially Canvas.
- `isDesktopOnly`: (e) mobile says.
- D4 `Value` mapping: confirmed, see (a).
