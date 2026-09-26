---
tags: [agate-test]
---
# Geo without an add-on

`geoshape` mark, a projection Vega ships, TopoJSON from `geo/world-110m.json` via the vault loader. **M0 check (d).**
d
```agate
spec: charts/world-map.vl.json
```

Same thing inline with a different projection, and static (no tooltips, no listeners):

```agate
interactive: false
spec:
  width: container
  height: 260
  data: {url: geo/world-110m.json, format: {type: topojson, feature: countries}}
  projection: {type: equalEarth}
  mark: {type: geoshape, fill: "#4c8f5e", stroke: white, strokeWidth: 0.3}
```

Expected: two world maps. Hover the first for country names; the second shows nothing on hover.
