# Release record: PUDL 0.95.1

This file records how 0.95.1 was prepared, checked and published under `RELEASING.md`. It implements specification 0.52.1.

Status: the 20-file candidate frozen on 2026-10-31 was approved for publication by the Architect, with the broad-run failures described under "Release decision" retained. The corrections that were open earlier (folded title-chip foreground, stale submenu invocation under a newly disabled parent, focus restoration after retitle, forced-colours glyph contrast and taskbar row height) are all in that candidate.

## Release paths

The release commit stages only the paths listed in `tests/output/release-0951-paths.txt`, and nothing else in the working tree. Other local work in the shared checkout stays unstaged: `.codex/`, `.devin/`, `CARRYOVER.md` and the four `samples/*-mockup.html` files. No mockup belongs to this release. Skin definitions, generated skin CSS and admitted skin hashes are unchanged.

## Pre-freeze checks

These checks ran against the working tree on 2026-10-30 before the source was frozen, and every one must be repeated on the frozen candidate.

| Check | Result |
| --- | --- |
| `node build/minify.js --check` | Pass, 37 minified copies match their sources |
| Vendored `tokens/`, `glyphs/` and `VERSION` against pudl-spec tag `v0.52.1` | Identical |
| `node build/tokens.js` leaves `dist/pudl.css` unchanged | Pass |
| `node build/skins.js --check --release` | Pass |
| `node --test build/skin-definition.test.js build/skin-css.test.js` | Pass, 8 of 8 |
| `python build/fonts.py --check` | Pass |
| `git diff --check` | No whitespace errors |
| Version strings in `dist/pudl.css`, the topbar of `reference.html` and the Status section of `README.md` | All read 0.95.1 |
| `CHANGELOG.md` entry states the specification version | Yes, 0.52.1 |

## Browser matrix

The normal and minified (`PUDL_MIN=1`) suites ran in Chromium, Firefox and WebKit. This section and the next two record the earlier candidates in order; the results for the published candidate are under "Final candidate checks".

A first broad normal run before the freeze passed 320 of 324 suites (`tests/output/release-0951-normal.log`). The dock-drag failures it found were fixed in the source and `tests/shared-docks-edges.test.js`, which joined the release paths. The dock suite then passed in all three engines (`tests/output/release-0951-docks-fixed-*.log`). That run predates the menu focus fix, so it does not count as candidate evidence.

The menu fixes (a submenu command no longer runs after its parent is disabled, keyboard focus survives retitling or removing an open menu, and command IDs are normalized to strings) have focused evidence in `tests/output/engineer/menu-evidence.md`. The menu-bar freshness suite passed in all three engines, and 45 of 45 related keyboard and ribbon suites passed. The first retitle focus failure came from the test itself and was fixed in the test only. In the first broad run, WebKit's Alt-letter focus test failed once; it passed 4 of 4 isolated runs afterwards and has not been reproduced since, and its cause is unproven.

The source-ready sign-off and hashes of the frozen source, test and doc files are in `tests/output/release-0951-source-freeze.json`. Verification raised a forced-colours contrast blocker on the title-bar state glyph at the same time. The Architect withdrew that freeze to give the glyph a paired system foreground and background and to add real contrast checks on active and inactive headers in light and dark themes. When the expanded contrast test first ran, Firefox's emulated forced-colours selection pair, white on rgb(51,153,255), measured 2.94:1 against the required 3:1. The correction passed the expanded glyph-contrast matrix in all three engines (`tests/output/release-0951-forced-state-fixed.log`). The Architect then re-froze the source, regenerated `tests/output/release-0951-source-freeze.json` and restored the source-ready sign-off.

## Independent review

Verification finished its read-only review of the execution-state changes on 2026-10-30 and closed the forced-colours blocker against the final pairing of system text and background colours. That closure covers the glyph masks painted in the current colour and the marks on selected taskbar buttons and stacks. Verification also reviewed the expanded contrast assertions and the corrected log that passed in all three engines. It found no other blocker in reserved slots and folding, glyph and word mappings, invalid-state precedence, the legacy running fallback, how represented roots set priority and counts, folded read-only output, accessible names and tooltips, or reduced-motion handling. Verification ran no browsers and edited no files. The windows stylesheet it reviewed has SHA-256 `1d7ae420…0732` and the windows script `12923763…3fe30`, both matching the freeze file. The review gate is clear for this frozen candidate, provided the final broad runs and package checks pass.

