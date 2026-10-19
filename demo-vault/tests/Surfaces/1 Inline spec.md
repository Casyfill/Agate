---
tags: [agate-test]
---
# Surface B: inline spec, inline data

A bare Vega-Lite spec pasted into an `agate` block. No Bases involved. JSON is valid YAML, so it can be pasted as-is.

```agate
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "data": {"values": [
    {"team": "A", "points": 28}, {"team": "B", "points": 55},
    {"team": "C", "points": 43}, {"team": "D", "points": 91},
    {"team": "E", "points": 81}, {"team": "F", "points": 53}
  ]},
  "mark": {"type": "bar", "tooltip": true},
  "encoding": {
    "x": {"field": "team", "type": "nominal", "axis": {"labelAngle": 0}},
    "y": {"field": "points", "type": "quantitative"}
  },
  "height": 180
}
```

The same chart written as YAML with the envelope form (`spec:` key), plus a per-chart theme override:

```agate
theme: quartz
spec:
  mark: {type: line, point: true, tooltip: true}
  encoding:
    x: {field: team, type: nominal}
    y: {field: points, type: quantitative}
  height: 160
data:
  - {team: A, points: 28}
  - {team: B, points: 55}
  - {team: C, points: 43}
  - {team: D, points: 91}
```

Expected: two charts, the second in the static "quartz" look regardless of light/dark mode. Switch Obsidian's theme (Settings → Appearance → Base color scheme); the first chart follows, the second does not.
