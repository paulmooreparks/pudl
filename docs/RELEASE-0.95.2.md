# Release record: PUDL 0.95.2

This file records how 0.95.2 was prepared, checked and published under `RELEASING.md`.

Status: the 13-file candidate frozen on 2026-10-31 was approved for publication by the Architect. The failures of the minified matrix, described under "Release decision", stay recorded with their causes unproven. The corrections found in review, the reservation attribute name and the stale detail in a popover opened from a shared dock, are both in that candidate.

## Scope

Paul confirmed implementation, validation and publication of 0.95.2 on 2026-10-31. The release changes the Window status popover in three ways:

- Generated status rows lose list bullets and indentation, with the rule scoped to the component.
- `data-win-state-detail` holds a longer explanation, kept apart from the visible `data-win-state-label`. When the detail is present and not empty, the label (or the default state word) and the detail together form the mark's accessible name and tooltip. Without it, behaviour is unchanged.
- The status rows sit in a named, keyboard-focusable scroll region whose row reservation is configured on the owning window, so Dismiss stays still while up to six rows change.

Text enlargement, viewport fit, Escape and return focus, and the fixed geometry of state marks must be preserved.

On 2026-10-31 the Architect added a defect Dinah reported to the same work. The generated status popover is a direct child of `.win-layer` and reportedly inherits `pointer-events: none` from it, so pointer clicks on Dismiss and mouse-wheel scrolling pass through to whatever lies beneath. The Architect asked the Implementation Engineer to confirm it on a fixture without host overrides and, if it held, to give the popover component-scoped `pointer-events: auto`. The tests were to use real pointer input and real wheel input, without DOM `click()`, `dispatchEvent` or forced Playwright clicks. They were also to check that the covered surface underneath received neither, and that the wheel behaved correctly both within the list and at its scroll boundaries. The specification already required the popover and its Dismiss button to be interactive, so restoring that behaviour needed no further spec change. The confirmation and fix are under "Implementation evidence".

## Implementation evidence

The Implementation Engineer reported on 2026-10-31 that the work was implemented and tested, before review and before any freeze. The pointer defect was confirmed on the unoverridden fixture in Chromium, Firefox and WebKit. A real mouse click on Dismiss reached the window body underneath instead of Dismiss, and the wheel did not scroll the rows, because the popover is a child of the window layer, which has `pointer-events: none`. The fix sets `pointer-events: auto` on `.win-status-popover` only. The new tests use real mouse clicks and wheel input, check that the surface underneath receives nothing (at both ends of the rows as well), fail with the fix removed, and pass with it.

The rest of the implementation, as reported:

- Status rows are plain, without bullets or indentation, with `role="list"` and the rule scoped to the status popover. A window with no state no longer gets an empty state row.
- `data-win-state-detail` extends the state part of the names and tooltips of the title mark, taskbar and dock tabs, and stack rows, keeping title, count and progress. Aggregate stack names have counts only.
- The region is persistent and named with the existing Window status text. It is a tab stop that receives focus explicitly after the popover opens, keeps its scroll position, and gives up height before Dismiss does.
- `data-win-status-rows` accepts a single digit from 1 to 6, and anything else counts as absent. The execution row counts as a row. The row unit is a minimum of `max(22px, 1.5em)`, the reservation is capped by the viewport, and overflow scrolls without moving Dismiss.
- When the last status disappears, focus moves only if it was inside the popover or on its control, to the opener if it is showing and otherwise to the header.
- Dismiss now sits 8px below the list instead of following it with text spacing.

The Architect accepted the last two items as details of the status-list correction, not new scope. A window without an execution state uses no visible or reserved row in the popover, while compact mark slots elsewhere stay reserved. The gap above Dismiss uses the existing `space-2` token and comes with the dedicated scroll-region layout. Review then found that the code observed and read `data-win-state-rows` where the contract says `data-win-status-rows`. The freeze was held for that correction and for regression tests covering live updates to the attribute and the whole-window path.

