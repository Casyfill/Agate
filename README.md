<img src="docs/images/agate-logo.svg" alt="Agate" width="96" align="right">

# Agate

Agate brings [Vega](https://vega.github.io/vega/) and [Vega-Lite](https://vega.github.io/vega-lite/) visualizations to Obsidian. Create charts from Bases views that follow your notes, filters, and groups, or define your own visualizations in an agate code block.

Start with a ready-made chart, then customize it as needed—from simple comparisons to maps, timelines, networks, and dashboards.

![A base of battle notes next to Minard's 1812 map drawn from them](docs/site/hero.jpg)

**[Website](https://casyfill.github.io/Agate/) · [Quickstart](https://casyfill.github.io/Agate/quickstart.html) · [Gallery](https://casyfill.github.io/Agate/gallery.html) · [Guide](docs/guide.md) · [Changelog](CHANGELOG.md)**

## What it does

- **Chart as a Bases view.** Add an **Agate chart** view to any base. It appears wherever a base does: its own tab, embedded in a note (`![[Books.base#Ratings]]`), the sidebar, Canvas. The Bases toolbar's filter, sort and grouping drive the chart.
- **Charts in a note**, with an ```` ```agate ```` or ```` ```vega ```` code blocks: a spec file, rows from a base, or a self-contained spec.
- **Full suppport for Vega and Vega-Lite specs**, so no option list to outgrow: maps and globes, networks of linked notes, folder sunbursts, timelines, sankeys, linked dashboards.
- **Extras on top of plain Vega:**
  - **Per-note data.** A note can point to its own CSV, JSON or URL, e.g. a time series for each stock or city note ([guide](docs/guide.md#6-per-note-external-data)).
  - **Your vault as data.** Links between notes and the folder tree are datasets, so you can draw link graphs, arc diagrams, sunbursts and treemaps that follow the base's filter ([guide](docs/guide.md#10-gallery-structure-maps-flows)).
  - **Click to open.** Clicking a point, bar or node opens its note.
  - **Big numbers.** Live totals and averages shown as note text instead of a chart ([guide](docs/guide.md#11-experimental-big-numbers-as-note-text)).
  - **Map tiles under your marks**, with API keys kept in Obsidian's secret storage ([guide](docs/guide.md#basemaps-under-a-route)).
  - **Hatched and dotted fills** for print-style charts ([guide](docs/guide.md#textures-hatching-and-dots-svg-only)).
- **Looks like your vault:** the `obsidian` theme follows your Obsidian theme and light/dark mode; Vega's stock themes and your own theme files are there too.
- **Built with LLMs in mind**. Everything can be bult manually. Or, you can leverage any LLM (all of them know vega stack) to create visualization - or tailor a custom theme; 

## Install

In Obsidian: Settings → Community plugins → Browse, search for **Agate**, install and enable it. Needs Obsidian 1.13 or later with the core Bases plugin on. Works on desktop and mobile.

To try a beta, add `Casyfill/Agate` in [BRAT](https://github.com/TfTHacker/obsidian42-brat).

Then follow the [quickstart](https://casyfill.github.io/Agate/quickstart.html): 26 book notes to a bookshelf chart in about fifteen minutes. The [guide](docs/guide.md) covers everything else.

## Network use

Agate makes no network requests by default. Everything it draws comes from your vault.

- **Load remote data** (off by default) lets a spec load data files and images from `http(s)` URLs: remote CSV or JSON, map tiles under a route, pictures in image marks. Agate fetches only the URLs written in your specs, from whichever service they name; it sends no other data and has no telemetry.
- **API keys** (Advanced settings) are kept in Obsidian's secret storage and sent only to the one host you allow for each key.
- Images inside tooltips are an exception: vega-tooltip shows them as ordinary `<img>` elements, so a spec that puts an image URL in a tooltip loads it on hover even with Load remote data off.

## Making charts

- **Pick a recipe:** an empty Agate view offers thirteen ready-made charts. Agate asks which property goes where and writes the spec.
- **Ask an assistant:** **Copy prompt for an LLM** copies your base's properties, sample rows and Agate's rules for any chat assistant.
- **With an AI agent that works on your vault** (Claude Code and others): give it the [`agate-chart` skill](skills/agate-chart/SKILL.md). It knows Agate's conventions and extras and checks a spec renders before handing it over. Copy the `skills/agate-chart` folder into your agent's skills folder, for example `~/.claude/skills/`.
- **By hand:** specs are plain JSON. Install the [JSON Editor](https://community.obsidian.md/plugins/json-editor) community plugin to edit them inside Obsidian; **Edit spec** on a chart opens its spec beside it, and every save redraws the chart.

## Works with

- [Vega Visualizations](https://github.com/Justin-J-K/obsidian-vega) (```` ```vega ```` / ```` ```vega-lite ```` blocks): both plugins can be on. Without it, a setting lets Agate handle those blocks too.
- Other plugins can extend Agate through `app.plugins.plugins.agate.api` (data schemes, expression functions, themes, spec preprocessors); see [ADR 0001, D7](docs/adr/0001-architecture-and-roadmap.md).

Known limits are in the [guide's troubleshooting section](docs/guide.md) and [why-agate.md](docs/why-agate.md).

## Development

Node 22.12+ (`.nvmrc`), Obsidian 1.13+.

```sh
npm install
make demo            # regenerate the demo vault, build, link the plugin into it
npm run dev          # rebuild main.js on change
make check           # typecheck, lint, tests (what CI runs)
```

Open `demo-vault/` in Obsidian: the gallery's notes plus test notes under `tests/` (start with `tests/Test guide.md`). `make help` lists every target. Architecture and decisions: [`docs/adr/`](docs/adr/); testing: [`docs/testing.md`](docs/testing.md); backlog: [`docs/future-features.md`](docs/future-features.md); releasing: [`docs/releasing.md`](docs/releasing.md) (`make release VERSION=x.y.z`).

## License

MIT. Vega, Vega-Lite and vega-embed are bundled under their own BSD-3-Clause licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
