# Writing specs in YAML

Every place Agate takes a spec also takes YAML: an `agate` block in a note, a spec file, a view's inline spec. JSON is valid YAML, so nothing changes for specs you already have. This page shows the same chart both ways and says when each one fits.

The examples are live in the repo vault: `demo-vault/tests/Surfaces/14 YAML specs.md`.

## Why YAML

- **Less punctuation.** No braces, quotes or commas to balance. Indentation carries the structure.
- **Comments.** `# why this scale stops at 5` sits next to the line it explains. JSON has no place for that.
- **Notes already speak it.** Frontmatter and `.base` files are YAML.

JSON is still the better fit when you **copy**: from the [Vega-Lite gallery](https://vega.github.io/vega-lite/examples/), from an assistant's reply, or into the [Vega editor](https://vega.github.io/editor/), which takes JSON only. Agate's recipes, **Paste spec** and the LLM prompt all write JSON.

## The same chart, both ways

```json
{
  "data": { "name": "base" },
  "mark": { "type": "bar", "tooltip": true },
  "encoding": {
    "y": { "field": "note.genre", "type": "nominal", "sort": null },
    "x": { "aggregate": "mean", "field": "note.rating", "type": "quantitative" }
  }
}
```

```yaml
data: {name: base}
mark: {type: bar, tooltip: true}
encoding:
  y: {field: note.genre, type: nominal, sort: null} # keep the Bases sort order
  x: {aggregate: mean, field: note.rating, type: quantitative}
```

Short objects can stay on one line in braces (`{type: bar, tooltip: true}`), which keeps YAML specs compact.

## Where YAML works best: in the note

A spec in an `agate` block is written and edited in the note itself, with Obsidian's own editor, on desktop and mobile, with no plugin. This is already the smoothest way to keep a chart next to the text about it.

**Static chart, data in the spec:**

````markdown
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
```
````

**Spec in the note, rows from a base.** Put the spec under `spec:`, and name the base with `base:`. Add `view:` to reuse one of its views' filters and sort. The chart follows the base's notes like any Agate view:

````markdown
```agate
base: Library/Books.base
view: Table
spec:
  # Average rating per genre. Edit a book's rating and this redraws.
  mark: {type: bar, tooltip: true}
  encoding:
    y: {field: note.genre, type: nominal, sort: "-x"}
    x: {aggregate: mean, field: note.rating, type: quantitative}
```
````

One thing to know: such a block reads the `.base` file when the note renders. If you edit the base's filters or formulas and the chart doesn't pick them up, reopen the note.

## YAML spec files

Save a spec as `charts/ratings.vl.yaml` (or `.yml`) and point a view or a block at it, exactly as with a `.json` file. Agate watches it the same way: every save redraws.

Obsidian has no editor of its own for `.yaml` files, as for `.json` ones. To edit them inside Obsidian you need a community plugin. A spec in a note (above) needs none.

### Editor plugins

Agate doesn't depend on any of these. They are listed as their directory pages describe them (checked November 2026), not reviewed by Agate.

| Plugin | JSON | YAML | Desktop / mobile | Notes |
|---|---|---|---|---|
| [Code Editor](https://community.obsidian.md/plugins/code-editor) | yes | yes | both | **The pick for both formats.** About 7k downloads. Highlighting, line numbers, word wrap, 50+ file types; more extensions in its settings |
| [JSON Editor](https://community.obsidian.md/plugins/json-editor) | yes | no | both | Agate's recommendation for JSON: source and tree views. JSON and JSONC only |
| [YAML Editor](https://community.obsidian.md/plugins/yaml-editor) | no | yes | both | YAML only, with completions and optional JSON Schema checks. Also works on YAML code blocks in notes |
| [Materin Ctx](https://community.obsidian.md/plugins/materin-ctx) | yes | yes | both | Obsidian's own CodeMirror 6 editor, with folding, search and formatting that keeps comments. New (v0.1, about 100 downloads) |
| [Code Workbench](https://community.obsidian.md/plugins/code-workbench) | yes | yes | desktop only | A full IDE inside Obsidian: language servers, formatters, AI agents. Downloads tools from GitHub on first use. More than spec editing needs |

None of these checks a spec against the Vega or Vega-Lite schema. You don't strictly need that: a broken spec fails right away with an error box in the chart, and the [Vega editor](https://vega.github.io/editor/) online validates and previews a spec as you type.

Obsidian lets only one plugin open a given file extension. So pick **one** plugin for `.json` (Code Editor or JSON Editor, not both), and one for `.yaml`. Code Editor alone covers both formats. JSON Editor plus YAML Editor gives you a tree view for JSON and schema completions for YAML.

## Gotchas

- **Quote expressions.** Vega expressions often contain characters YAML reads specially (`:`, `#`, brackets). Wrap them in double quotes, and use single quotes inside: `filter: "datum['note']['rating'] > 3"`.
- **Quote colors.** `#` starts a comment, so write `color: "#e93147"`, not `color: #e93147`.
- **Indent with spaces.** YAML rejects tabs. Agate tries JSON first, so tab-indented JSON is fine.
- **To use a YAML spec outside Agate**, in the Vega editor or Altair, convert it to JSON first. Any YAML-to-JSON converter works, or ask an assistant.