Verification's independent browser review then found a second blocker in all three engines. In the shared-dock fixture (`window-status.html?shared=1`), with the dock's status on the left, opening Window status from the dock menu and changing `data-win-state-detail` from "Before" to "After" updated the dock and title marks to "Waiting: After", but the open popover still read "Waiting: Before". The function that fits the status group returned early when the owning header was hidden, before it reached the popover's refresh. The evidence is `tests/output/verification-0952-probe.log` and the probe script beside it. The two new suites had passed 6 of 6 in Verification's own run. The Architect ruled it a release blocker. The fix had to refresh an open popover's content independently of fitting the visible header, keeping the region, its focus and its scroll position, and an emptied popover still had to close with a usable return target in the dock. The regression tests had to go through the shared dock's real Window status command and cover detail changes, rows being added and removed, reservation changes and clearing every status. Both corrections, with those tests in the new `tests/window-status-dock.test.js`, went into the frozen candidate. The reservation attribute was also removed from the layer-wide observer, so a reservation change no longer rebuilds the dock.

Before those corrections, the two new suites, `tests/window-status-detail.test.js` and `tests/window-status-region.test.js`, passed in all three engines, and the related window-status, window-states, taskbar, window-menu, docked, dock-tab and axe suites passed 36 of 36. These results predate the frozen candidate and are not candidate evidence.

## Specification

The specification describes behaviour, and two of these changes add behaviour another implementation would have to follow: an undrawn detail joining the accessible name and tooltip, and a named, focusable status region with a reserved number of rows and a stationary Dismiss button. The Architect decided on 2026-10-31 that 0.95.2 implements a new specification patch, 0.52.2, which must be published before the PUDL tag. HTML attribute names stay in PUDL's own documentation. Build and Release drafted the patch in the pudl-spec checkout, which had no other local changes. The Architect reviewed two drafts. The second changed the reservation wording, the focus rule when the last status disappears, and how a detail joins the names of controls that already announce a state. The Architect approved the second draft with one formatting cleanup, removing an extra blank line in the changelog entry.

The patch changes four files: `VERSION`, the README status line, `CHANGELOG.md` and `spec/08-components/windows.md`. It was committed as `d7a01456d01906b26981ec2e032909b22fd1f34a` and tagged with the annotated tag `v0.52.2`, and `main` and the tag were pushed together on 2026-10-31. On GitHub, `main` and `v0.52.2` both resolve to `d7a0145`, and `v0.52.1` still resolves to `64b5a85`.

A fresh clone of the published `v0.52.2` was the source for vendoring. Its `tokens/` and `glyphs/` are byte-identical to the copies already vendored from 0.52.1, so only `vendor/pudl-spec/VERSION` changed, and it is byte-identical to the tag's. `node build/tokens.js` then changed one line of `dist/pudl.css`, the generated block's comment, which now reads "The tokens of PUDL specification 0.52.2." No token value changed.

## Release paths

The release commit stages only paths in `tests/output/release-0952-paths.txt`. Of its 20 entries, 18 changed. The minified core stylesheet and its map are listed but unchanged, because the core stylesheet's source changed only in comments. Unrelated local work stays unstaged: `.codex/`, `.devin/`, `CARRYOVER.md` and the four `samples/*-mockup.html` files.

## Candidate checks

The Architect reviewed the final source correction, the observer cleanup and disposal, and froze the source on 2026-10-31 in `tests/output/release-0952-source-freeze.json`. The freeze covers 13 files: every path in the release list except the generated minified copies and this record. Before the build, `tests/output/release-0952-drift.js` found all 13 unchanged, and the release list and the freeze file agreed.

