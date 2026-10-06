---
tags: [agate-test]
---
# Tooltip images

Book notes in `Library/` have an `isbn` property. `Books.base` turns it into a cover URL with a formula (`formula.cover`, Open Library's covers service), and the spec puts that URL into the tooltip under the title `image`, which vega-tooltip draws as a picture.

![[Books.base#Covers]]

What to check:

- Hover a point: the tooltip shows the book title as a heading, the cover, then author, rating and pages.
- Covers load from covers.openlibrary.org. Images are fetched by Obsidian like any remote image in a note; **Load remote data** does not gate them (it only covers chart data).
- The two notes without an ISBN show no picture, no broken-image icon.
- The ISBNs were filled in from memory; if a cover is wrong or blank, fix the `isbn` in that note.
