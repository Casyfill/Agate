---
tags: [agate-test]
---
# Error handling

Every block below must show an Agate error box, not a blank space and not an uncaught exception in the console.

Not valid JSON or YAML:

```agate
{ "mark": "bar", "encoding": { 
```

Spec file that does not exist:

```agate
spec: charts/nope.vl.json
```

Base file that does not exist:

```agate
spec: charts/ratings-by-genre.vl.json
base: Library/Nope.base
```

View name that does not exist in the base:

```agate
spec: charts/ratings-by-genre.vl.json
base: Library/Books.base
view: Does not exist
```

Vega-Lite compile error (unknown mark type):

```agate
mark: hexagon
encoding:
  x: {field: a, type: quantitative}
data: {values: [{a: 1}]}
```

Empty block:

```agate
```
