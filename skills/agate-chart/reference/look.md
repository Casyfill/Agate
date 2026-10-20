# Look: themes, colours, size

## Themes

The theme is chosen outside the spec: vault-wide in Settings → Agate → Theme, or per chart with the view's **Theme** option (or `theme:` in a code block). Leave theme choices to the user; write specs that work in any theme.

- `obsidian` (default): reads the Obsidian theme's fonts, text colours, grid and a category palette, and redraws on light/dark switch.
- `instrument`: `obsidian` redrawn as a monochrome readout (monospace, ink-coloured marks and small dots, dotted grids, labels inside the plot). Suits dense time series and small multiples.
- Vega's stock themes: `excel`, `fivethirtyeight`, `ggplot2`, `googlecharts`, `latimes`, `powerbi`, `quartz`, `urbaninstitute`, `vox`, `dark`, `carbonwhite`, `carbong10`, `carbong90`, `carbong100`. Most have a fixed white background.
- A **theme file**: a Vega `config` object (JSON or YAML) in the vault, set in Settings → Agate → Theme file, merged over the chosen theme. Example: `demo-vault/charts/themes/du-bois.json`. **Config overrides** in settings take a small config for one or two tweaks.

If the user wants a specific look for one chart only, put a `config` block in that spec instead; it wins over the theme.

## Colours that follow the theme

Don't hard-code text, axis or background colours. For data colours that should match the theme:

```json
"params": [{ "name": "agateColors", "value": { "text": "#222", "muted": "#777", "accent": "#7852ee", "red": "#e93147", "yellow": "#e0ac00" } }],
"mark": { "type": "line", "color": { "expr": "agateColors.accent" } }
```

Roles: `text`, `muted`, `faint`, `background`, `border`, `accent`, and `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`. The `value` is the fallback outside Obsidian. In Vega, declare it as a signal. `agateDark` (true in dark mode) is declared the same way.

Categorical colours from a scheme or an explicit `range` are fine when the categories mean something (finished green, abandoned grey).

## Size

- A single Vega-Lite view: no `width` (it fills the pane, and Agate re-renders on resize). Set `height` as a number, or `{"step": n}` for a discrete axis: each band gets n px. Bars with images or labels inside need 34 to 40.
- Facets, `concat`, `hconcat`, `repeat`: explicit `width` per view.
- Vega specs: set `width` from the container with `autosize: {"type": "fit-x", "contains": "padding"}` and a `width` signal that reads `containerSize()[0]` (see `demo-vault/charts/campaign-1812.vg.json`).

## Textures

Hatching, dots and patterns as fills: `reference/extras.md` (`textures`). SVG renderer only.
