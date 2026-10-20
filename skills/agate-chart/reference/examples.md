# Starting points

Start from the closest of these and change it, rather than writing from nothing. Fetch a file with its link (raw JSON) or read it from the Agate repository if it is on disk.

## Built-in recipes

In Obsidian, an empty Agate view offers **Pick a recipe**: the user picks one and maps properties to its roles, and Agate writes the spec. As a template, a recipe is a spec with `{{role}}` placeholders: `{{role}}` becomes a property id (`note.genre`), `{{role.expr}}` an expression accessor (`datum["note"]["genre"]`), `{{role.label}}` its display name. An optional role left unmapped removes every object that holds it. Fill the placeholders yourself and drop `usermeta.agate.recipe`.

| Recipe | What it draws | Roles | Template |
|---|---|---|---|
| Timeline | One dot per note on a time axis, optionally in rows by a category. Click a dot to open the note. | `{{date}}` When, `{{row}}` Rows by (optional) | [timeline.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/timeline.json) |
| Notes per category | Horizontal bars counting notes by a property. Sort the bars from the Bases toolbar. | `{{category}}` Category, `{{colour}}` Colour by (optional) | [bar-by-category.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/bar-by-category.json) |
| Headline numbers | A row of big numbers as note text: how many notes, the total and average of a number, the latest date, the most common value. Every part is optional; the numbers follow the base's filters. | `{{number}}` Number to total (optional), `{{date}}` Date (optional), `{{category}}` Most common (optional) | [stats.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/stats.json) |
| Scatter plot | Two numbers against each other, one point per note; optional colour and size. | `{{x}}` Horizontal, `{{y}}` Vertical, `{{colour}}` Colour by (optional), `{{size}}` Size by (optional) | [scatter.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/scatter.json) |
| Histogram | How a number is distributed across notes. | `{{value}}` Number | [histogram.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/histogram.json) |
| Line over time | A number per note by date, one line per category if you pick one. Daily notes with a mood, a weight or a word count are typical. | `{{date}}` When, `{{value}}` Number, `{{series}}` One line per (optional) | [line-over-time.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/line-over-time.json) |
| Calendar heatmap | GitHub-style grid: one square per day, darker when more notes fall on it (or a higher sum of a number). | `{{date}}` Day | [calendar-heatmap.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/calendar-heatmap.json) |
| Folder sunburst | DaisyDisk-style rings of folders and files sized by bytes. Click to zoom, click a file to open it. Point it at a base with no filters to see the whole vault. | none | [vault-sunburst.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/vault-sunburst.json) |
| Link graph | The notes of the base and the links between them, force-directed. Size is links in and out; colour is a property you pick. | `{{colour}}` Colour by (optional) | [link-graph.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/link-graph.json) |
| Arc diagram over time | Notes on a timeline, links between them as arcs. Long arcs are ideas that reach back in time. | `{{date}}` When, `{{colour}}` Colour by (optional) | [link-arcs.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/link-arcs.json) |
| Travel globe | Great-circle routes between place notes on a globe you can spin. Place notes need latitude and longitude; trip notes link a from and a to place. | `{{lat}}` Latitude (place notes), `{{lon}}` Longitude (place notes), `{{from}}` From (trip notes), `{{to}}` To (trip notes), `{{date}}` Date (trip notes) (optional), `{{group}}` Colour routes by (optional) | [travel-globe.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/travel-globe.json) |
| Sankey across three properties | Notes flowing from one property to the next to the next, e.g. genre → status → rating, or area → project → status. | `{{stage1}}` First, `{{stage2}}` Second, `{{stage3}}` Third | [sankey.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/sankey.json) |
| Beeswarm timeline | One dot per note on a time axis, in rows by a property, never overlapping; colour and size from numbers. Built for daily notes with a mood or energy score. | `{{date}}` When, `{{row}}` Rows by, `{{colour}}` Colour by (number) (optional), `{{size}}` Size by (number) (optional) | [beeswarm.json](https://raw.githubusercontent.com/Casyfill/Agate/main/src/recipes/beeswarm.json) |

A user can add their own recipes: specs with a `usermeta.agate.recipe` block in the folder set as Settings → Agate → **Recipe folder**.

## Worked examples

All are real charts in Agate's demo vault, each over notes you can read next to it (`demo-vault/notes/`, bases in `demo-vault/bases/`).

| Example | What it shows | Spec |
|---|---|---|
| Bars, coloured by a property | the recipe's output for books by genre and status | [bars-genre.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/bars-genre.vl.json) |
| Bookshelf with covers | explicit `stack`, layered marks, cover images at each block, rounded ends, a texture for abandoned books, `height` step | [bookshelf-covers.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/docs/downloads/reading-starter/charts/bookshelf-covers.vl.json) |
| Headline numbers | `output: "stats"` over a base | [reading-stats.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/reading-stats.vl.json) |
| Timeline over a basemap, instrument look | `rowData` GPS tracks, map tiles, `agateColors`, linked panels | [hike-dashboard.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/hike-dashboard.vl.json) |
| Minard's 1812 map | Vega, layered geo, a band whose width is a number, battle notes clickable | [campaign-1812.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/campaign-1812.vg.json) |
| Travel globe | orthographic projection you drag to spin, great circles between linked notes | [travel-globe.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/travel-globe.vg.json) |
| Gapminder bubbles | `rowData` (a CSV per note), a year slider param, trails | [gapminder.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/gapminder.vl.json) |
| Redlining in Brooklyn | GeoJSON from the vault, state plane projection, `textures` | [redlining-brooklyn.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/redlining-brooklyn.vl.json) |
| Du Bois, 1900 | a static chart with its data inside, no base | [dubois-furniture.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/dubois-furniture.vg.json) |
| People and projects graph | `edges`, force layout | [people-graph.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/people-graph.vg.json) |
| Vault edge bundling | `tree` plus `edges`, hierarchical edge bundling, Vega only | [vault-links.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/vault-links.vg.json) |
| Vault sunburst | `tree`, partition layout, click to zoom | [vault-sunburst.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/vault-sunburst.vg.json) |
| Horizon table | `rowData` plus `cells`: a table whose columns follow the Properties menu, with a chart column | [horizon-table.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/tests/charts/horizon-table.vg.json) |
| Habit grid | calendar-style grid from daily notes | [habit-grid.vl.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/habit-grid.vl.json) |
| Mood beeswarm | force layout along a time axis, `agateDark` | [mood-beeswarm.vg.json](https://raw.githubusercontent.com/Casyfill/Agate/main/demo-vault/charts/mood-beeswarm.vg.json) |

For anything else, the [Vega-Lite gallery](https://vega.github.io/vega-lite/examples/) and the [Vega gallery](https://vega.github.io/vega/examples/) are good starting points: replace their `data` with `{"name": "base"}` and their fields with `note.*` property ids.
