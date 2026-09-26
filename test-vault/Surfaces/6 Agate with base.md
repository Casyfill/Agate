---
tags: [agate-test]
---
# Surface B → A: an `agate` block pulling rows from a base

This is the synthesis path from ADR-0001 D3: the block reads `Library/Books.base`, keeps its filters and formulas, adds an `agate` view carrying this spec, and renders that as a ```base block. **This is the M0 check (b).**

Using the base's global filters only:

```agate
spec: charts/ratings-by-genre.vl.json
base: Library/Books.base
```

Inheriting the `Table` view's filters and property order:

```agate
spec: charts/published-by-decade.vl.json
base: Library/Books.base
view: Table
```

Inline spec over the same base:

```agate
base: Library/Books.base
view: Table
spec:
  mark: {type: circle, tooltip: true}
  encoding:
    x: {field: formula.age, type: quantitative, title: "Age (years, from a Bases formula)"}
    y: {field: note.rating, type: quantitative, scale: {domain: [0, 5.5]}}
    size: {field: note.pages, type: quantitative}
    color: {field: note.genre, type: nominal}
  height: 220
```

Expected: three charts over the real notes in `Library/`. Edit a book's `rating` property and all three update. If instead you see an error box, or an empty area, that is the M0 finding: note what the console (`Cmd/Ctrl+Shift+I`) says with Debug logging on.
