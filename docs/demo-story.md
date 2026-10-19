# Demo vault: the story

> Draft, 2026-10-07. The brief for rebuilding `demo-vault/` into screenshot-ready notes. Review, then we implement and shoot.

## 1. The premise

One person's vault, a year of their life. Not twelve charts: eight notes a person would actually keep, each opening with a line of context, then the base as a dashboard, then a sentence that says what the picture shows. Every screenshot should read like a page from a well-edited magazine about someone's year, and the reader should think "my vault could do that".

The person: Sam, who lives in New York, works on product at a mid-size company, hikes, plays board games with the same five friends, reads on the subway, and keeps a journal they mostly stick to. Sam's notes are tidy but not perfect (some missing ratings, an idea project that never started).

## 2. The notes (one screenshot each)

Each area gets one note in its folder, named like a person would name it, built the same way:

1. A one-line dek in plain prose ("Twelve trips, five countries, too many red-eyes.").
2. Two or three numbers set large (a "stat row": callout blocks in the note, not chart marks).
3. The main view of the base, full width.
4. One or two secondary views side by side or below.
5. A closing line with a link or two (`[[…]]`) so it looks lived in.

| Note | Main view | Secondary | Story it tells |
|---|---|---|---|
| `notes/2_areas/hiking/AT Georgia 2025/AT Georgia 2025.md` | Hike dashboard with a **basemap** and annotations (Blood Mountain high point, camps) | Day table (Bases core table) | Three days, 31 miles, the climb up Blood Mountain on day 3 |
| `notes/2_areas/travel/Travel.md` | Globe, routes coloured by **Family / Work / Personal** | Countries map; trips timeline | Where the year went, and why |
| `notes/2_areas/reading/Reading.md` | **Reading timeline**: one bar per book from start to finish, coloured by genre | **Sankey genre → status → rating**, linked to the timeline (hover a genre, both light up) | What I read when, how long it took, what I abandoned |
| `notes/2_areas/boardgames/Board games.md` | Collection bubble chart, direct labels, no clipped legend | Who wins; game nights calendar | The group's favourites and the shelf of shame |
| `notes/1_projects/Projects.md` | Project timeline (Rust renamed "Rust 101 course") | People and projects graph | What's on, what's late, who's involved |
| `notes/2_areas/work/Work.md` | Who I meet heatmap | Meeting load by week | Where the time goes |
| `notes/journal/Journal.md` | Habit grid with mood line | Mood beeswarm | Streaks and slumps |
| `notes/Vault review.md` | Sunburst with **`notes` as the root** | Largest files table | What the vault is made of |

Each area becomes a travel/reading/etc. hub note: destinations become **travel notes** (one per trip, with the legs inside it as properties or a table) rather than a note per flight leg.

## 3. Data changes

- **Travel.** A note per trip (`notes/2_areas/travel/2025-07 Summer in Europe.md`) with `purpose: Family | Work | Personal`, `start`, `end`, `legs: [[[New York]], [[Reykjavik]], [[Berlin]], …]` (ordered list of place links) and `companions`. The globe draws consecutive legs; colour is `purpose`.
- **Reading.** Books get `started` and `finished` (or `abandoned`), so the timeline has real spans; about 25 books over two years, a few overlapping, two abandoned, one in progress.
- **Projects.** "Learn Rust" → "Rust 101 course".
- **Vault.** Sunburst root is `notes/` (the tree is built from `notes/` paths only; attachments and charts left out).
- **Hiking.** Rescale the synthetic track to the real ~31.7 miles; keep camps and peaks as named waypoints for annotation.

## 4. Visual system ("NYT-level")

What makes those graphics read well, applied to every chart:

