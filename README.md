This is a git repository for Agate project: Obsidian App plugin, that renders Vega/Vega-lite visualisations using data from Obsidian Bases. Project is under development

## Acceptance criteria
1. plugin code is set up. Plugin can be installed locally for testing
2. plugin allows in-note or separate vega-based visualisations, both Vega and Vega-lite, using embedded code or separate-file spec json
3. Specs can refer  (somehow)  to data in Obsidian bases, data is pulled before rendering.
4. there are tests and semver set up for the code
5. there are docs, including quickstart guide and API reference
6. structure and logic of plugin is defined, including notes for future upgrades and adding extra plugins/addons for Vega/Vega-lite

### Secondary goals
1. static (or interactive) visualisation is supported in canvas mode
2. possibility of accepting dataview plugin data as dynamic imput is investigated as followup feature
3. need to understand 

## Status

M0 spike (see `docs/adr/0001-architecture-and-roadmap.md`). The code under `src/` follows the layout decided there; `test-vault/` holds the fixtures and `test-vault/M0 Checklist.md` the questions the spike has to answer.

## Development

Prerequisites: Node 22 or newer (`.nvmrc` is set; ESLint 10 needs `util.styleText`), Obsidian 1.10.2 or newer.

```sh
npm install                 # dependencies (esbuild ships a platform binary; reinstall if node_modules came from another OS)
npm run dev                 # esbuild in watch mode -> main.js
npm run install:local       # symlink main.js, manifest.json, styles.css into test-vault/.obsidian/plugins/agate/
```

Then open `test-vault/` as a vault in Obsidian and start with `Start here.md`. For a different vault: `AGATE_VAULT=/path/to/vault npm run install:local`.

Other scripts: `npm run build` (typecheck + minified build, prints the bundle size), `npm run typecheck`, `npm run test` (vitest: unit tests plus a headless Vega render of every spec in `test-vault/charts`, no Obsidian needed), `npm run lint`.

How things fit together, and why, is in `docs/adr/`.