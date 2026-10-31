# Contributing to Agate

Bug reports, chart recipes and fixes are welcome.

- **Bugs:** open an [issue](https://github.com/Casyfill/Agate/issues) with your Obsidian and Agate versions, the spec (or a cut-down one) and what you expected. Turn on Settings → Agate → Advanced → Debug logging and include the console's `[agate]` lines (DevTools, Verbose level).
- **Ideas:** check [docs/future-features.md](docs/future-features.md) first; then an issue is the place to discuss.
- **Pull requests:** Node 22.12+ (`.nvmrc`). Run `make check` (typecheck, lint with zero warnings, tests) before opening one. Test notes for manual checks are in `demo-vault/tests/`; see [docs/testing.md](docs/testing.md). Add a line under `## [Unreleased]` in `CHANGELOG.md`.
- **Style:** the code follows Obsidian's [plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines), which `eslint-plugin-obsidianmd` checks.

By contributing you agree that your contribution is licensed under the project's MIT license.
