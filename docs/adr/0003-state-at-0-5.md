# ADR-0003: Amendments to ADR-0001 at 0.5

| | |
|---|---|
| Status | Accepted (2026-11-08) |
| Date | 2026-11-08 |
| Deciders | Philipp (maintainer) |
| Amends | ADR-0001 D2, D5, D7, D11, D13. The rest of ADR-0001 stands |
| Source | [Architecture review](../architecture.md), section 15 |

## Context

The architecture review of 0.5.0 found six places where the code had moved past ADR-0001, and suggested three structural changes. ADR-0001 is accepted and isn't edited for substance, so this ADR records what is now true, and the three changes made with it.

## Decision

D1. **`core/` may use at runtime what `test/mocks/obsidian.ts` implements** (amends ADR-0001 D2). The original rule allowed only types and pure helpers from `obsidian`. In practice `core/loader.ts` uses `App` and `requestUrl`, `core/data/bases.ts` needs the Bases `Value` classes for `instanceof`, and `core/render.ts` uses `setIcon` and Obsidian's DOM helpers. The rule that keeps `core/` testable is this one: if `core/` needs something new from `obsidian` at runtime, add it to the mock in the same change. `render.ts` stays outside unit tests (layer 3), as `testing.md` says. Shared types live in `core/types.ts`, not `core/data/types.ts`.

D2. **Container sizing for single-view Vega-Lite only** (amends ADR-0001 D5). Single-view Vega-Lite specs without a `width` get `width: "container"`. Vega specs are left as written, with no `autosize: fit` added: a Vega author sets their own sizing, and container-sized signals are kept in step by the renderer's ResizeObserver.

D3. **One `usermeta.agate` contract** (new). Every key a spec may set under `usermeta.agate` is listed in `AGATE_KEYS` in `src/core/usermeta.ts`, read through one accessor (`agateMeta`), and documented in one table in the guide (section 10, Reference). Unknown keys are reported, not rejected: **Paste spec** lists them as a warning, and the renderer logs them. `test/unit/usermeta.test.ts` fails if the source reads a key the table doesn't list.

D4. **Extension API: the smaller set plus `api.vega`** (amends ADR-0001 D7, closes its open question 5). Shipped: `registerDataScheme`, `registerExpressionFunction`, `registerTheme`, `registerSpecPreprocessor`, `render`, and the raw `vega` / `vegaLite` handles. `registerProjection`, `registerScheme`, `registerTransform` and `registerFormat` are not implemented. An add-on reaches the same registries through `api.vega` (`vega.projection(…)`, `vega.scheme(…)`, `vega.transforms[…]`, `vega.formats(…)`), which still satisfies D7's one rule (register into Agate's instance). What the wrappers would add is unregistering on unload. They are added when a first add-on asks for one.

D5. **Default theme `auto`** (amends ADR-0001 D11). Since 0.5.0 the vault default is `auto`: the `obsidian` theme plus a palette for the active community theme. Settings from older versions migrate once (`settingsVersion` 2).

D6. **Thirteen built-in recipes** (amends ADR-0001 D13): the twelve planned plus `stats` (big numbers).

D7. **Surfaces stay thin** (structural, follows `testing.md`). Decisions that were made inside `AgateBasesView` now live in `core/spec.ts` and have unit tests: `propertiesToConvert` (which properties a view converts) and `resolveViewSpec` (spec file, then inline text, then an inline mapping). `AgateRenderer` keeps the vega-embed lifecycle. The stats HTML output is `renderStats` in `core/stats.ts`, beside `computeStats`, written with plain DOM calls so it runs under jsdom.

## Consequences

- A typo under `usermeta.agate` (`rowdata`, `texture`) shows up in the paste check and the console instead of failing silently. A new key means one line in `AGATE_KEYS` and one row in the guide's table.
- `render.ts` no longer knows how big numbers are drawn, so moving big numbers into a separate plugin later only touches `stats.ts` and one branch in the renderer.
- `stats.ts` uses `createElement` instead of Obsidian's `createEl`, so the `obsidianmd/prefer-create-el` lint rule gives one warning there.
- Add-ons that register projections, schemes, transforms or formats through `api.vega` can't unregister them. That's acceptable until one exists.

## References

- [ADR-0001](0001-architecture-and-roadmap.md), decisions D2, D5, D7, D11, D13 and open question 5
- [Architecture review](../architecture.md), section 15
- [User guide](../guide.md), section 10, Reference: every `usermeta.agate` key
