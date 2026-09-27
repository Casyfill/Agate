# ADR-0001: Agate architecture and roadmap for v0.1, with v0.2 preparation

| | |
|---|---|
| Status | Accepted (2026-09-20) |
| Date | 2026-09-20 |
| Amended | 2026-09-20, after first review: D3 (toolbar as filter UI), D7 (add-on hatch), D8 (testing), new D10 (interaction model), new D11 (vault-wide defaults). 2026-09-26, after M0 round 1: D3 (sort), D4 (property selection), D10 (Canvas result, isShown shim) |
| Deciders | Philipp (maintainer) |
| Supersedes | none |

## Context

Agate is an Obsidian plugin that renders Vega and Vega-Lite visualisations from data held in Obsidian Bases. The repository currently holds only `AGENTS.md` and `README.md`; this ADR fixes the architecture before the first line of code so that later work has something to be measured against.

Acceptance criteria for v0.1 (from `README.md`):

1. Plugin code is set up and installable locally for testing.
2. In-note and separate visualisations, Vega and Vega-Lite, from embedded code or a separate spec file.
3. Specs can refer to data in Obsidian Bases; data is pulled before rendering.
4. Tests and semver are set up.
5. Docs exist: quickstart and API reference.
6. Plugin structure and logic are defined, with notes for future upgrades and add-ons.

Secondary goals (v0.2 candidates): canvas support (static or interactive), Dataview as a dynamic data input, and a third item that is truncated in the README (see Open questions).

### What the platform offers today

Verified against the Obsidian developer docs and `obsidian.d.ts` (API 1.10+; current desktop release is 1.14.x):

- `Plugin.registerBasesView(viewId, { name, icon, factory, options })` registers a custom Bases view type. The view class extends `BasesView`, receives a `QueryController`, and is called back through `onDataUpdated()` with `this.data: BasesQueryResult` (`data: BasesEntry[]`, `groupedData`, `properties`). Each `BasesEntry` exposes `file: TFile` and `getValue(propertyId): Value | null`. `BasesViewConfig` gives `get(key)`, `set(key, value)`, `getOrder()`, `getSort()`, `getDisplayName()`, `getEvaluatedFormula()` (1.10.2).
- View options (`text`, `multitext`, `toggle`, `dropdown`, `slider`, `property`, `file`, `folder`, `formula`, `group`) are declared in the registration and persisted by Obsidian into the `.base` file. No custom settings UI is needed.
- `QueryController` has no public methods beyond `Component`. There is no public API to execute a base query from arbitrary plugin code. Bases data reaches a plugin only through a registered view.
- A base renders inside a note either as a file embed, `![[Library.base#Chart]]`, or as a ```` ```base ```` code block containing Bases YAML (`filters`, `formulas`, `views`).
- Bases property ids are typed strings: `note.<prop>`, `formula.<name>`, `file.<field>`.
- An existing community plugin, obsidian-vega (Justin-J-K), already claims the ```` ```vega ```` and ```` ```vega-lite ```` code block languages. Obsidian throws if a second plugin registers a language that is already taken.

### Decision drivers

- Use only public Obsidian API. Internal `app.internalPlugins` access is off the table for v0.1; it breaks silently across releases.
- One rendering path. Every surface (base view, embed, code block, later canvas) should end in the same renderer with the same data shape, so behaviour and bugs are shared.
- Specs should be portable. A Vega-Lite spec written for Agate should run unchanged in the Vega editor once the `base` dataset is swapped for inline values.
- Small, testable core. Vega itself is heavy; Agate's own code should be thin adapters around it.
- Leave room for add-ons without committing to their design now.

## Decision

### D1. Plugin skeleton and tooling

TypeScript, bundled with esbuild into a single `main.js`, following the layout of `obsidianmd/obsidian-sample-plugin`: `manifest.json`, `main.ts`, `styles.css`, `versions.json`, `version-bump.mjs`, `esbuild.config.mjs`. Plugin id `agate`, `minAppVersion` `1.10.2` (first version with the full Bases view API used here), `isDesktopOnly: false` as a target, to be confirmed by the spike in M0.

`vega`, `vega-lite` and `vega-embed` are bundled into `main.js`. There is no supported way to lazy-load third-party scripts inside Obsidian, and a 1.5 to 2 MB `main.js` is within what other chart plugins ship. Production builds are minified; dev builds keep sourcemaps.

Local install for testing: a `test-vault/` directory committed to the repo containing sample notes, a sample `.base`, and sample spec files, plus an `npm run install:local` script that symlinks the build output into `test-vault/.obsidian/plugins/agate/`. Hot reload via the community "Hot Reload" plugin is documented but not required.

### D2. Source layout

```
src/
  main.ts                 Plugin entry: settings, registrations, API exposure
  settings.ts             Settings tab and defaults
  core/
    spec.ts               Parse a block/option into a resolved spec: inline vs file,
                          Vega vs Vega-Lite detection, path resolution
    render.ts             AgateRenderer: wraps vega-embed, owns the Vega View,
                          dataset injection, resize, dispose
    theme.ts              Obsidian CSS variables -> Vega config
    loader.ts             Vault-aware Vega loader + URL-scheme registry
    data/
      types.ts            Row, Dataset, DataSource interfaces
      bases.ts            BasesEntry -> Row conversion, Value -> JSON mapping
  surfaces/
    bases-view.ts         AgateBasesView, registered via registerBasesView
    codeblock.ts          ```agate processor (optional ```vega / ```vega-lite aliases)
  api/
    index.ts              Public AgateAPI surface and exported types
test/
  mocks/obsidian.ts       Minimal obsidian module mock for vitest
  unit/                   spec, theme, loader, bases conversion
  render/                 headless Vega -> SVG snapshot tests
test-vault/               Manual test vault, also used by docs screenshots
docs/
  quickstart.md
  agate-block.md          Block and view option reference
  data-model.md           Row shape, Value mapping, dataset names
  api.md                  Extension API for other plugins
  adr/
```