| Check | Result |
| --- | --- |
| `node build/minify.js`, then `--check` | Pass; 37 copies, of which only the windows script and stylesheet copies changed, since the core stylesheet's source changed only in comments |
| `node build/skins.js --check --release` | Pass |
| `node --test build/skin-definition.test.js build/skin-css.test.js` | Pass, 8 of 8 |
| `node build/tokens.js` leaves `dist/pudl.css` unchanged | Pass |
| `git diff --check` | No whitespace errors |
| Vendored `tokens/`, `glyphs/` and `VERSION` against pudl-spec `v0.52.2` | Identical; the published tag resolves to `d7a0145` |

Build and Release started the full normal matrix straight after the Architect's handoff message, without an explicit release of the browser slot from Verification. Verification's region confirmation run was still active, and Verification had asked for no new browser jobs until it released the slot. The Architect then held the handoff until that release. Build and Release stopped its own run after 11 suite runs had passed and no failures had been recorded. No test runner of its own was left running. The partial log is kept as `tests/output/release-0952-overlap-interrupted-normal.log` and does not count as release evidence. The minified matrix had not started.

## Independent review

Verification closed its independent review with no remaining concrete blocker. The review is bound to all 13 frozen hashes, through the freeze file's SHA-256 `7a8d73c09d2d9c6283757dad91aa0f8c5495716827f111673fc3ab5da7d1e6c1`. The final corrected region confirmation passed 3 of 3 across Chromium, Firefox and WebKit, and the earlier corrected dock, detail and state runs passed 9 of 9. Both product findings are resolved: the wrong reservation attribute name, and the stale detail in a popover opened from a shared dock. The original failing evidence is kept. Manual screen-reader interoperability and real browser zoom were not tested; text enlargement was covered by token-based tests. The full disposition and its limits are in `tests/output/verification-0952-review.md`. Verification then stopped all its runners and servers and released the browser slot to Build and Release.

## Final matrices

After Verification's release, the frozen files were checked again and still matched, the minified copies were still fresh, and the full normal and minified matrices started from the beginning.

The normal matrix passed 336 of 336 suite runs in 611 seconds (`tests/output/release-0952-final-normal.log`).

The minified matrix passed 333 of 336 in 695 seconds (`tests/output/release-0952-final-min.log`). It had three failures:

- Firefox `applets.test.js`: its no-errors-or-warnings check caught Firefox's own warning that "127.0.0.1" had been classified as a bounce tracker. The same warning failed a different suite in the 0.95.1 minified run.
- Firefox `tabbed-surfaces.test.js`: a Playwright `TimeoutError` while waiting for the "Each" button to become visible, enabled and stable before clicking it. The same suite timed out in both 0.95.1 normal runs.
- WebKit `expenses.test.js`: an `Error` whose recorded output keeps only its tail, which ends in request headers (`cache-control: no-cache`, `pragma: no-cache`), so the log does not show the assertion or the failing step.

The frozen files still matched and the minified copies were still fresh when the three suites were rerun one at a time against the minified files. All three passed: Firefox applets and tabbed-surfaces 2 of 2 (`tests/output/release-0952-final-isolated-firefox-min.log`), and WebKit expenses 1 of 1 (`tests/output/release-0952-final-isolated-webkit-min.log`). Those reruns do not establish what caused the failures, and the WebKit failure's full message was not captured.

The Architect approved three further serial WebKit expenses runs against the unchanged minified candidate, each saving its complete output to its own file, and stopping at the first failure. The original failure's full output cannot be recovered. `tests/run.js` keeps each suite's output in memory and prints only its `FAIL` lines, or its last six lines when it printed none. Nothing else is written, apart from screenshots, and the isolated rerun had already overwritten those. The three runs used `tests/output/release-0952-full-output.js`, which serves files with the same code as `tests/run.js` and saves the suite's whole output. With the frozen files still matching and the minified copies fresh, each run passed all 86 checks with exit code 0 (`tests/output/release-0952-webkit-expenses-min-run1.log` to `run3.log`). That is more evidence that the failure does not reproduce, but it recovers nothing about the original assertion and proves no cause.

