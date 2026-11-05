# Community-directory listing images

Screenshots for the Agate listing on community.obsidian.md (Edit listing → Screenshots: up to 5 desktop images at 1200×800, JPEG/PNG/WebP, 5 MB each).

- `NN-name.png`: 1200×800, upload these to the directory.
- `2x/NN-name@2x.png`: 2400×1600, for the website and retina screens.
- `04-themes.png` and `04b-themes-dark-front.png` are two versions of the same slide (salmon "plotted" card on paper vs. graphite). Pick one.

Every chart on the slides is drawn by Agate from the demo vault.

## Before uploading

Slides 05, 07 and 08 use Obsidian windows recreated in HTML around real chart captures (tabs, breadcrumb, title, toolbar). Replace them with real captures of those notes when you have them; slides 01, 03 and 06 already use real captures.

## Rebuilding

- `src/slides.html`: all slides, one `<section>` each. Fonts: Inter / Inter Display, DejaVu Sans Mono (system).
- `src/img/`: every image the slides use (crops of `docs/site` captures plus the rendered theme cards).
- `src/render.py`: renders all slides to PNG at both sizes (`pip install playwright pillow && playwright install chromium`).
- `src/themes/`: renders the theme cards (`npm i`, then `python3 shoot2.py` and `python3 shoot3.py`) from `demo-vault/charts/theme-sampler.vl.json` and the board-game notes (`data.js`, exported from the vault).
- `src/themes/configs/*.json`: the Vega configs behind each card. `plotted*`, `instrA/B` and `reading` reference SVG hatch patterns (`url(#q1)` etc.) that the render script injects; as plain Agate theme files they need those colours swapped for solid ones or Agate textures.
- `src/boardgames.json`: the board-game notes as rows, used to build `data.js`.