`core/` must not import from `obsidian` except for types and pure helpers (`parseYaml`, `normalizePath`). Everything that touches `app`, DOM lifecycle, or Bases lives in `surfaces/`. This is what makes `core/` unit-testable in Node.

### D3. Two surfaces, one renderer

Agate exposes two ways to place a chart. Both end in `AgateRenderer`.

**Surface A: the `agate` Bases view.** Registered with `registerBasesView('agate', …)`. A base gets a chart layout next to Table, Cards, and the others. This is the only way Bases data can reach the plugin with public API, so it is the primary surface. Because it is a normal Bases view, the chart appears anywhere a base renders: a `.base` tab, `![[Library.base#Chart]]` embeds, ```` ```base ```` blocks inside notes, sidebars, and Canvas file cards.

The Bases toolbar is the chart's filter UI. Filters, sort, group, limit and the Properties menu all belong to Bases; each change fires `onDataUpdated()`, and Agate pushes the new rows into the existing Vega View (`view.data(name, rows).runAsync()`). Agate builds no filter widgets of its own. A base with several `agate` views gives several charts over one query, each with its own view-level filters, which is how a dashboard is assembled in Bases terms. Sort order matters more than it looks: with `"sort": null` on a discrete encoding, Vega-Lite keeps the order rows arrive in, so the Bases sort menu doubles as the axis-order control (without it Vega-Lite sorts discrete axes alphabetically; corrected after M0). Grouping surfaces as the `group` row field (D4). How this coexists with Vega's own interactivity is D10.

View options:

| key | option type | purpose |
|---|---|---|
| `specFile` | `file` | Path to a `.json` spec in the vault (`*.vl.json` / `*.vg.json` by convention) |
| `spec` | `multitext` | Inline spec (JSON or YAML) used when `specFile` is empty |
| `dataset` | `text` | Name of the Vega dataset that receives the rows; default from vault settings (`base`) |
| `theme` | `dropdown` | Overrides the vault default theme for this chart (D11) |
| `renderer` | `dropdown` | `svg` or `canvas`; default from vault settings |
| `actions` | `toggle` | Show the vega-embed export menu; default from vault settings |
| `interactive` | `toggle` | Off renders once and drops Vega's event handling (D10); default from vault settings |

Unset options inherit the vault-wide defaults (D11), so a fresh `agate` view needs only a spec.

**Surface B: the ```` ```agate ```` code block.** For charts whose spec lives in the note, and for data that is not a base (inline `values`, vault files via the loader). The block body is YAML (JSON is valid YAML, so a spec can be pasted verbatim). If the top level contains `$schema`, `mark`, `layer`, `marks`, `hconcat`, `vconcat`, `concat`, `repeat` or `facet`, the whole body is the spec. Otherwise the body is an Agate envelope:

```yaml
spec: charts/books.vl.json      # or an inline mapping
base: Library/Books.base        # optional: pull rows from this base
view: Chart                     # optional: which view's filters/order to use
dataset: base                   # default
renderer: svg
actions: false
```

