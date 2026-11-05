# Themes

## Setting a theme

- **Vault-wide:** Settings → Agate → Theme. The default is `auto`.
- **One chart:** the **Theme** option in a base view's settings, or `theme:` in an `agate` block.
- **Tweaks:** **Config overrides** (a small Vega `config` in settings) and **Theme file** (a JSON/YAML config in the vault) merge over the chosen theme, in that order. A `config` inside a spec wins over all of them.

| Theme | What it does |
|---|---|
| `auto` | Fonts, text and grid from your Obsidian theme, plus a category palette made for that theme (see below). |
| `obsidian` | Same chrome, with your theme's own named colors (`--color-red` and the rest) as the palette, unchanged. |
| `eink` | For e-ink and grayscale screens: four ink tones, outlined bars and slices, a shape per category, dotted grids, no transparency. |
| `instrument` | `obsidian` as a monochrome readout: monospace, ink marks, small dots, dotted grids. |
| `quartz`, `dark`, `vox`, … | Vega's stock themes. Most have a fixed white background. |

The first four read your theme's CSS when they draw, so charts redraw when you switch theme or light/dark.

## How `auto` picks a palette

1. **Theme name.** Agate reads the active community theme's name and matches it against the table below. Matching ignores case, spaces, punctuation and accents, so "Rosé Pine" and "rose-pine" both match.
2. **Minimal.** Minimal reports the color scheme picked in Style Settings as a body class (`minimal-nord-dark`, `minimal-gruvbox-light`). Agate reads the class for the current mode.
3. **AnuPpuccin / Catppuccin.** The flavor comes from a `ctp-` body class (`ctp-mocha`, `ctp-latte`). AnuPpuccin's extra flavors (`ctp-nord`, …) map to their own palette.
4. **Light or dark** picks the variant, from Obsidian's `theme-dark` body class.
5. **Anything else**, including the default theme, gets a toned-down set of Obsidian's named hues. It's rotated so the hue closest to your accent comes first.

| Palette | Matches (theme name, or Minimal scheme) | Light | Dark |
|---|---|---|---|
| Catppuccin | Catppuccin, AnuPpuccin | Latte | Mocha; Macchiato, Frappé by class |
| Rosé Pine | Rosé Pine | Dawn | Main; Moon by name or class |
| Tokyo Night | Tokyo Night | Day | Night; Storm by name |
| Nord | Nord, Obsidian Nord | ✓ | ✓ |
| Gruvbox | Gruvbox | ✓ | ✓ |
| Everforest | Everforest, Everforest Enchanted | ✓ | ✓ |
| Solarized | Solarized | ✓ | ✓ |
| Dracula | Dracula, Alucard | ✓ | ✓ |
| Atom | Atom, One Dark | ✓ | ✓ |
| Flexoki | Flexoki | ✓ | ✓ |
| `eink` theme | Ink, MonoGray, Borozdov (exact name) | ✓ | ✓ |

Each palette uses the theme's own colors. A color too faint on its theme's background was darkened to reach 3:1 contrast. Slots are ordered so neighboring series stay apart for color-blind readers (`test/unit/palettes.test.ts` checks every palette). A few muted palettes ship fewer than eight colors, because more could not be told apart.

**Not matching?** Turn on Settings → Agate → Debug logging and open the developer console. Each change logs `auto theme palette: <id>`. If your theme isn't recognized, pick `obsidian` to use its own colors, or open an issue with the theme's name.

## Colors inside a spec

To color a single mark from the theme, declare an `agateColors` param and read roles from it: `{"expr": "agateColors.accent"}`. Roles: `text`, `muted`, `faint`, `background`, `border`, `accent`, `red`, `orange`, `yellow`, `green`, `cyan`, `blue`, `purple`, `pink`. `agateDark` is true in dark mode. See the [guide](guide.md#8-theme-dark-mode-and-color).
