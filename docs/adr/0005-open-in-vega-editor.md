# ADR-0005: Open a chart in the Vega editor

| | |
|---|---|
| Status | Proposed (2026-11-09). Not implemented |
| Date | 2026-11-09 |
| Deciders | Philipp (maintainer) |
| Relates to | ADR-0001 D5 (network posture), D13 (LLM round trip); ADR-0004 (YAML specs, editor plugins) |

## Context

The [Vega editor](https://vega.github.io/editor/) is the best place to build a spec. It checks the spec against the Vega or Vega-Lite schema as you type, completes properties, previews live, and has a data viewer that shows every dataset at every step. No Obsidian plugin offers schema validation (ADR-0004 and [yaml-specs.md](../yaml-specs.md#editor-plugins)), so the editor is also how JSON and YAML users get it.

The editor can't see a vault, though. Today the path is manual: run **Debug: dump first Bases row**, copy a row from the console, paste it into the editor as inline `values`, build the chart, then replace the values with `{"name": "base"}` again (guide section 4, step 5). Most people won't get that far.

Two facts make a shortcut cheap:

- When Agate embeds a chart, the spec it hands vega-embed already holds the base's rows (`withInitialValues` in `render.ts`). That copy of the spec is a complete, self-contained chart.
- vega-embed ships an **Open in Vega Editor** action, which Agate turns off (`actions.editor: false`). The editor also opens specs from its URL: `https://vega.github.io/editor/#/url/<mode>/<spec>`, where `<spec>` is compressed with `lz-string`. That is what its own Share links use.

## Decision (proposed)

D1. **An Open in Vega editor button on every chart**, next to **Edit spec**, and a command for the current chart (ADR-0003's `targetBasesView`). It opens the editor with the spec as rendered: the rows of every dataset Agate injected (`base`, `rowData`, `edges`, `tree`, `cells`) inlined as `values`, the theme's config merged in, and environment signals (`agateDark`, `agateColors`) set to their current values. What you see in the editor is the chart you were looking at.

D2. **Pass the spec in the URL fragment, not through vega-embed's action.** vega-embed's action opens a window and sends it the spec with `postMessage`. In Obsidian, an external URL is expected to open in the system browser, where that message can't arrive. To check first: whether it does. The URL form works in any browser, and the part after `#` is never sent to a server. It needs `lz-string` (a few KB). Above a size limit (to be measured; URLs of a few MB work in current browsers), Agate says the chart's data is too large and offers to open the editor with the spec and only the first N rows.

D3. **Mark the snapshot, so it comes back clean.** The exported spec gets `usermeta.agate.snapshot: {datasets: [...], from: <spec path>}`, a new key in `AGATE_KEYS` (ADR-0003 D3). On **Paste spec**, a spec carrying it has those datasets' `values` replaced by `{"name": …}` again, and the config Agate merged in removed, before the usual checks. The "inlines its own values" warning doesn't fire for it. Paste spec's existing choices still apply: save as a new file, or (new) overwrite the spec named in `from`.

D4. **Explicit, and said so.** Opening the editor puts note data into a browser tab and its history, and loads a page from the internet. It never happens without a click. The first use shows a notice: "Your chart's data goes into the editor's address. It isn't sent to a server, but it leaves Obsidian and stays in your browser history." The feature doesn't depend on **Load remote data**, which governs what Agate itself fetches. A setting hides the button for vaults that never want it.

D5. **YAML specs export as JSON.** The editor takes JSON only. Paste spec saves the reply in the format the original spec file used, once ADR-0004 D4 (a format setting for new specs) exists. Until then, it saves JSON.

## Not decided

- Whether the button lives in the chart's hover corner (like **Edit spec**), in vega-embed's `…` menu, or both.
- Whether to strip unused properties from the exported rows (only fields the spec refers to) to keep URLs short. This is likely, and `referencedProperties` already exists for it.
- Whether code blocks with a static spec get the button too. They have no spec file to overwrite, so the return trip would be paste-into-the-block by hand.

## Consequences

- People can build and validate a chart against their own notes without learning the debug-dump workflow. The guide's section 4 shrinks to "Open in Vega editor, edit, copy, Paste spec".
- It's the first feature that hands vault content to a web page. D4 keeps it explicit, but the README's network section needs a line for it.
- One more `usermeta.agate` key, and Paste spec gains a branch for snapshots.

## References

- [Vega editor](https://vega.github.io/editor/)
- `src/core/render.ts` (`withInitialValues`, `actions.editor`), `src/core/paste.ts`, `src/core/usermeta.ts`
- [ADR-0003](0003-state-at-0-5.md) D3, [ADR-0004](0004-yaml-specs.md)
- [User guide](../guide.md), section 4, step 5