When `base` is set, the block processor reads the `.base` file, parses its YAML (`parseYaml`), takes the global `filters`, `formulas`, `properties`, and (if `view` is given) that view's `filters` and `order`, appends a synthesized view of type `agate` carrying the block's own spec, and renders the result as a ```` ```base ```` block through `MarkdownRenderer.render`. The Agate Bases view then does the rendering. Bases stays the only query engine; Agate never re-implements filters or formulas.

This synthesis path is the one part of the design not yet proven against the runtime. M0 validates it. Fallbacks, in order: (1) require the user to add an `agate` view to their base and reference it by name, with the code block rendering `![[file.base#View]]`; (2) drop `base:` from the code block for v0.1 and document Surface A as the way to chart base data.

The ```` ```vega ```` and ```` ```vega-lite ```` aliases are an opt-in setting, default off, registered inside a try/catch so a clash with obsidian-vega degrades to a Notice rather than a failed plugin load.

### D4. Data model: rows mirror Bases property ids

Each `BasesEntry` becomes one row. Field names reuse the Bases property id so a Vega field string is identical to what the user sees in Bases:

```json
{
  "file": { "name": "Dune", "path": "Library/Dune.md", "ext": "md", "folder": "Library",
            "ctime": "2024-01-02T10:00:00.000Z", "mtime": "...", "size": 4123, "tags": ["book"] },
  "note": { "rating": 5, "published": "1965-08-01", "genre": ["sci-fi"] },
  "formula": { "age": 61 },
  "group": "sci-fi"
}
```

Vega treats `.` as nested access, so `"field": "note.rating"` and `"field": "file.name"` work without escaping. `group` is present only when the view has a groupBy.

Which properties are converted: the union of what the spec refers to (exact `note.x` / `formula.x` / `file.x` strings anywhere in the spec, and `datum.note.x` inside expressions), what the user made visible in the Bases Properties menu (`config.getOrder()`), and `file.name` / `file.path` always. The spec scan is what makes a synthesized view work, since it has no property order of its own (M0 finding). Conversion cost stays proportional to what the chart needs; an unfiltered base with thousands of notes and dozens of properties is never converted wholesale on every `onDataUpdated`.

`Value` to JSON mapping (implemented in `core/data/bases.ts`, table-driven, unit-tested):

| Bases `Value` | JSON |
|---|---|
| `StringValue` and subclasses (`LinkValue`, `ImageValue`, `IconValue`, `HTMLValue`) | string (`LinkValue` → target path; display text under `<field>__display` only if requested) |
| `NumberValue` | number |
| `BooleanValue` | boolean |
| `DateValue` | ISO-8601 string (Vega-Lite `temporal` parses it; a Vega spec uses `toDate`) |
| `DurationValue` | milliseconds as number |
| `ListValue` | array of mapped items |
| `FileValue` | path string |
| `NullValue`, `ErrorValue`, `null` | `null` |
| `ObjectValue` and anything unrecognised | `value.toString()` as a string |

Rows are injected with `view.data(datasetName, rows)` followed by `runAsync()`, never by mutating the spec. A Vega-Lite spec declares `"data": {"name": "base"}`; a Vega spec declares `"data": [{"name": "base"}]`. On `onDataUpdated` the same View is reused when the spec has not changed, so brushes and selections survive data refreshes.

### D5. Rendering

`vega-embed` with `actions` off by default, `renderer: 'svg'` by default (theme-able through CSS, sharp on HiDPI, selectable text), `canvas` as an opt-in for mark-heavy charts. Vega-Lite `width: "container"` is honoured by a `ResizeObserver` on the host element; Vega specs get `autosize: {type: "fit", contains: "padding"}` unless they set their own.

`core/theme.ts` builds the `obsidian` theme: a Vega `config` derived from Obsidian CSS variables at render time (`--text-normal`, `--text-muted`, `--background-primary`, `--background-modifier-border`, `--color-accent`, `--font-interface`, `--font-text-size`), re-rendered on the workspace `css-change` event. It is one of several selectable themes; which one applies, and how vault-wide overrides and the spec's own `config` layer on top, is D11.

`core/loader.ts` wraps `vega.loader()` so `data.url` values resolve against the vault: relative paths resolve from the hosting note (`metadataCache.getFirstLinkpathDest`), absolute vault paths via `vault.read`, and `http(s)` via `requestUrl` (CORS-free) behind a setting that is off by default, so the plugin makes no network requests unless the user turns it on. The loader also dispatches custom schemes (`<scheme>://…`) to providers registered through the API (D7); this is where Dataview plugs in later.

Every rendered chart lives in an Obsidian `Component` (the `BasesView` itself, or a `MarkdownRenderChild` for code blocks). `onunload` calls `view.finalize()` and disconnects observers. Leaking Vega Views is the most common failure mode in chart plugins and is treated as a bug class of its own, with a test.

### D6. Spec handling

`core/spec.ts` accepts inline JSON/YAML or a vault path and returns `{ mode: 'vega' | 'vega-lite', spec, sourcePath }`. Mode is taken from `$schema` (`/schema/vega-lite/` vs `/schema/vega/`), then an explicit `mode` key, then structural hints (`mark`/`encoding`/`layer` → Vega-Lite; `marks`/`scales`/`signals` → Vega), defaulting to Vega-Lite. Spec files are watched through `vault.on('modify')` and re-rendered on change. Errors (bad YAML, unknown file, Vega compile error) render as an in-place error box with the message and the offending path, never as a thrown exception.

### D7. Extension API and the add-on hatch

Vega extends through global registries on the `vega` module: `vega.projection(name, fn)`, `vega.scheme(name, colors)`, `vega.expressionFunction(name, fn)`, `vega.transforms[name]`, `vega.formats(name, parser)`, and a replaceable loader. Agate bundles its own copy of `vega`, so a separate add-on plugin that does `import * as vega from 'vega'` registers into a second copy that Agate's renderer never sees. The hatch therefore has one rule: add-ons never bundle Vega; they receive Agate's instance through the API and register into that.

`main.ts` exposes `plugin.api: AgateAPI`, reachable as `app.plugins.plugins.agate?.api`, and fires `app.workspace.trigger('agate:ready', api)` after load so add-ons can register regardless of plugin load order (add-ons register on `agate:ready` and, if the API is already present at their own load, immediately). v0.1 implements:

```ts
interface AgateAPI {
  apiVersion: 1;
  vegaVersion: string;
  vega: typeof import('vega');           // Agate's bundled instance; escape hatch for anything below
  vegaLite: typeof import('vega-lite');

  // Data
  registerDataScheme(scheme: string, provider: DataSchemeProvider): () => void; // "dataview://…", "tiles://…"

  // Vega registries, typed wrappers over api.vega so unregister is possible
  registerExpressionFunction(name: string, fn: (...args: unknown[]) => unknown): () => void;
  registerProjection(name: string, factory: () => GeoProjection): () => void;
  registerScheme(name: string, colors: string[] | ((t: number) => string)): () => void;
  registerTransform(name: string, transform: typeof vega.Transform): () => void;
  registerFormat(name: string, parser: (data: unknown, options?: unknown) => unknown[]): () => void;

  // Spec pipeline
  registerSpecPreprocessor(fn: (spec: AnySpec, ctx: SpecContext) => AnySpec): () => void;
  registerTheme(name: string, config: VegaConfig | (() => VegaConfig)): () => void;

  // Rendering for plugins that want a chart in their own UI
  render(el: HTMLElement, spec: unknown, opts?: RenderOptions): Promise<AgateHandle>;
}
```

Each `register*` returns an unregister function for the add-on's `onunload`. The Vega registries have no native unregister; the wrappers keep a shadow map and restore the previous entry.

Geo as the worked example. Nothing geo-specific is needed in Agate core: Vega already ships the `geoshape` mark, about twenty projections, and GeoJSON/TopoJSON parsing (`"format": {"type": "topojson", "feature": "countries"}`), and Vega-Lite passes projection types through to Vega, so a custom projection registered with `registerProjection` is usable from both spec flavours. What core must guarantee is that the loader (D5) can serve a TopoJSON file from the vault, which M0 checks. A future "Agate Geo" add-on would then bring what Vega lacks: extra projections from `d3-geo-projection`, bundled atlases behind a scheme (`atlas://world-110m`), and raster basemaps as a `tiles://` data scheme that yields tile rows for the current viewport, drawn with `image` marks and injected through a spec preprocessor (`"agate:basemap": "osm"` expands into the layer). All of that fits the interface above without touching core.

The preprocessor and the raw `vega` handle are the two escape hatches; if an add-on needs something neither covers, that is the trigger for a new ADR, not a core patch.

### D8. Testing, versioning, release

Obsidian cannot be launched in CI cheaply and `obsidian` ships types only, so testing is layered: everything that can run in Node does, and the Obsidian-only remainder is a short, repeatable manual matrix over a committed test vault.

**Layer 1: unit tests in Node** (vitest, jsdom, on every push). `test/mocks/obsidian.ts` provides the runtime pieces `core/` touches (`parseYaml` via `js-yaml`, `normalizePath`, `Component`, `TFile`). Covered: spec detection and resolution (`$schema`, `mode`, structural hints, file vs inline, relative path resolution), the `Value` to JSON table in D4 with one case per `Value` class and per edge (`null`, `ErrorValue`, nested lists, dates with and without time), theme derivation from a fake CSS variable set, loader dispatch (vault path, relative path, blocked remote URL, registered scheme), ```` ```base ```` YAML synthesis from a `.base` fixture plus envelope (global filters kept, view filters merged, `agate` view appended, spec carried), and the API registry wrappers (register, unregister restores the previous entry, double-register is an error).

**Layer 2: headless render snapshots** (Node, same vitest run). For each fixture spec in `test/fixtures/specs/` paired with a fixture row set, compile (Vega-Lite → Vega where needed), inject the dataset, run `new vega.View(vega.parse(spec), {renderer: 'none'}).toSVG()` and snapshot the SVG. This exercises the real Vega pipeline against the D4 row shape and the D5 theme config without Obsidian; a changed field name, a broken date mapping or a theme regression shows up as a snapshot diff. Fixtures include a bar, a line with temporal axis, a grouped (faceted) chart, a `geoshape` map over a small TopoJSON file, and one intentionally broken spec asserting the error shape.

**Layer 3: manual matrix in `test-vault/`** (before every tag; also the developer's daily loop). The vault ships fixtures and a checklist note, `test-vault/Checklist.md`, whose items are the matrix below. The checklist is the acceptance gate for a release; a run is recorded in the PR or release notes.

| Axis | Values |
|---|---|
| Surface | `.base` tab · `![[X.base#View]]` embed in reading view · embed in live preview · ```` ```base ```` block · ```` ```agate ```` block (inline spec) · ```` ```agate ```` block (`spec:` file) · ```` ```agate ```` with `base:` · Canvas text card · Canvas `.base` card · sidebar |
| Spec | Vega-Lite · Vega · geoshape with TopoJSON from vault · broken spec (error box, no console exception) |
| Data | base rows (note, formula, file, grouped) · inline `values` · vault CSV/JSON via `url` · empty result set |
| Toolbar | change filter · sort · group · limit · toggle a property; chart updates without re-embed, brush survives |
| Interaction | tooltip · hover highlight · interval brush · bound `params` input · `interactive: false` renders static SVG |
| Lifecycle | edit spec file → re-render · edit a note's property → re-render · switch light/dark theme · resize pane · close tab · disable plugin → no errors, no leaked Views (`window.__agateViews` counter, debug build only) |
| Platform | desktop macOS · Obsidian Mobile via iCloud/Sync copy of `test-vault/` (load time, touch on brush) |

**Layer 4: end-to-end automation** (optional, v0.2). `wdio-obsidian-service` can drive a real Obsidian against `test-vault/` in CI. Worth it once Layer 3 grows past a screen; not a v0.1 requirement.

**Local development loop.** Prerequisites: Node 22+ (`.nvmrc`), npm, Obsidian 1.10.2+.

1. `git clone` and `npm install`.
2. `npm run dev` starts esbuild in watch mode and writes `main.js` to the repo root.
3. `npm run install:local` creates `test-vault/.obsidian/plugins/agate/` with symlinks to `main.js`, `manifest.json`, `styles.css`. (On Windows without symlink rights it copies instead and must be re-run after builds.)
4. In Obsidian, Open folder as vault → `test-vault/`. Settings → Community plugins → turn off Restricted mode → enable Agate. Install the community plugin "Hot Reload" in the test vault to pick up rebuilds automatically; otherwise use the command "Reload app without saving".
5. Open `test-vault/Start here.md`: it links to every fixture and the checklist. Developer console is Ctrl/Cmd+Shift+I; Agate logs under the `[agate]` prefix, verbose when the "Debug logging" setting is on.
6. To try Agate in a real vault instead, point `AGATE_VAULT=/path/to/vault npm run install:local` at it. Never develop against a vault without a backup.

`test-vault/` contents committed in M1: `Library/*.md` (a dozen notes with `rating`, `published`, `genre`, `pages` properties, some deliberately missing values), `Library/Books.base` (Table view plus two `agate` views, one grouped), `charts/*.vl.json` and `charts/*.vg.json`, `geo/world-110m.json`, `data/sales.csv`, notes exercising every row of the surface axis, one Canvas file, and `Checklist.md`.

Versioning follows semver with the pre-1.0 convention that a minor bump may break. `manifest.json` is the single source of the version; `npm version` triggers `version-bump.mjs`, which updates `manifest.json` and `versions.json`. Tags `x.y.z` trigger a GitHub Actions workflow that builds and attaches `main.js`, `manifest.json`, `styles.css` to a release, the shape the community plugin directory requires. Commits follow Conventional Commits; `CHANGELOG.md` is kept by hand in Keep-a-Changelog format.

### D9. Documentation

`README.md` stays the front door. `docs/quickstart.md` walks from install to a first chart over a base in under ten minutes. `docs/agate-block.md` and `docs/data-model.md` are the user-facing reference for D3 and D4. `docs/api.md` documents D7 for plugin authors and is generated from `src/api` with typedoc where possible, hand-written where not. `docs/testing.md` carries the living version of the D8 loop and checklist. Architecture decisions continue in `docs/adr/`.

### D10. Interaction model

Interactivity is split into two layers that never share state, because the first is cheap and reliable and the second is where chart plugins usually get into trouble.

Layer 1, data selection, belongs to Bases. Filters, sort, group, limit, visible properties: all toolbar, all Bases. Agate's side of it is a data update into an existing Vega View. Nothing to invent, nothing to debug beyond the D4 mapping. For v0.1 this is the recommended way to filter a chart, and the quickstart teaches it first.

Layer 2, in-chart interaction, belongs to Vega: tooltips, hover highlight, interval and point selections, `params` bound to input widgets, pan and zoom. Agate implements none of it and adds no abstractions over it; a spec that works in the Vega editor behaves the same in a note. Agate's obligations are narrow:

- Reuse the View across `onDataUpdated()` calls when spec and theme are unchanged, so selections and signal state survive a filter change in the toolbar. Re-embed only when the spec, the theme, or the renderer changes.
- Provide a static mode (`interactive: false`): render once, then `view.finalize()` to drop Vega's event listeners and timers while leaving the SVG in place. This is the escape hatch for Canvas cards and for embeds where gestures conflict.
- Style vega-tooltip's element (it is appended to `document.body`) with Obsidian variables so tooltips look native in both themes.

Known friction points, each an M0 check and a Layer 3 checklist row: Canvas card drag versus an interval brush; pointer events inside embedded bases in reading view; Obsidian's hover-link preview firing on `file.name` marks at the same time as a Vega tooltip; touch on mobile for brushes; tooltip placement inside scrolled containers.

M0 result (2026-09-26): tooltips and brushes work in reading view and in `.base` tabs; in Canvas the card drag wins over a brush, while tooltips work once the card is selected. Decision: `interactive` stays on everywhere. Brushes are a spec author's choice, not something Agate adds, and the plugin does not try to make them work in Canvas; the docs say so and the fixtures use tooltips only where Canvas is involved. One more M0 finding: Obsidian calls its own `HTMLElement.prototype.isShown()` on event targets, and Vega's SVG marks are `SVGElement`s, so interacting with a chart threw inside app.js. Agate shims `SVGElement.prototype.isShown` for the life of the plugin. Round 2 showed the shim must answer `false`: answering for the HTML ancestor let Obsidian's hover handler continue and open a page preview of the embedding note under the Vega tooltip. Alternative if the shim proves fragile: default renderer `canvas`.

Two-way binding (a Vega selection narrowing the base's filters) is out of scope. `BasesViewConfig.set()` writes view options, not filters, and there is no public API for filters. Revisit if Obsidian adds one; it would be its own ADR.

### D11. Vault-wide defaults

Every rendering choice has a vault-level default in Agate's settings tab, so a user sets their look once rather than per chart. Resolution order, most specific wins:

1. The spec's own `config` block (a spec that insists on its colours gets them).
2. Per-chart options: Bases view options (D3, Surface A) or envelope keys (Surface B).
3. Vault settings (this section).
4. Agate's built-in defaults.

Settings (`settings.ts`, stored in `data.json`, migrated by a `settingsVersion` field):

| setting | default | notes |
|---|---|---|
| Theme | `obsidian` | `obsidian` is the dynamic theme from D5 (follows light/dark and the active community theme live). Also selectable: the static named themes bundled from `vega-themes` (`dark`, `quartz`, `vox`, `fivethirtyeight`, `ggplot2`, `latimes`, `urbaninstitute`, `googlecharts`, `powerbi`, `carbonwhite`, `carbong90`, …) and any theme registered through `api.registerTheme`. |
| Config overrides | `{}` | A Vega `config` object (JSON or YAML in a text area) merged over the chosen theme with `vega.mergeConfig`. Fonts, axis colours, default mark colour, `background`, `padding`: anything Vega accepts. |
| Theme file | empty | Optional vault path to a JSON/YAML config, watched for changes, applied after Config overrides. Lets a theme live in the vault and sync with it. |
| Renderer | `svg` | `svg` or `canvas`. |
| Actions menu | off | vega-embed export menu. |
| Interactive | on | See D10; may default off per surface after M0. |
| Default dataset name | `base` | |
| Load remote URLs | off | D5 loader; when off, `http(s)` `data.url` renders an error box naming the setting. |
| `vega` / `vega-lite` block aliases | off | D3; needs an app reload, warns about obsidian-vega. |
| Debug logging | off | Verbose `[agate]` console output and the View leak counter. |

The resolved config is computed once per render and passed to vega-embed as `config`; `css-change`, a settings change, or a theme-file edit invalidates it and re-embeds affected charts. Per-chart options can name a theme too (`theme: quartz` in an envelope, a `dropdown` view option in Surface A), which is how one chart in a vault can diverge from the house style.

## Roadmap

### v0.1 (primary)

| # | Milestone | Delivers | Criteria |
|---|---|---|---|
| M0 | Spike (timeboxed, ~2 days) | Throwaway branch proving: (a) `registerBasesView` + vega-embed renders inside a `.base` tab, an embed, and a ```` ```base ```` block, and toolbar filter changes update the chart without re-embed; (b) synthesized ```` ```base ```` from a code block via `MarkdownRenderer.render` works; (c) an interval brush and a tooltip behave in reading view, live preview, and a Canvas card, and `view.finalize()` gives a usable static mode; (d) a `geoshape` map loads TopoJSON from the vault through the loader; (e) bundle size and load time on desktop and mobile. Decides the D3 fallback, D10 defaults per surface, and `isDesktopOnly`. | risk reduction |
| M1 | Skeleton | Tooling from D1 and D2, empty plugin loads, `test-vault/` with fixtures and `Checklist.md`, `install:local`, vitest with the `obsidian` mock, lint, CI on push, `docs/testing.md`. | AC1, AC4 |
| M2 | Renderer core + code block + settings | `core/spec`, `render`, `theme`, `loader`; D11 settings tab and resolution chain; ```` ```agate ```` with inline or file spec and inline or vault-file data; error boxes; disposal test; Layer 2 snapshots. | AC2 |
| M3 | Bases view | `AgateBasesView` with the options table from D3; `Value` mapping; dataset injection with View reuse; re-render on `onDataUpdated` and `css-change`; static mode. | AC3 (separate visualisations) |
| M4 | Base reference from code blocks | `base:` / `view:` in the envelope via synthesis (or the fallback chosen in M0). | AC3 (in-note) |
| M5 | API, docs, release | `AgateAPI` from D7 including the registry wrappers and `agate:ready`, quickstart, block and data-model reference, API reference, `CHANGELOG.md`, release workflow; full Layer 3 run; tag `0.1.0`. | AC5, AC6 |

M1 through M3 can each be merged independently; M4 depends on M0's outcome; M5 closes the version.

**M0 outcome (2026-09-26).** All five questions answered on desktop; the spike code is kept as the starting point for M1 rather than thrown away, since it already follows D2. (a) The `agate` view renders in `.base` tabs, embeds, ```` ```base ```` blocks and Canvas cards; toolbar filter, sort (with `sort: null` in the spec), group and property changes update the chart in place and a brush survives them. (b) The synthesized ```` ```base ```` block works from a code block, in notes and in Canvas cards; no D3 fallback needed. (c) Tooltips and brushes work in reading view and live preview; in Canvas the card drag beats a brush and tooltips need the card selected; `interactive` stays on everywhere. Two Obsidian interactions needed fixes: `HTMLElement.prototype.isShown` is called on SVG marks (shim returning `false`, which also stops the page preview from opening under a tooltip), and property selection must scan the spec, not rely on the view's `order`. (d) `geoshape` over vault TopoJSON works with no add-on. (e) `main.js` is 0.84 MB minified; load time not noticeable; mobile checked only in device emulation, so `isDesktopOnly: false` stands provisionally until a real device confirms. The `Value` question is settled too: `instanceof` against the classes exported by `obsidian` works at runtime (constructor names are minified, so never rely on those), numbers, strings, booleans, lists and formula results convert to their JSON counterparts, dates arrive as strings Vega's `toDate` parses, and `allProperties` exposes `file.basename` and `file.fullname` separately, so Bases' `file.name` matches Agate's (no extension). The D4 mapping stays as written; the defensive `toString()` paths remain as fallbacks only. M0 is closed; a debug command ("Dump first Bases row") stays in the plugin for future API drift.

### After M0: the road to 0.1.0 (revised 2026-09-26)

M0 closed with the spike code kept as the base. The remaining milestones, in order:

| # | Milestone | Delivers |
|---|---|---|
| M1 (done 2026-09-26) | Tests and hygiene | vitest with an `obsidian` mock; unit tests for spec parsing, the `Value` mapping, property scan, options precedence, loader dispatch and base-block synthesis; the headless Vega snapshot suite (Layer 2); eslint; CI on push. Pure functions extracted from surfaces where needed. |
| M2 | Loose ends | Spec-file and theme-file watching everywhere, "Reload charts" command, styled export menu, the facet sparkline fixture, static-mode re-render on data change. |
| M3 | Docs | `docs/quickstart.md`, `docs/agate-block.md`, `docs/data-model.md`, `docs/api.md`, `docs/testing.md`; README for users. |
| M4 | Release and registration | `LICENSE`, `CHANGELOG.md`, release workflow on tag, `versions.json`; full Layer 3 run and a real mobile device; PR to `obsidianmd/obsidian-releases`. Before submitting, resolve the two likely review comments: the `SVGElement.prototype.isShown` shim (a global prototype change; alternatives are intercepting `mouseover` at the chart element or defaulting to the canvas renderer) and guideline conformance of settings copy. BRAT for early installs while review runs. |

### v0.2 candidates

Kept in `docs/future-features.md`, reviewed when 0.1.0 ships. Two decisions taken now: Dataview as a data source is dropped (the generic `DataSchemeProvider` hook stays); small charts per note are done with Vega-Lite `facet` in a single Agate view and need no new code, with data-through-links and a `sparkline()` formula function (needs an Obsidian API that is announced but not yet public) as the follow-ups. Canvas is already covered by M0's findings; a standalone spec-file view for Canvas file cards remains a candidate.

## Consequences

Positive: one query engine (Bases) and one renderer (Agate) means filters, formulas, grouping and sorting are whatever Bases does, with no divergence. Charts appear everywhere bases appear for free. `core/` is testable in Node. Specs stay portable to the Vega editor. Other plugins can add data sources without Agate changing.

Negative: the code-block `base:` path depends on rendering a synthesized ```` ```base ```` block, which is unproven until M0 and may need the fallback. Bases data is available only where a `BasesView` is mounted; there is no way to run a query headlessly, so features like "export this dataset as CSV from a command" are blocked on Obsidian adding a query API. `main.js` will be large. The `agate` block language is new to users who already write `vega-lite` blocks; the opt-in aliases soften this but cannot coexist with obsidian-vega. In-chart interactivity is delegated to Vega wholesale, so its rough edges inside Obsidian (D10) can only be mitigated per surface, not fixed. Add-ons are bound to Agate's Vega version through `api.vega`; a major Vega upgrade in Agate is a breaking change for them and bumps `apiVersion`.

Neutral: the Bases API is marked 1.10.0 and has already gained methods in 1.10.2; Agate tracks the public typings and bumps `minAppVersion` when it uses something newer, recorded in `versions.json`.

## Open questions

1. README secondary goal 3 is truncated ("need to understand"). Needs the full sentence before v0.2 scoping.
2. Should `dataset` rows carry display strings for links (`file.name` vs the rendered link text) by default, or only on request? Proposed: on request, to keep rows small.
3. Mobile: is a 2 MB plugin acceptable on iOS load time? M0 measures it; if not, `isDesktopOnly: true` for 0.1 with mobile as a 0.x goal.
4. Whether `ObjectValue` exists in the public typings in the shape assumed in D4; the mapping table is written defensively and M3 confirms it.
5. Whether all of the D7 registry wrappers ship in 0.1 or only `registerDataScheme`, `registerExpressionFunction`, `registerTheme` and the raw `vega` handle, with projections, schemes, transforms and formats following once a first add-on needs them. Leaning towards the smaller set plus the raw handle; the interface is fixed either way.
6. Per-surface `interactive` defaults (D10) are decided by M0, not by this ADR.

## References

- Obsidian developer docs, "Build a Bases view": https://docs.obsidian.md/plugins/guides/bases-view
- `BasesView`, `BasesQueryResult`, `QueryController`, `BasesViewConfig` API reference: https://docs.obsidian.md/Reference/TypeScript+API/BasesView
- `Plugin.registerBasesView`: https://docs.obsidian.md/Reference/TypeScript+API/Plugin/registerBasesView
- Obsidian help, "Create a base" (embedding as `![[File.base#View]]` and as a ```` ```base ```` block): https://help.obsidian.md/bases/create-base
- `obsidianmd/obsidian-api` `obsidian.d.ts` (Bases types, 1.10.x)
- Existing plugin claiming `vega` / `vega-lite` blocks: https://github.com/Justin-J-K/obsidian-vega
- Vega-Embed: https://github.com/vega/vega-embed
