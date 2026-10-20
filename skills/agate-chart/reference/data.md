# Rows, bases, and where a chart appears

## The rows

Each row is one note the base picked, nested by prefix:

```json
{
  "file": { "name": "Dune", "path": "Reading/Dune.md", "ctime": "2025-04-30T13:12:00.000Z", "size": 412, "tags": ["book"] },
  "note": { "author": "Frank Herbert", "genre": "sci-fi", "pages": 412, "rating": 5, "started": "2025-04-30" },
  "formula": { "cover": "https://covers.openlibrary.org/b/isbn/9780441172719-M.jpg" }
}
```

- `note.*`: frontmatter properties, typed by Obsidian (numbers, ISO dates, lists, `"[[link]]"` strings, booleans).
- `file.*`: file facts (`name`, `path`, `ctime`, `mtime`, `size`, `tags`, `folder`, `ext`).
- `formula.*`: the base's formulas, already computed.
- `group`: set when the view is grouped in Bases.

A row carries the view's columns (its `order`), every property the spec names (field strings and `datum` expressions are scanned), and always `file.name` and `file.path`. A `note.*` property no note in the base has is skipped, so a typo shows up as an empty field, not an error.

## A `.base` file

YAML. A filter picks the notes; formulas add computed properties; each view is one way to show them. An Agate view has `type: agate` and a `specFile` (or an inline `spec`).

```yaml
filters:
  and:
    - type == "book"            # or: file.inFolder("Reading"), file.hasTag("book")
formulas:
  cover: if(isbn, "https://covers.openlibrary.org/b/isbn/" + isbn + "-M.jpg", null)
views:
  - type: table
    name: Shelf
    order: [file.name, author, genre, pages, status, started, finished, rating]
  - type: agate
    name: Genres
    order: [file.name, genre, status]
    specFile: charts/bars-genre.vl.json
```

View options an `agate` view understands: `specFile`, `spec` (inline JSON string), `theme`, `renderer` (`svg` or `canvas`), `interactive` (false for a static picture), `actions` (export menu), `dataset` (rename `base`). The view's own filters, sort and grouping apply to the chart.

## Where a chart appears

- **In its base:** open the `.base` file and pick the view.
- **Embedded in a note:** `![[Books.base#Genres]]` shows that view, with the Bases toolbar.
- **In an `agate` code block in a note**, three forms:

  ````markdown
  ```agate
  { "$schema": "https://vega.github.io/schema/vega-lite/v6.json", "data": {"values": [{"a": "x", "b": 3}]}, "mark": "bar", "encoding": {…} }
  ```
  ````

  ````markdown
  ```agate
  spec: charts/bars-genre.vl.json
  base: Books.base
  view: Genres
  ```
  ````

  ````markdown
  ```agate
  spec: charts/ratings.vl.json
  data: [{ "note": { "genre": "sci-fi", "rating": 5 } }]
  ```
  ````

  The first is a bare spec. The second pulls rows from a base's view (it renders a hidden Bases view, so the toolbar shows). The third passes rows inline. A block may also set `theme`, `renderer`, `interactive`, `actions` and `dataset`.

## Static charts, no base

A chart that needs no notes (a historical figure, a one-off diagram) is a bare spec with its data inside, in a code block or a spec file referenced by `spec:` alone. The demo vault's Du Bois chart works this way: `demo-vault/charts/dubois-furniture.vg.json`, used from a note with

````markdown
```agate
spec: charts/dubois-furniture.vg.json
```
````

A spec may also read a vault file directly: a relative `data.url` such as `"attachments/geo/brooklyn-holc.geojson"` resolves like a link. That is how the Brooklyn HOLC map draws its GeoJSON without a base.

`"interactive": false` (view option or block key) renders once and drops tooltips and listeners: right for embeds in Canvas, where dragging the card would fight a brush.
