# PUDL 0.106.2 verification

PUDL 0.106.2 is [published and cleared for consumer intake](https://github.com/paulmooreparks/pudl/releases/tag/v0.106.2). It combines the active-menu mnemonic correction with a correction for layout-triggered hover switching. The 0.106.0 prerelease and unpublished 0.106.1 tag remain immutable.

## Published identity

Tag `v0.106.2` fixes commit `a6e0d432cdd57f5798c4e58384b94f4f26d8722f`. The reproducible archive contains 507 files, including all 196 distribution files, and is 7,213,880 bytes with SHA-256 `7e315f5775f2486808b94cb0de9142a8dec168f602560d68269137aace8afc10`. The distribution manifest has SHA-256 `60b3fff55740c41cf4e0e895582874fa1386ba0ee78fb918e2e62ffe9afa1b93`. The archive, adjacent checksum and manifest are attached to the release. Fresh public downloads match these hashes, every archived Git blob and every distribution record. All 105 CSS/JavaScript CDN files match their tagged bytes, and the branch README uses their verified SHA-384 values.

The two menu and picture corrections passed all 60 Linux source/minified repetitions in run 42895806242, with individual result files audited for effective exit zero and no printed failures or timeouts. The compact launcher baseline probe captured desktop state and a visible pin at viewport width 390, followed two frames later by compact state and a hidden pin. Local readable and minified host studies pass in all three engines.

Before publication, review caught the manifest helper's omitted version and per-file integrity fields. The final manifest restores the complete published schema, preserving the tag, commit, file paths, byte counts and SHA-256 values. The shared generator reproduces every metadata field and all 196 records of the 0.106.0 manifest; independent Python checks verify the final manifest against the tagged archive. Both preliminary manifests are retained with the diagnostic evidence. The archive and tag did not change. The corrected compact-state check passed all 20 Linux source/minified repetitions in run 42896925376.

Dinah reports 24 passing browser suites and a passing hidden desktop check against this archive, with the intake uncommitted and uninstalled. yavc.app reports passing package checks for all four applets, canvas pictures and separate slideshow windows in Chromium, Firefox and WebKit, plus passing site launcher/taskbar, editing-command and command-state matrices. It reports two other stale site-test timeouts reproducing on both 0.105.0 and this candidate; those remain outside PUDL's claimed closure.

## Findings and corrections

The [0.106.1 investigation](RELEASE-0.106.1.md) reproduced a mnemonic arriving before the newly active window's queued menu redraw. The handler now refreshes its source before looking up the letter. The deterministic same-task regression fails on the earlier implementation and passes after that correction.

Linux repetition then showed a separate failure after focus had correctly reached Save. The trace captured a later `fill` call from `open`, called by `onBarPointer`, clearing the focused panel. Layout had moved another title beneath the parked pointer, causing `pointerover` without physical pointer movement. The [Pointer Events specification](https://www.w3.org/TR/pointerevents3/#the-pointerover-event) requires boundary events for that situation; the implementation had incorrectly treated every such event as user movement.

The bar now listens for `pointermove` when switching between open menu titles. The deterministic regression dispatches a boundary event while a keyboard menu is open and checks that its anchor and focused command survive. It fails before the correction. Existing mouse-hover checks still verify actual pointer movement switches the menu and clicking that title closes it.

The provider picture failure was a test-readiness error. Replacing a running window button with a dormant destination link creates a new image that initially shows its glyph fallback. The trace shows its load event revealing the picture. The regression verifies a visible identity mark during that interval, then waits for the image. Runtime picture code is unchanged. A separate earlier native new-tab navigation timeout remains unexplained and is not claimed resolved.

Original failures and diagnostic Linux source/minified artifacts are retained under `tests/output`. Instrumentation was removed from the corrected repetition tests.

A separate 0.106.1 full minified Chromium run failed the host study's immediate pin-visibility assertion after resizing to a compact viewport. The test now waits for the launcher's reported compact state before asserting the resulting controls, matching its existing wait when returning to the desktop viewport. The overflow and visibility assertions remain unchanged. Runtime launcher code is unchanged, and diagnostic repetitions retain the original failure for comparison.

## Gates and intake

Both complete hosted gates passed on the immutable release commit: [branch run 42896759067](https://github.com/paulmooreparks/pudl/actions/runs/42896759067) and [tag run 42897006512](https://github.com/paulmooreparks/pudl/actions/runs/42897006512). Each contains 165 readable suites in Chromium, Firefox and WebKit and 165 minified Chromium suites. All 1,320 individual results have effective exit zero, no printed failure and no timeout. Generated fonts, skin admission, tokens and minifier freshness pass. Twenty local build unit checks pass.

Local readable/minified Chromium, Firefox and WebKit checks cover both menu corrections, mouse switching, open-menu update continuity, provider pictures and compact host studies. The reference page passes Start, launcher and focus-return checks without browser errors in both themes, including from the downloaded archive. Package closure resolves 972 local references without omissions. Physical touch and manual assistive-technology acceptance remain unclaimed.

This release retains stack edges, firmer Standard boundaries, Alloy Bold and the corrected title separator from 0.106.0. Hosts replace the complete distribution and link `pudl-skin-alloy-bold.css` in each document that offers the skin. Preferences and defaults require no migration. A yavc.app release bundling the cleared PUDL version precedes Dinah's final intake. The standalone Editor implementation starts after that delivery and the launcher-label correction are installed and verified in GK Companion.
