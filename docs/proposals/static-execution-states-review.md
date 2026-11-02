# Static execution states: review notes

The original isolated implementation candidate is in a separate `pudl-state-release` worktree, on branch `release/static-execution-states`, based on PUDL `cab552a`. The specification candidate is commit `4917bf70a097fcefb8c42645504b30c03e6105c7` in the pudl-spec repository. The specification has since been published as v0.52.3 at that same commit. The implementation is now integrated into the skins/themes 0.96.0 candidate; its isolated source review passed, and combined rendered review remains required. Independent review and final release checks also remain required.

## Review scope

The reviewer should compare the specification commit with `v0.52.2` and the PUDL candidate with `cab552a`. The contract and decisions are in [the design](static-execution-states.md). The reviewer should verify all generated execution surfaces use static Play, Pause, warning and square glyphs with the existing semantic paint, including legacy running and both motion preferences.

The reviewer should also inspect initial suppression, live toggles, empty-group layout, host chip preservation, hidden-header popovers, focus return and whole-window updates. The owning window observes suppression locally; it does not rebuild docks for this setting. Default title reservation remains unchanged. Suppression frees the title slot and omits the generated popover row.

The new presentation suite checks the exact mask data and animation for every surface, then exercises the public suppression contract. The layout suite checks admitted skins in both palettes and doubled text. Existing window-state tests cover forced-colour glyph contrast, aggregation and default reserved geometry. Existing region and dock tests cover real pointer input, scrolling, live updates and return focus.

## Remaining release work

The original isolated worktree retains the earlier three skins as evidence. The current combined candidate contains all seven optional skins, whose updated bytes still require admission.

Specification 0.52.3 passed independent source review and was published before the combined implementation release. The release must verify the complete vendored copy against that immutable tag and regenerate tokens. The final PUDL freeze must bind source and tests to hashes. Normal and minified broad matrices, package checks, reference-page review, tagged archive and checksum verification, CDN verification and CI must complete before the release announcement. The target version is 0.96.0 under the repository's minor-version rule for new public contracts.

Manual screen-reader interoperability and actual browser zoom have not been tested. Text enlargement uses the browser's root font size. Current test outcomes are recorded in [the release record](../RELEASE-0.96.0.md); draft vendoring is not publication provenance.
