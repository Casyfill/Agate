# ADR-0004: YAML specs

| | |
|---|---|
| Status | Accepted (2026-11-09): D1 to D3. D4 and D5 are proposed, not scheduled |
| Date | 2026-11-09 |
| Deciders | Philipp (maintainer) |
| Relates to | ADR-0001 D3 (surfaces), D6 (spec handling), D13 (recipes and the LLM prompt) |

## Context

Agate has read YAML specs since 0.1: `parseJsonOrYaml` handles `agate` blocks, spec files (`.yaml`, `.yml`, and anything else the pickers allow) and a view's inline spec. JSON is tried first, so JSON specs, including tab-indented ones, behave as before. Nothing in the docs said so, and everything Agate writes (recipes, **Paste spec**) is JSON.

YAML is easier to write and read by hand (no braces, quotes or commas) and allows comments. Where a spec lives decides how easy it is to edit:

- **In a note**, as an `agate` block, Obsidian's own editor handles it on desktop and mobile, with code-block highlighting and no plugin. This already works for static charts (data in the spec) and for charts over a base (`base:` and `view:` next to an inline `spec:` mapping, through the synthesized Bases view of ADR-0001 D3).
- **As a `.yaml` file**, Obsidian has no editor, exactly as for `.json`. A community plugin is needed either way. JSON Editor, which Agate recommends, opens JSON only. Code Editor opens both formats on desktop and mobile. [yaml-specs.md](../yaml-specs.md#editor-plugins) compares the options. The settings tab still names JSON Editor only; changing that belongs with D4.

So the format alone doesn't make editing easier. A spec in a note does, and YAML makes such a spec pleasant to write.

## Decision

D1. **YAML is a documented, first-class spec format for reading.** Every surface that takes a spec takes YAML. The guide introduces it in section 3 and links to [yaml-specs.md](../yaml-specs.md), which shows the same chart in both formats, the in-note forms, and the quoting rules (expressions, `#` colors, no tabs).

D2. **JSON stays the format Agate writes and asks for.** Recipes and **Paste spec** save `.vl.json` / `.vg.json`, and the LLM prompt asks for one JSON code block. JSON is what galleries, assistants and the Vega editor use, and models are more reliable producing it. The docs present YAML as the hand-writing option, not a replacement.

D3. **The repo vault and the render tests cover YAML.** `tests/Surfaces/14 YAML specs.md` has a static YAML block, a YAML block over `Books.base`, and a block using `tests/charts/ratings-by-genre.vl.yaml`, the YAML twin of `ratings-by-genre.vl.json`. `test/render/specs.test.ts` renders `.yaml` and `.yml` fixtures as well as `.json`, so ADR-0002 D3 (every chart in the vault is rendered by the suite) still holds. The twins render the same SVG apart from their description text.

D4. **Proposed: a setting for the format of new specs.** "New spec format: JSON | YAML" would make recipes and Paste spec write `.vl.yaml` with `stringifyYaml`, converting an assistant's JSON reply on save. Needs a **Copy spec as JSON** action alongside, because the Vega editor takes JSON only. Worth doing if YAML spec files catch on. On its own it doesn't remove the need for an editor plugin.

D5. **Proposed: specs in notes.** Let a Bases view's **Spec file** be a `.md` note, and read the spec from a fenced `yaml` or `json` block in it. This is the change that would make editing plugin-free for Bases views, with prose and links around the spec. Open questions before building: which block counts (the first, or a marked one); whether an `agate` block in the spec note should also draw a preview; how **Edit spec** and the editor-plugin recommendation change; whether spec notes cluttering search and the graph view is acceptable.

## Consequences

- Users learn that YAML works, and where it works best, without any code change.
- Two formats in the docs means two ways to show each example. The guide and gallery stay JSON-first, and YAML appears in its own page and in the in-note examples.
- The **Edit a spec file** picker lists `json`, `yaml` and `yml`, while the view's file picker also accepts `vl` and `vg`. The mismatch is minor and left for whichever of D4 or D5 lands first.

## References

- [Writing specs in YAML](../yaml-specs.md)
- [User guide](../guide.md), section 3
- `src/core/spec.ts` `parseJsonOrYaml`, `src/core/synthesize.ts`
- [ADR-0001](0001-architecture-and-roadmap.md) D3, D6, D13; [ADR-0002](0002-one-vault.md) D3
