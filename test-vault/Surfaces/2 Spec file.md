---
tags: [agate-test]
---
# Surface B: spec from a file, data inline

The spec lives in `charts/pages-vs-rating.vl.json` and expects a `base` dataset. Here we feed it rows by hand instead of from a base.

```agate
spec: charts/pages-vs-rating.vl.json
data:
  - {file: {name: "Book A"}, note: {author: "X", pages: 200, rating: 4, genre: "sci-fi"}}
  - {file: {name: "Book B"}, note: {author: "Y", pages: 420, rating: 5, genre: "fantasy"}}
  - {file: {name: "Book C"}, note: {author: "Z", pages: 310, rating: 3, genre: "thriller"}}
```

Expected: a scatter with three points. Hovering a point enlarges it and shows a tooltip. Edit the spec file in another pane (for example change `"size": 110`) and the chart re-renders on save.
