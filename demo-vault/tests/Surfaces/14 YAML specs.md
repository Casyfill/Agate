---
tags: [agate-test]
---
# YAML specs

Every place that takes a spec also takes YAML: `agate` blocks, spec files, inline view specs. `docs/yaml-specs.md` in the repo explains when to pick which. The three charts below should look the same as their JSON twins.

## 1. Static: data and spec in the note

No base involved. The rows sit in the spec itself.

```agate
$schema: https://vega.github.io/schema/vega-lite/v6.json
# Three weeks of runs, typed straight into the note.
data:
  values:
    - {week: W1, km: 12}
    - {week: W2, km: 18}
    - {week: W3, km: 15}
mark: {type: bar, tooltip: true}
encoding:
  x: {field: week, type: nominal, axis: {labelAngle: 0}}
  y: {field: km, type: quantitative, title: Kilometers}
height: 160
```

## 2. In the note, with rows from a base

The spec stays in the note; `base:` and `view:` bring in the rows of `Books.base`'s `Table` view, filters and all.

```agate
base: tests/Library/Books.base
view: Table
spec:
  # Average rating per genre. Edit a book's rating and this redraws.
  transform:
    - filter: "isValid(datum.note.rating) && isValid(datum.note.genre)"
  mark: {type: bar, tooltip: true}
  encoding:
    y: {field: note.genre, type: nominal, title: Genre, sort: "-x"}
    x: {aggregate: mean, field: note.rating, type: quantitative, title: Average rating}
  height: {step: 28}
```

## 3. A YAML spec file

`tests/charts/ratings-by-genre.vl.yaml` is the same chart as `ratings-by-genre.vl.json`, with comments.

```agate
spec: tests/charts/ratings-by-genre.vl.yaml
base: tests/Library/Books.base
```

Expected: three charts, no error boxes. Charts 2 and 3 follow edits to the books in `tests/Library/`. Saving the `.vl.yaml` file redraws chart 3.
