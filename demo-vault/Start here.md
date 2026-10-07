---
type: index
---
# Agate demo vault

A made-up personal vault, organised like a real one (inbox, projects, areas, resources, journal), with charts on top of it. Everything is invented. The hike follows the Appalachian Trail in Georgia only roughly; its GPS tracks are generated and not for navigation.

Open [[Home]] for the dashboard, or any base in `bases/` and switch views from the toolbar.

## What is where

| Area | Notes | Base and views | What it shows |
|---|---|---|---|
| Hiking | `notes/2_areas/hiking/` (3 day notes, each linking a GPS track in `attachments/hikes/`) | `Hiking` → Dashboard | Route map, elevation profile, speed and heart rate; drag the profile to zoom |
| Travel | `notes/2_areas/travel/` (22 places with lat/lon, 32 trip legs) | `Travel` → Globe, Countries | Great-circle routes on a globe you can spin; countries with place notes |
| Board games | `notes/2_areas/boardgames/` (24 games, a year of plays) | `Board games` → Collection, Game nights | Complexity vs time sized by plays; who wins; most played; plays per day |
| Projects | `notes/1_projects/<area>/` (12 projects) | `Projects` → Timeline | Gantt from start to due, today marked |
| Work | `notes/2_areas/work/meetings/`, `notes/2_areas/people/` | `Meetings` → Who I meet, People and projects | People by week; a graph of who works on what |
| Journal | `notes/journal/` (six months of daily notes) | `Journal` → Habits, Mood | Habits per week with mood; one dot per day |
| Reading | `notes/2_areas/reading/` | `Reading` → Shelf | Pages vs rating with covers in the tooltip (needs network) |
| Everything | the whole vault | `Vault` → Sunburst | DaisyDisk-style rings by folder and size |

Charts live in `charts/`; each is a plain Vega or Vega-Lite spec you can copy into your own vault. Click a mark that stands for a note to open it.

## Setup

From the Agate repo: `npm run build`, then `AGATE_VAULT=demo-vault npm run install:local` (or `make demo`). Open this folder as a vault and trust the plugin. The Reading covers load from Open Library; everything else is local.

Regenerate the notes and data with `node scripts/demo-vault.mjs` (fixed seed: same output every time).
