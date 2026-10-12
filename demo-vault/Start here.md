---
type: index
---
# Agate demo vault

A made-up personal vault, organised like a real one (inbox, projects, areas, resources, journal), with charts on top of it. Everything is invented. The hike follows the Appalachian Trail in Georgia only roughly; its GPS tracks are generated and not for navigation.

Open [[Home]] for the list of area notes (each one a small dashboard), or any base in `bases/` and switch views from the toolbar.

## What is where

| Area note | Notes | Base and views | What it shows |
|---|---|---|---|
| [[AT Georgia 2025]] | `notes/2_areas/hiking/` (3 day notes, each linking a GPS track in `attachments/hikes/`) | `Hiking` → Dashboard, Days | Route on a topo basemap, hover for elevation, speed and heart rate; drag the profile to zoom |
| [[Travel]] | `notes/2_areas/travel/` (13 trip notes with ordered stops and a purpose, 22 places with lat/lon) | `Travel` → Globe, Countries, Trips | Great-circle routes by family, work and personal on a globe you can spin |
| [[Reading]] | `notes/2_areas/reading/` (26 books with start and finish dates) | `Reading` → Reading year, Shelf | One bar per book, or a flow from genre to outcome to time taken |
| [[Board games]] | `notes/2_areas/boardgames/` (24 games, a year of plays) | `Board games` → Collection, Game nights, Games | Complexity vs time sized by plays; who wins; plays per day |
| [[Projects]] | `notes/1_projects/<area>/` (12 projects) | `Projects` → Timeline | Gantt from start to due, today marked |
| [[Work]] | `notes/2_areas/work/meetings/`, `notes/2_areas/people/` | `Meetings` → Who I meet, People and projects | People by week; a graph of who works on what |
| [[Journal]] | `notes/journal/` (six months of daily notes) | `Journal` → Habits, Mood | Habits per week with mood; one dot per day |
| [[Russian campaign 1812]] | `notes/3_resources/history/` (10 battle notes; army and temperatures in `attachments/history/`) | `Campaign 1812` → Minard map, Battles | Minard's band of the army on a map, the temperature on the retreat, battles you can click |
| [[Vault review]] | everything under `notes/` | `Vault` → Sunburst, Largest files | DaisyDisk-style rings by folder and size |

Area notes are written by the generator, so their numbers match the data.

Charts live in `charts/`; each is a plain Vega or Vega-Lite spec you can copy into your own vault. Click a mark that stands for a note to open it.

## Setup

From the Agate repo: `npm run build`, then `AGATE_VAULT=demo-vault npm run install:local` (or `make demo`). Open this folder as a vault and trust the plugin. The hike basemap loads map tiles (turn on **Load remote data** in Agate settings); everything else is local.

Regenerate the notes and data with `node scripts/demo-vault.mjs` (fixed seed: same output every time).

## Looks

Each area note is designed for one of three looks (its `look` property):

| Look | Theme | Settings | Notes |
|---|---|---|---|
| elegant | Minimal, light | snippets `agate-demo` + `agate-elegant` | [[Russian campaign 1812]], [[Reading]], [[Projects]] |
| dark | Minimal, dark | snippet `agate-demo` | [[AT Georgia 2025]], [[Travel]], [[Journal]] |
| colourful | AnuPpuccin (Mocha) | snippet `agate-demo` | [[Board games]], [[Work]], [[Vault review]] |

Install Minimal and AnuPpuccin from Settings → Appearance → Themes. The snippets are in `.obsidian/snippets/`: `agate-demo` turns the `[!stats]` callout into a row of big numbers, `agate-elegant` sets a serif text font in light mode. Charts follow light and dark mode on their own.
