# Releasing and publishing Agate

Two different things: a **release** (a GitHub release with `main.js`, `manifest.json`, `styles.css` attached, tag equal to the manifest version) is what every install path downloads; **publishing** is the one-time submission of the plugin to the Obsidian community directory so it shows up in Settings → Community plugins. After publishing, new releases reach users with no further submission.

Sources: [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin), [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines), [Developer policies](https://docs.obsidian.md/Developer+policies), checked 2026-09-27. Re-read them before submitting; the process moved from a pull request against `obsidianmd/obsidian-releases` to the directory site, and may move again.

## A. Repository state (once)

1. `LICENSE` at the repo root. `package.json` says MIT; add the MIT text with your name and year.
2. `CHANGELOG.md` in Keep-a-Changelog form with a `## [0.1.0]` section. `make release` refuses a version without one.
3. `README.md` written for users, not for us. The directory shows an excerpt of it on the listing, with relative image links rewritten to the repo, so a screenshot or two under `docs/images/` and a short "what it does, how to use it" at the top matter. Move the acceptance-criteria and development sections below the user content or into `docs/`.
4. `manifest.json`: `id` `agate` (unique, must not contain "obsidian"), `name`, `description` in sentence case and under about 250 characters, `author`, `authorUrl`, `minAppVersion` `1.13.0` (the declarative settings API the tab uses), `isDesktopOnly` per the mobile check below. Optional `fundingUrl`. The directory reads the manifest from the HEAD of the default branch, so it must be committed on `main`.
5. Default branch is `main` and it's protected enough that CI runs before merges (a branch rule requiring the `check` job is enough).

## B. Code review pass against the guidelines

`npm run lint` uses `eslint-plugin-obsidianmd`, which encodes most of the review's automatic checks; zero errors and zero warnings is the current state and the bar to keep. Three items the spike had that a reviewer would have questioned were resolved on 2026-09-27:

1. The `SVGElement.prototype.isShown` shim (a global prototype change) is replaced by stopping `mouseover`/`mouseout` at the chart element, which keeps Obsidian's document-level hover handler out of Vega's SVG marks. Verify in Obsidian: no `isShown` error, no page preview under a tooltip (round 4 in the checklist).
2. The strong reference to the last Bases view (for the debug dump command) is a `WeakRef`.
3. Nothing is written to the console at load unless Debug logging is on.

Also confirm: no `innerHTML` (vega-embed builds its own DOM; we do not touch it), no hard-coded styles in TS (all in `styles.css` with Obsidian variables), every listener goes through `register*`, settings headings without the word "settings" and no top-level heading, sentence case throughout, and no Node or Electron imports in `src/` (mobile).

## C. Functional gate

1. `make check` green locally and in CI on `main`.
2. Full manual checklist in `demo-vault/tests/` (`M0 Checklist.md`, to be trimmed into `Checklist.md`) on desktop, light and dark theme.
3. Real mobile device: install via BRAT (below) or by copying the three files into `<vault>/.obsidian/plugins/agate/` through Files/iCloud. Charts render, tooltips work on touch, load time acceptable. Decide `isDesktopOnly` from this; if false, the directory will also list it for mobile.
4. Fresh-vault test: a vault that never had Agate, install from the release assets, enable, follow `docs/quickstart.md` without touching the repo. Everything the quickstart says must be true.
5. Upgrade test: install 0.0.x, then the release candidate over it; settings survive, charts still render.

## D. First release

1. Merge to `main`, `make release VERSION=0.1.0`. The workflow drafts the release.
2. On GitHub, open the draft, check the three assets are attached and the notes read well, publish.
3. Sanity check the published release the way Obsidian will: download `manifest.json` from the release and confirm `version` equals the tag.

## E. BRAT before the directory (optional, recommended)

The directory review takes time. [BRAT](https://github.com/TfTHacker/obsidian42-brat) installs a plugin straight from a GitHub repository with releases: Settings → BRAT → Add beta plugin → `Casyfill/Agate`. Point early users there, and use it yourself for the mobile test. Nothing in the repo needs to change for BRAT beyond a published release.

## F. Submit to the community directory

1. Sign in at [community.obsidian.md](https://community.obsidian.md) with your Obsidian account and link the GitHub account that owns `Casyfill/Agate`.
2. Add the plugin (the site's "Add a plugin or theme" flow), pointing at the repository. The directory reads `manifest.json` from `main` and looks for the release whose tag matches its `version`.
3. The automated review runs immediately and lists anything to fix. Fixes go into the repo followed by a new release with an incremented version; the listing updates itself.
4. Publish the listing once the automated review is clean; human review follows. Respond to comments the same way: change, release, done.

## G. After publishing

Announce in the forum's Share & showcase and, with the developer role, in Discord `#updates`. Then the routine is the README's release section: changelog entry, `make release VERSION=x.y.z`, publish the draft. Users update from within Obsidian.

## Not to forget

- Every release must have all three files attached even if `styles.css` did not change; Obsidian downloads them by name.
- `versions.json` accumulates one line per release; never rewrite old entries, they let older Obsidian versions pick the last compatible release.
- The community directory caches; after publishing a release, allow a little time before concluding an update is missing.
