# Property scan: which Bases properties a chart gets

Notes from the "View 3 renders empty" investigation (2026-11-05). Background for ADR-0001 D4.

## How it works

Before Vega sees anything, Agate turns each Bases entry into a row (`groupsToRows`). It converts only some properties, on purpose: D4 keeps conversion cost proportional to what the chart needs, so a base with thousands of notes and dozens of properties is not converted wholesale on every `onDataUpdated`. The converted set (`propertiesToConvert` in `src/surfaces/bases-view.ts`) is the union of:

- the view's visible properties (Bases Properties menu, `config.getOrder()`);
- `file.name` and `file.path`, always;
- what the spec refers to, found by `referencedProperties` in `src/core/spec.ts`:
  - whole strings that are property ids: `"field": "note.rating"`;
  - property lookups inside expression strings: `datum.note.rating`, `datum["note"]["rating"]`, `datum['note']['rating']`, and mixes such as `datum.note["due date"]`.

Vega cannot do this for us: it only gets the finished rows, and a property that was never converted is just `undefined` to it. No error, no warning.

## The bug

"View 3" in `Interview prep.base` (spec `charts/performance-by-domain 2.vl.json`, written by an LLM from the chart prompt) used only the bracket form, `datum['note']['domain']`, and the view had no visible properties. The scan then recognised only the dot form, so `domain`, `initial` and `final` were never converted. The spec's filter dropped every row, and the chart was empty without any error. The spec itself was valid: rendered headlessly with the real notes, it draws.

The chart prompt (`src/core/prompt.ts`), the `agate-chart` skill, and recipes (`{{role.expr}}`) all write the bracket form, so this was Agate's bug, not the model's.

## Fix (done)

The expression pattern now matches dot, bracket (either quote) and mixed forms. A test in `test/unit/spec.test.ts` covers them.

## Alternatives considered

1. **Dot notation only, documented.** Change the prompt, the skill, recipes and demo specs to emit `datum.note.x`, and tell users not to use brackets. Rejected: the dot form cannot name properties with spaces or hyphens (`due date`, `read-count`), which are common in Obsidian. The failure is also silent, so a docs rule would not stop LLMs or users from writing standard Vega bracket syntax.
2. **Vega's expression parser instead of a regex.** `vega` exports `parseExpression`: try it on every spec string, ignore the ones that don't parse, and walk the syntax tree for property lookups on `datum.note`/`datum.formula`/`datum.file`. Handles every syntactic form and odd spacing. The exact-string check for field strings stays. About 20 lines. Switch to this if more regex edge cases show up.
3. **No scan: convert every property.** Removes the whole class of bug and the scan code. This reverses the D4 cost decision, and nobody has measured the cost. Before choosing this, time `groupsToRows` with all properties on a large base (thousands of notes, dozens of properties) and compare.

## Known gaps

- **Property names built at runtime** (`datum["note"][someParam]`) can't be known ahead of time. Workaround: make the property visible in the view.
- **Field strings with spaces** (`"field": "note.due date"`) are not detected: `PROP_STRING` excludes whitespace. Fix: allow spaces in the pattern. It only matches whole strings that start with `note.`/`formula.`/`file.`, so the risk is low. Not done yet.
- **Diagnostics.** A filter that drops every row still fails silently. Logging, in debug mode, the `note.*` ids a spec mentions that are missing from the dataset would make the next case quicker to find.