- **Headline, dek, source line** inside the chart: bold 15–16 px headline that says the finding ("Blood Mountain was the day"), grey 12 px dek, 10 px source/notes line at the bottom.
- **Direct labels over legends.** Label lines and areas at their ends; a legend only when there is no room.
- **Annotations.** One or two callouts per chart (thin leader line + short text): the high point, the longest book, the most-played game.
- **Restraint.** Light or no gridlines, no axis domain lines, tabular numerals, sentence-case titles, one accent colour plus greys; categorical colour only when the category is the point.
- **Typography from the theme.** Charts use the note's font (Agate's `obsidian` theme already reads it), so a serif theme gives serif charts. Numbers in tabular figures.
- **Size.** Charts designed for the note's readable line width (~700 px) and for mobile width, no horizontal scrolling.

Agate work this needs (small):

- A shared "editorial" config preset (Settings → Config overrides, or a bundled theme name `agate-editorial`) for the conventions above, so specs stay short.
- Fix clipped legends and overlapping titles in concat layouts (board games).

## 5. Basemap for the hike (decided, built 2026-10-07)

A static basemap: a fixed view drawn once, no pan or zoom, from free tile sources that need no key or account.

- Drawn by Vega itself: the spec computes which XYZ tiles cover the route at a fixed zoom and places them as `image` marks under the route, using the same Web Mercator projection, so the route, camps and the brush highlight sit exactly on the terrain. One renderer, no Leaflet.
- Sources checked on 2026-10-07 (keyless, attribution required):
  - **Esri World Hillshade** (grey relief) for light themes, **Esri World Hillshade Dark** for dark themes, switched by `agateDark`. Theme-neutral, reads as "print": the route and labels carry the colour.
  - **Esri World Topo Map** (soft green topo with contours and streams) as an alternative style, a signal in the spec.
  - OpenTopoMap works too but is busy for an editorial look; CARTO basemaps now require an API key (rejected).
- Attribution line in the chart ("Basemap: Esri" plus sources), as the terms require.
- Needs network when the chart renders; Agate should treat image marks like remote data (blocked when "Load remote data" is off) so nothing loads without consent. Small Agate change.

## 6. Themes and the shot list

Three looks, decided 2026-10-08. Each area note is designed for one (its `look` property) and its charts are tailored to it: palette, fonts, glow. Charts still follow light and dark mode, so nothing breaks in another theme; it just isn't the shot.

| Look | Theme and settings | Notes | Chart design |
|---|---|---|---|
| elegant | Minimal, light; snippets `agate-demo` + `agate-elegant` (serif text) | Russian campaign 1812, Reading, Projects | Serif labels set in the spec, paper and ink tones (oxblood, navy, ochre, sage, plum), hairline grids, italic direct labels |
| dark | Minimal, dark; snippet `agate-demo` | AT Georgia 2025, Travel, Journal | Satellite basemap by default in dark mode, glowing routes (a wide translucent stroke under each line), night globe, neon habit rows, gradient mood area |
| colourful | AnuPpuccin, Mocha; snippet `agate-demo` | Board games, Work, Vault review | Catppuccin palette (Mocha in dark, Latte in light), rounded cells, direct labels with halos, pastel sunburst |

Every area note has the same shape: italic dek, a `[!stats]` callout (big numbers, styled by the snippet), an intro paragraph, the main base view, "What I noticed" bullets computed from the data with links to the notes behind them, a to-do list, then secondary views.

Shot list: 9 notes in their own look, each at a fixed window size (1440 × 900), saved as `docs/images/demo/<note>-<look>.png`, plus 3 short screen recordings (hike hover, sunburst zoom, globe spin) as GIF/MP4 for the README and the site.

How we shoot (decided): I drive Obsidian on your Mac with computer use (open the demo vault, install and switch themes, open each note, screenshot, save), with your go-ahead for each session. I then list exactly where each image goes (README, docs site, blog post).

## 7. Order of work

1. Data changes (section 3) and the hub notes (section 2).
2. Editorial preset and the per-chart redesigns, Reading first (new timeline + linked sankey), then Hiking basemap, then the rest.
3. Fix-ups from review (legends, overlaps).
4. Shoot (section 6).

## Open questions

- Persona: is "Sam in New York" fine, or should the demo be closer to you (hiking, board games, NYC are already yours)?
