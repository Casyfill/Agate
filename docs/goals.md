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

## Release and launch goals (agreed 2026-10-12, not started)

The criteria above are about the plugin working. These are about people seeing it. They run in order; each step feeds the next. `demo-story.md` holds the detailed brief for steps 1–2 and gets updated to match this section (Projects → Interview prep, colourful → whimsical).

### R1. One vault, two jobs (done 2026-10-12, ADR-0002)

Merge `demo-vault/` and `test-vault/` into a single vault that is both the showcase and the test bed.

- Showcase part: a handful of polished "live" notes, the ones we screenshot (R2). Everything else stays as test fixtures: the `Surfaces/` cases, the gallery, the checklist, broken specs on purpose.
- The split is stated in the vault itself (`Start here.md` says which folder is which and why) and in a short ADR (`adr/0002-one-vault.md`): one vault so the screenshots are always of code that the test suite renders, and no drift between two copies of the same charts.
- Done: `test-vault/` is now `demo-vault/tests/`; fixtures, scripts, Makefile and docs point at it.
- Done when: one vault folder, `npm run check` green, render snapshots for every chart in it, ADR merged.

### R2. Eye-candy screenshots

"Live" notes with embedded base charts, NYT-level design, in three distinct aesthetics. Each showcase note is designed for one look; its charts still behave in the other modes, it just isn't the shot.

| Look | Feel | Candidate notes |
|---|---|---|
| dark | night map, glowing lines, high contrast | AT Georgia hike, Travel globe, Journal |
| elegant | paper and ink, serif, hairlines, italic direct labels | Russian campaign 1812, Reading, Interview prep |
| whimsical | playful palette, rounded shapes, hand-drawn or sticker feel, a joke in the annotation | Board games, Vault review, Work |

- **Projects → Coding interview prep.** Replace the projects area with interview preparation: one note per attempt (problem, `domain`, `date`, `initial` / `readup` / `final` grades 1–5) plus prep notes per topic. Seeded from the user's own notes, scrubbed of anything private. Headline chart: the "initial (cold) score over time" spec (dots per attempt by domain, 7-attempt rolling mean, ring for the cold re-test), restyled to the note's look; the hard-coded re-test cut-off date becomes a param.
- **Premium basemap with a token** (decided 2026-10-12). A paid tile style (e.g. MapTiler, Stadia, Mapbox) for the hike and travel maps, which doubles as the showcase for keeping a key out of the spec. Secrets are not an Agate feature: the key comes from an OS environment variable, read on desktop only. The demo note says plainly that this is a hack: it does not work on mobile, and Obsidian started from the Dock may not see variables set in the shell profile (launch it from a terminal, or `launchctl setenv`). The committed vault ships without a key and falls back to the keyless Esri / OpenTopoMap tiles, so the repo vault works for everyone. The key must never end up in the spec, logs or "Copy error".
- Shot list, window size, file names and how we shoot: `demo-story.md` section 6.
- Done when: about 9 screenshots in `docs/images/demo/` (three per look) and 2–3 short recordings (hover, zoom, spin), each from a note that renders in the test suite.

### R3. Showcase site

A minimal one- or two-page static site for the repo, built around the R2 images.

- Page 1: what Agate is in one sentence, the screenshots (grouped by look), a 30-second "how it works" (base → spec → chart), install link. Page 2 (optional): the gallery with a few charts live (the same specs with data exported to JSON), linking each to its spec in the repo.
- Plain HTML and CSS, no site generator unless one page stops being enough. Hosted on GitHub Pages from the repo.
- Done when: public URL linked from the README and the plugin's manifest.

### R4. Launch posts

Posts to draw attention once R3 is live: LinkedIn, Reddit (r/ObsidianMD, possibly r/dataisbeautiful with one standalone chart), the Obsidian forum "Share & showcase" category and Discord. Facebook only if there is a group worth it. Each post leads with one image in one look, links the site, and is written for that audience (LinkedIn: the why and the build; Reddit and the forum: what you can do with your own vault).

**Prerequisite, easy to miss:** the plugin should be installable from Community plugins (or at least through BRAT with a tagged release) before the posts go out; otherwise the call to action is "clone the repo". `releasing.md` covers the tag; the `obsidian-releases` submission and its review time need to be on the plan.

### Open questions

1. Interview prep notes: where are the existing ones, and how much can be public as is (company names, dates, grades)?
2. Basemap provider and plan: which one, and is a paid key for screenshots alone worth it, given the public vault falls back to keyless tiles anyway?
3. Whimsical: which Obsidian theme carries it (AnuPpuccin from the old "colourful" plan, or something else)?
4. Is this release 0.1.0, and does community-plugin submission belong in it?
