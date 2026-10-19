---
tags: [agate-test]
---
# Gallery: charts other plugins can't draw

One embed per example. Each says what to try. Data: `tests/Ideas/` (19 linked notes), `tests/Places/` + `tests/Trips/` (12 cities, 18 legs), `tests/Journal/` (122 daily notes), `tests/Library/` (books), and the whole vault.

## Vault sunburst (DaisyDisk-style)

Rings are folder levels, arc length is bytes, hue follows the angle. Click a folder to zoom in, the centre or the breadcrumb to go up, a file to open it. The list on the right shows the biggest items at the current level. Slider: number of rings.

![[tests/Vault.base#Sunburst]]

## Link graph

Notes in `tests/Ideas/` and the links between them. Hover a note to light up its neighbours, click to open. Sliders: link distance, repulsion. Compare with the core graph view: only the base's notes, coloured by `topic`.

![[tests/Ideas/Ideas.base#Graph]]

## Arc diagram over time

Same links, notes on a timeline by `created`. Long arcs are ideas that reach back.

![[tests/Ideas/Ideas.base#Arc diagram]]

## Travel globe

Great-circle routes between place notes (lat/lon). Drag to spin; switch projection below. Hover a route for date and trip, click to open the leg.

![[tests/Trips/Travel.base#Globe]]

## Reading flow (sankey)

Books flowing genre → status → rating band. Toolbar filters change the flows.

![[Books.base#Reading flow]]

## Linked dashboard

Drag across the publication timeline; the genre bars and the scatter follow. Click a point to open the book.

![[Books.base#Dashboard]]

## Mood beeswarm

One dot per day, rows by mood, colour by energy, size by sleep. Click a dot to open that day.

![[tests/Journal/Journal.base#Mood swarm]]
