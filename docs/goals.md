# Project goals

The acceptance criteria Agate was started against, moved here from the README when the README became user-facing. The architecture decision record (`adr/0001-architecture-and-roadmap.md`) maps each to a decision and a milestone.

## Acceptance criteria (0.1.0)

1. Plugin code is set up. Plugin can be installed locally for testing.
2. Plugin allows in-note or separate Vega-based visualisations, both Vega and Vega-Lite, using embedded code or separate-file spec JSON.
3. Specs can refer to data in Obsidian Bases; data is pulled before rendering.
4. There are tests and semver set up for the code.
5. There are docs, including a quickstart guide and API reference.
6. Structure and logic of the plugin are defined, including notes for future upgrades and adding extra plugins/add-ons for Vega/Vega-Lite.

## Secondary goals

1. Static (or interactive) visualisation is supported in Canvas.
2. Dataview as a dynamic input: investigated and dropped on 2026-09-26 (see `future-features.md`).
3. (Truncated in the original; never recovered.)