## Frozen candidate checks

These checks ran on the re-frozen candidate on 2026-10-30. `tests/output/release-0951-drift.js` found all 19 frozen files unchanged before the build.

| Check | Result |
| --- | --- |
| `node build/minify.js`, then `--check` | Pass; 37 copies, of which only the menu-bar, windows and core stylesheet copies changed |
| `node build/skins.js --check --release` | Pass |
| `node --test build/skin-definition.test.js build/skin-css.test.js` | Pass, 8 of 8 |
| `node build/tokens.js` leaves `dist/pudl.css` unchanged | Pass |
| `git diff --check` | No whitespace errors |

The full normal matrix on this candidate passed 320 of 324 suite runs in 680 seconds with four at a time (`tests/output/release-0951-final-normal.log`). Chromium and WebKit passed every suite. The four failures were all in Firefox (command-bar, tabbed-surfaces, tables-notices-keys and taskbar-reorder), and each was a Playwright `TimeoutError`, three of them while navigating to the page. At the time of that run they had not been rerun in isolation; the later isolated rerun is under "Final candidate checks", and their cause remains unproven. The minified matrix was stopped seconds after it began, because a user-reported taskbar defect put publication on hold, and its partial log was discarded. This candidate is superseded by the taskbar correction, and the full normal and minified matrices run again on the next freeze.

## Taskbar row height correction

After that run, a user reported that stack buttons were visibly shorter than ordinary taskbar entries. The Implementation Engineer measured the cause in all three engines. A stack is a button with `line-height: normal` and measured 23px, while ordinary entries are links that inherit a 19.2px line-height and measured 27.2px. The fix adds `line-height: inherit` to `.win-tab` in `dist/pudl-windows.css`, without fixed pixel heights. The new `tests/taskbar-row-height.test.js` checks equal row heights for stacks, ordinary windows and docked windows across the four skins in light and dark themes, with execution states, enlarged text, a narrow viewport and repeated switching between windows and stacks. It passes in all three engines and fails against the CSS before the fix. The related taskbar, window-state, window-status and dock suites passed 24 of 24. The Architect accepted the correction, added it to `CHANGELOG.md` and re-froze 20 files.

Verification confirmed that its forced-colours approval still holds. Removing only the new comment and declaration reproduces the windows stylesheet it approved before (`1d7ae420…0732`), and the approval now covers windows CSS `c718c33a…83c2`.

## Final candidate checks

These checks ran on the re-frozen candidate on 2026-10-31. All 20 frozen files matched their hashes, and the release file list agrees with the freeze file apart from the generated minified copies and this record. `node build/minify.js` regenerated the minified copies, and the minify, skins, token and whitespace checks passed, along with 8 of 8 skin unit tests. The four Firefox timeouts from the superseded run passed 4 of 4 in isolation (`tests/output/release-0951-firefox-timeouts-isolated.log`).

The final normal matrix passed 325 of 327 suite runs (`tests/output/release-0951-final2-normal.log`). Chromium and WebKit passed every suite. Firefox failed tabbed-surfaces and taskbar-reorder, both with Playwright `TimeoutError`; taskbar-reorder timed out after 30 seconds waiting for a page reload to reach `load`. The final minified matrix passed 326 of 327 (`tests/output/release-0951-final2-min.log`). Its one failure was Firefox windows, whose console check caught a browser warning that "127.0.0.1" had been classified as a bounce tracker; that warning comes from Firefox's own tracking protection, not from PUDL. With the frozen files still matching and the minified copies fresh, those suites (plus child-windows, which the filter also matched) were rerun one at a time in Firefox. They passed 4 of 4 normal and 4 of 4 minified (`tests/output/release-0951-final2-firefox-isolated-*.log`). The original failures remain part of this record, and their cause is not proven.

## Release decision