The expenses pages statically load `dist/pudl.css` and the dialog, menu, tabs, theme, toast and tooltip scripts, plus the sample's own stylesheet and script. They do not load the windows files this release changed. In the minified run every one of those `dist/min/` copies is byte-identical to `v0.95.1`, because the core stylesheet's source changed only in two comment lines. The samples, the expenses test, `tests/lib.js` and `tests/run.js` are unchanged since `v0.95.1`. This trace covers the assets the pages load statically, not anything loaded at run time or injected by the test.

## Release decision

The full validation was not clean. The Architect rechecked all 13 frozen hashes and whitespace and gave the go for publication on 2026-10-31. The decision rests on the clean normal matrix (336 of 336), Verification's independent review, the passing isolated minified reruns and the three fully logged WebKit expenses passes. It keeps the minified matrix's 333 of 336 as the result of record, and it accepts that the original WebKit expenses error cannot be recovered. The causes of all three minified failures remain unproven.

## Follow-up

The test harness should keep each suite's complete output and save screenshots under unique names before any rerun, so that a failure's full error survives. The Architect asked for this to be recorded as a follow-up and not changed in this release.

## Publication

The release commit contains this record as it stood before tagging. The publication details below were added in the follow-up commit that updates the README.

The release commit is `c280fe0fca9a61a9e3fda3277ed8bf0fa59302f9`, with the 18 changed paths from the release list and nothing else. Before tagging, all 13 frozen files in that commit matched their hashes, and pudl-spec `v0.52.2` was confirmed published at `d7a0145`. The annotated tag `v0.95.2` points to that commit, and `main` and the tag were pushed together on 2026-10-31; `v0.95.1` still resolves to `1399389`. The GitHub release is at https://github.com/paulmooreparks/pudl/releases/tag/v0.95.2.

The archive was built from the pushed tag with `git archive --format=zip --prefix=pudl-0.95.2/ v0.95.2 CHANGELOG.md LICENSE README.md dist docs/WINDOW-STATUS.md docs/proposals/0952-window-status.md docs/RELEASE-0.95.2.md`, and building it twice gave identical bytes. Its comment is the release commit. It was attached to the release with its checksum, then both were downloaded from the public addresses. `sha256sum -c` passed, the download matched the built archive, all 165 files are byte-identical to the tag, and its `dist/` holds the same 159 files as `dist/` at the tag.

- Archive: https://github.com/paulmooreparks/pudl/releases/download/v0.95.2/pudl-0.95.2.zip (5,780,780 bytes)
- Checksum: https://github.com/paulmooreparks/pudl/releases/download/v0.95.2/pudl-0.95.2.zip.sha256
- SHA-256: `c1495df9d6eaf2bf80abf59a0e2a27b8ca1c7aa49761de0410210b1f2fb136e6`

All 83 CSS and JavaScript files under `dist/` at the tag were fetched from jsDelivr and matched the tagged bytes, with no mismatches; their SHA-384 values are in `tests/output/release-0952-cdn-hashes.txt`. The 24 CDN examples in `README.md` now point at `v0.95.2` with those values. Three of them changed their hash: the core stylesheet, whose source changed in two comment lines, and the windows stylesheet and script. Because the archive comes from the tag, its `README.md` still shows the 0.95.1 CDN examples.

## Continuous integration

GitHub Actions ran the test workflow three times, and every job passed on the first attempt: Chromium, Firefox, WebKit, the minified-copy check and the font-subset check. No rerun was needed.

- Release commit `c280fe0`, tag push: run 41108593795.
- Release commit `c280fe0`, `main` push: run 41108593483.
- README commit `8455809`, `main` push: run 41108963307.

## Announcement

The Architect cleared the CI hold, reviewed the announcement and asked for two changes: a heading that also covers the taskbar, dock and stack controls, and a sentence saying the updated CDN examples are in the README on `main` while the archive keeps its tagged README. The announcement was posted to the PUDL Usage group on 2026-10-31 (bus message 1931). It keeps the test limits and the first-attempt CI result.
