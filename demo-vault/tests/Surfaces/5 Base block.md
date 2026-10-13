---
tags: [agate-test]
---
# Surface A: a ```base block inside a note

The Bases query and the Agate view live entirely in this note. The spec is given as a nested YAML mapping under `spec`.

```base
filters:
  and:
    - file.hasTag("book")
    - note.rating >= 4
views:
  - type: agate
    name: Top rated by author
    filters:
      and:
        - published < "2020-01-01"
    order:
      - file.name
      - author
      - rating
    spec:
      mark:
        type: bar
        tooltip: true
      encoding:
        y:
          field: note.author
          type: nominal
          title: Author
          sort: -x
        x:
          aggregate: count
          title: Books rated 4+
      height:
        step: 22

```

Expected: one bar per author, only books rated 4 or better. Change `>= 4` to `>= 5` and the chart updates.