Neither final matrix was clean. The Architect reviewed the broad failures, both serial Firefox logs, the 20 matching hashes and the fresh minified copies, and gave the go for publication on 2026-10-31. The decision explicitly accepts two kinds of retained uncertainty: the two Firefox timeouts in the normal run, whose cause is unproven and is not attributed to machine load, and the browser-generated bounce-tracker warning in the minified run. The windows and taskbar-reorder suites exercise `dist/pudl-windows.js` and `dist/pudl-windows.css`, which changed in this release, so the failures cannot be ruled unrelated to the changed code on that ground. The evidence that supports the decision is narrower than that: where each failure occurred, frozen inputs that did not change between the broad runs and the reruns, and serial reruns that passed on the unchanged candidate. Those reruns do not establish what caused the timeouts. Verification's forced-colours approval remains bound to the frozen hashes, and the publication decision is the Architect's.

## Publication

The PUDL tag depends on pudl-spec `v0.52.1` being published, because the changelog refers to that specification version. The Architect published it on 2026-10-30. On GitHub, pudl-spec `main` and the annotated tag `v0.52.1` both resolve to commit `64b5a85`, which replaced the earlier local-only commit `0e47b4e` to undo an accidental change to the encoding of a middle dot. The vendored `tokens/`, `glyphs/` and `VERSION` are byte-identical to the published tag.

The CDN examples in `README.md` still point at 0.94.0; the README update that should have followed 0.95.0 never landed. After the 0.95.1 tag is on jsDelivr and its hashes are verified, the examples move straight to 0.95.1.

The release commit contains this record as it stood before tagging. The commit, tag, GitHub release and jsDelivr hash verification are added below in the follow-up commit that updates the README.

The release commit is `1399389adc63ab2bc530ac7465991dc5f1800f38`, and it contains exactly the 29 paths in the release file list. Before tagging, every one of the 20 frozen files in that commit matched its hash in the freeze file. The annotated tag `v0.95.1` points to that commit, and `main` and the tag were pushed together on 2026-10-31. The GitHub release is at https://github.com/paulmooreparks/pudl/releases/tag/v0.95.1.

All 83 CSS and JavaScript files under `dist/` at the tag were fetched from jsDelivr and matched the tagged bytes, with no mismatches. Their SHA-384 integrity values are in `tests/output/release-0951-cdn-hashes.txt`. The 24 CDN examples in `README.md` now point at `v0.95.1` with those values; seven of them changed their hash, and the rest serve files whose bytes did not change since 0.94.0.

## Release archive correction

The GitHub release was first published without the archive and checksum that projects copying PUDL download, because `RELEASING.md` did not mention them. The Architect found the omission by comparing the release with 0.95.0, which has `pudl-0.95.0.zip` and `pudl-0.95.0.zip.sha256`. The 0.95.0 archive came from a scoped `git archive` of its tag; running `git archive --format=zip --prefix=pudl-0.95.0/ v0.95.0 CHANGELOG.md LICENSE README.md dist docs/SKINS-VERIFICATION.md docs/SKINS.md tests/skins/FINAL-ADMISSION.md` reproduces it byte for byte.

The 0.95.1 archive was built the same way from the pushed tag, with the documents this release points to: `git archive --format=zip --prefix=pudl-0.95.1/ v0.95.1 CHANGELOG.md LICENSE README.md dist docs/WINDOW-STATUS.md docs/RELEASE-0.95.1.md`. Its comment is the release commit `1399389`, and building it a second time gave identical bytes. Both files were uploaded to the existing release on 2026-10-31, and the tag still points to `1399389`.

The uploaded pair was then downloaded from the public addresses. `sha256sum -c` passed, and the download matched the built archive. All 164 files in the archive are byte-identical to the tag, and its `dist/` holds the same 159 files as `dist/` at the tag. Because the archive comes from the tag, its `README.md` still shows the 0.94.0 CDN examples; the branch's README has the 0.95.1 values.

- Archive: https://github.com/paulmooreparks/pudl/releases/download/v0.95.1/pudl-0.95.1.zip (5,772,864 bytes)
- Checksum: https://github.com/paulmooreparks/pudl/releases/download/v0.95.1/pudl-0.95.1.zip.sha256
- SHA-256: `fee72ca9e074a96a3cb8a9a6aa51128cf3a6f3776c2529022e9f4e615ac5eb2d`

`RELEASING.md` now includes building the archive and checksum from the tag, uploading them with the release, and checking the downloaded pair.
