# Testing Agate

Obsidian cannot run in CI cheaply and the `obsidian` package ships type declarations only, so testing is layered (ADR-0001 D8): everything that can run in Node does, and what needs Obsidian is a short manual checklist over the committed test vault.

## Commands

```sh
npm run check        # typecheck (src and test), lint, tests: what CI runs
npm run typecheck    # tsc over src/ (real obsidian types) and test/ (obsidian -> mock)
npm run lint         # eslint with eslint-plugin-obsidianmd, the ruleset the plugin review uses
npm test             # vitest, one pass
npm run test:watch   # vitest in watch mode
npm run build        # typecheck + minified main.js, prints the size
```

CI (`.github/workflows/ci.yml`) runs `check`, builds, fails if `main.js` passes 2.5 MB, and uploads the three plugin files as an artifact. Lint warnings do not fail the build; errors do.

## Layer 1: unit tests (`test/unit/`)

Run against `test/mocks/obsidian.ts`, a small runtime stand-in aliased in `vitest.config.mts` and `test/tsconfig.json`. The mock implements what `src/core` touches: `parseYaml`/`stringifyYaml` (via `yaml`), `normalizePath`, `TFile`, a `FakeApp` with an in-memory vault and link resolution, `requestUrl` (records calls), `Component`, and the Bases `Value` classes with their public API.

Two things about the mock matter when writing tests. The `Value` mocks keep the raw value on a `value` field, which exercises Agate's "peek at the runtime object" path; `opaque()` from `test/helpers.ts` strips those fields so the same test can cover the `toString()` fallback. And `FakeApp.metadataCache.getFirstLinkpathDest` resolves like Obsidian does in the common cases: exact path, path without extension, basename.

What is covered: block parsing and the bare-spec versus envelope decision, mode detection, dataset injection helpers, the property scan, vault path resolution and spec loading (`spec.test.ts`); the full `Value` to JSON table and row assembly including `group` (`bases.test.ts`); the D11 option precedence (`options.test.ts`); the ```` ```base ```` synthesis including error cases and a YAML round trip (`synthesize.test.ts`); the loader's vault, relative, scheme, remote-blocked and remote-allowed paths (`loader.test.ts`); theme derivation from CSS variables under jsdom and config merging (`theme.test.ts`).

`src/surfaces/*`, `src/core/render.ts`, `src/main.ts` and `src/settings.ts` are not unit-tested: they are thin over Obsidian's DOM helpers and vega-embed. Logic that belongs to them but does not need Obsidian is extracted (`core/options.ts`, `core/synthesize.ts`) and tested there. When adding behaviour to a surface, put the decision in `core/` and test it.

## Layer 2: headless renders (`test/render/specs.test.ts`)

Every spec in `test-vault/charts/` is compiled (Vega-Lite → Vega where needed), given rows in the D4 shape from `test/fixtures/rows.ts` the way the plugin injects them, and rendered to SVG by real Vega with a loader that reads the vault directory. Assertions: at least one shape drawn, no "Infinite extent" warnings (rows must be present on the first run), and a snapshot of the SVG (or a hash for the world map). Snapshots live in `test/render/__snapshots__/`.

A snapshot diff means one of: the spec changed (expected, update with `npx vitest run -u`), the fixture rows changed, or Agate's spec preprocessing (`ensureNamedData`, `withInitialValues`) changed behaviour. Vega and Vega-Lite upgrades also move snapshots; review the diff, then update.

Adding a fixture spec to `test-vault/charts/` adds it to this suite automatically. Specs that need a dataset other than `base`, or a data file outside the vault directory, need a case in the test.

## Layer 3: manual, in Obsidian (`test-vault/`)

`test-vault/Start here.md` explains the setup; `test-vault/M0 Checklist.md` is the current checklist (it will be renamed to `Checklist.md` and trimmed to the release gate once M0's round-log is no longer useful). The loop:

1. `npm run dev` in one terminal (esbuild watch, writes `main.js`).
2. `npm run install:local` once (symlinks into `test-vault/.obsidian/plugins/agate/`; `AGATE_VAULT=/path npm run install:local` for another vault).
3. Open `test-vault/` as a vault, trust and enable plugins, enable Agate, turn on Debug logging.
4. Rebuilds are picked up by the community Hot Reload plugin, or by the command "Reload app without saving".
5. Developer console: `Cmd/Ctrl+Shift+I`. Agate logs under `[agate]`; the command "Agate: Debug: dump first Bases row" prints the raw `Value` shapes and the converted row of the last rendered base view, useful whenever Obsidian's Bases API drifts.

Before a tag: the full checklist on desktop, a pass on a real mobile device, and `npm run check` green.

## Layer 4: end to end (not yet)

`wdio-obsidian-service` can drive a real Obsidian against `test-vault/` in CI. Planned once the manual checklist outgrows a screen.
