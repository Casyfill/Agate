---
tags: [agate-test]
---
# Stats: two ways to get live big numbers

Four numbers over `tests/Library/Books.base`, computed by Vega from the base's rows, so editing a book's `rating` or `pages` updates them. The two specs share every transform; the second adds one line, `usermeta.agate.output: "stats"`.

## 1. Drawn by Vega (SVG text)

```agate
spec: tests/charts/stats-row-vega.vl.json
base: tests/Library/Books.base
```

Expected: four big numbers with labels under them, in the chart font. Narrow the pane: the row squeezes but does not wrap. Text cannot be selected.

## 2. Computed by Vega, shown as HTML (experimental)

```agate
spec: tests/charts/stats-row-html.vl.json
base: tests/Library/Books.base
```

Expected: the same four numbers as note text, in the note's fonts, styled like the static row below. Narrow the pane: the row wraps. Text can be selected and copied. Open the spec in the Vega editor: it draws itself like approach 1.

## 3. With a change (experimental)

Each row may carry a `change`: here, how books published since 2000 differ from the whole library. An arrow shows the direction, green when it is good news and red when not; on the length row `better: "down"` makes a rise bad news.

```agate
spec: tests/charts/stats-change.vl.json
base: tests/Library/Books.base
```

Expected: 15 ▲7 (green, "published since 2000"), 4.0 ±0, 351 ▲86 (red).

## For comparison: static `[!stats]` callout

> [!stats]
> - **15** books
> - **4.0** mean rating
> - **4,918** pages
> - **2020** newest

Written by hand (the `agate-demo` snippet styles it), so it does not follow the notes. Today the three should agree: 15 books, 4.0, 4,918 pages, 2020.
