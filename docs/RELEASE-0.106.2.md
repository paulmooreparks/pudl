# PUDL 0.106.2 verification

PUDL 0.106.2 combines the active-menu mnemonic correction with a correction for layout-triggered hover switching. Publication and intake await the complete hosted gates. The 0.106.0 prerelease and unpublished 0.106.1 tag remain immutable.

## Findings and corrections

The [0.106.1 investigation](RELEASE-0.106.1.md) reproduced a mnemonic arriving before the newly active window's queued menu redraw. The handler now refreshes its source before looking up the letter. The deterministic same-task regression fails on the earlier implementation and passes after that correction.

Linux repetition then showed a separate failure after focus had correctly reached Save. The trace captured a later `fill` call from `open`, called by `onBarPointer`, clearing the focused panel. Layout had moved another title beneath the parked pointer, causing `pointerover` without physical pointer movement. The [Pointer Events specification](https://www.w3.org/TR/pointerevents3/#the-pointerover-event) requires boundary events for that situation; the implementation had incorrectly treated every such event as user movement.

The bar now listens for `pointermove` when switching between open menu titles. The deterministic regression dispatches a boundary event while a keyboard menu is open and checks that its anchor and focused command survive. It fails before the correction. Existing mouse-hover checks still verify actual pointer movement switches the menu and clicking that title closes it.

The provider picture failure was a test-readiness error. Replacing a running window button with a dormant destination link creates a new image that initially shows its glyph fallback. The trace shows its load event revealing the picture. The regression verifies a visible identity mark during that interval, then waits for the image. Runtime picture code is unchanged. A separate earlier native new-tab navigation timeout remains unexplained and is not claimed resolved.

Original failures and diagnostic Linux source/minified artifacts are retained under `tests/output`. Instrumentation was removed from the corrected repetition tests.

A separate 0.106.1 full minified Chromium run failed the host study's immediate pin-visibility assertion after resizing to a compact viewport. The test now waits for the launcher's reported compact state before asserting the resulting controls, matching its existing wait when returning to the desktop viewport. The overflow and visibility assertions remain unchanged. Runtime launcher code is unchanged, and diagnostic repetitions retain the original failure for comparison.

## Gates and intake

Local Chromium, Firefox and WebKit checks cover the menu corrections, mouse switching, open-menu update continuity and provider pictures. The full hosted matrices, source/minified Linux repetitions, generated assets, archive closure and public artifact verification remain required before handoff.

This release retains stack edges, firmer Standard boundaries, Alloy Bold and the corrected title separator from 0.106.0. Hosts replace the complete distribution and link `pudl-skin-alloy-bold.css` in each document that offers the skin. Preferences and defaults require no migration. A yavc.app release bundling the cleared PUDL version precedes Dinah's final intake. The standalone Editor implementation starts after that delivery and the launcher-label correction are installed and verified in GK Companion.
