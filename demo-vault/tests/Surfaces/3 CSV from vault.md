---
tags: [agate-test]
---
# Surface B: `data.url` loaded from the vault

Vega's loader is replaced by one that reads vault files. Relative paths resolve like links do.

```agate
$schema: https://vega.github.io/schema/vega-lite/v6.json
data: {url: tests/data/sales.csv, format: {type: csv}}
mark: {type: line, point: true, tooltip: true}
encoding:
  x: {field: month, type: temporal, timeUnit: yearmonth, title: Month}
  y: {field: sales, type: quantitative}
  color: {field: region, type: nominal}
height: 200
```

Remote URLs are blocked unless enabled in settings. This one should show an error box naming the setting:

```agate
data: {url: "https://vega.github.io/vega-datasets/data/cars.json"}
mark: point
encoding:
  x: {field: Horsepower, type: quantitative}
  y: {field: Miles_per_Gallon, type: quantitative}
```
