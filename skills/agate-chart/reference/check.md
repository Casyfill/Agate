# Checking a spec renders

You can't open Obsidian, but you can render the spec with Vega's own command-line tools. Do it before handing a chart over.

1. **Make a check copy** (in a temp folder, not the vault). Replace every named dataset with a few real rows inlined as `values`:
   - `{"data": {"name": "base"}}` becomes `{"data": {"values": [ …3 to 10 rows… ]}}`, with rows shaped as in `data.md` (`{"file": {…}, "note": {…}, "formula": {…}}`), built from the notes' actual frontmatter.
   - Datasets from `rowData`, `cells`, `edges` or `tree`: inline a few records of the shape `extras.md` describes. In Vega specs, set `"values"` on the data entry with that name.
   - Remove `usermeta.agate.output` so a stats spec draws its fallback marks.
   - Leave `{env:NAME}` URLs and remote tiles alone; image marks may fail to load offline, which is fine.
2. **Render it:**
   - Vega-Lite: `npx -y -p vega -p vega-lite vl2svg check.vl.json check.svg`
   - Vega: `npx -y -p vega -p vega-cli vg2svg check.vg.json check.svg`
3. **Read the output.** Any error, and any `WARN` line from Vega, is a failure (`npm warn` lines from installing the tools are not):
   - `SyntaxError … in JSON at position` → broken JSON; fix the file itself.
   - `WARN Infinite extent for field "note.x"` → that field is missing or not numeric in the rows; check the property name, its type, and that the notes really have it.
   - `Unrecognized signal name` / `Undefined data set name` → a typo in a signal or dataset name.
4. **Look at the SVG** if you can: marks should exist (`<path`, `<rect`, `<text` elements), and text should not read `undefined` or `NaN`.

What this can't check: the Obsidian theme, textures (they need Agate's patterns), per-note loading, remote data, `{env:…}` keys, clicks. Say so when you hand over a chart that relies on them.
