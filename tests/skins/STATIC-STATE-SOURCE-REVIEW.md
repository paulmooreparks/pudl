# Independent static-state contract and source review for PUDL 0.96.0

The disposition is PASS for the isolated static-state contract and source candidate. I found no concrete blocker in the reviewed changes. This closes this source review only. It does not admit skins, approve combined rendered behavior or authorize publication.

## Inputs and provenance

I compared specification commit `4917bf70a097fcefb8c42645504b30c03e6105c7` with `v0.52.2`, and implementation commit `ec301060a4392244d1eed1286f6e0865fb1e4246` with `cab552a`. I read `docs/proposals/static-execution-states.md`, `docs/proposals/static-execution-states-review.md`, the implementation documentation, both new suites and retained affected-suite logs in the sibling worktree.

All 21 entries in `tests/output/state-review-candidate-hashes.json` match the immutable implementation commit. All 97 vendored specification files match the specification candidate byte for byte. Both committed diffs pass whitespace checks. Draft vendoring establishes candidate consistency; it is not provenance from a published specification tag.

## Contract and source findings

The specification and implementation agree on Working using solid right-pointing Play with accent-derived paint, Waiting using Pause with warn-derived paint, Idle using solid square with text-muted paint, and Stuck using the warning triangle with danger-derived paint. The shared `STATE_GLYPHS` map feeds generated title, taskbar, dock, stack summary, stack row and folded status marks through `paintState`. Legacy running still becomes Working. Existing semantic colour mixes toward text are retained and documented; the contract does not require replacing those contrast-preserving mixes with raw palette values. Forced-colour Canvas/CanvasText rules remain intact.

The working animation declaration, its keyframes and the execution-specific reduced-motion override are removed. Consequently neither motion preference introduces execution animation. Old glyph assets remain available, and the octagonal stop sign is not used for Idle.

Only the exact owning-window value `data-win-state-title="none"` suppresses the generated title execution chip and folded execution row. Missing, empty and unrecognized values preserve the default. The generated chip shell remains reserved without suppression even when no execution state exists. Suppression hides its wrapper and frees its title slot. A group without remaining host statuses is hidden, so it consumes no title space.

`titleExecutionState` applies suppression only to title and folded status presentation. Other surfaces continue to use `executionState`, preserving taskbar, dock, individual stack and aggregate state behavior. The status enumeration identifies the generated node by identity and retains visible, nonempty host chips. Existing host glyph copying and text rendering remain in place.

A local observer watches the suppression attribute, repaints the title mark and schedules fitting. The broad layer observer does not watch suppression, so this setting does not rebuild docks. Fitting refreshes an open popover before the hidden-header early return. It therefore handles shared-dock routes as well as visible headers. Refresh retains the region node and scroll position. A suppressed execution row is omitted from list contents; the explicitly configured reservation count itself remains unchanged.

When suppression empties an open popover, fitting closes it and applies the existing conditional focus return to a visible opener or header. The setting is included in whole-window status-attribute copying/removal. Its local update path does not replace body content, mutate window bounds or write URL state. Observer disposal remains present.

## Retained verification

The readable affected matrix log records 72/72 suite runs across Chromium, Firefox and WebKit. Minified evidence comprises 69/69 affected runs followed by 3/3 title-layout runs, giving 72/72 coverage in two runs. The corrected presentation log also records 3/3. I inspected the retained logs; I did not rerun browsers.

The presentation test asserts exact mask data, static animation and 16px size on title, taskbar, dock and stack surfaces under both motion preferences. Folded-state mapping is checked later in the same test under its final no-preference setting. Source removal of execution animation supports the reduced-motion folded case, but this review does not claim an explicit folded-popup assertion under both preferences. The tests cover defaults, initial/live suppression, host words/glyphs, region identity/focus, hidden-header toggles, popup closure and dock return focus, edits/body identity, URL/bounds and whole-window attribute updates. The title-layout suite covers the earlier Standard/Bevel/Gel/Glaze styles in light/dark and enlarged text, with a narrow-layout check. Existing state tests retain aggregation, reserved geometry and forced-colour contrast coverage.

These are implementation-owner results supporting independent source review. They predate integration with Matte, Ink, Alloy, Glass, revised existing skins and companion palettes. Manual screen-reader interoperability and actual browser zoom remain unperformed. No combined rendered conclusion follows from these logs.

## Integration and release requirements

Verification must review the combined runtime and rendered surfaces after integration. The final source freeze and generated-asset checks must bind the integrated bytes, followed by the agreed broad matrices and release gates. Publish the reviewed specification first and verify vendoring against its immutable tag. Reconcile historical statements that the two candidates are separate and that the implementation has not yet been independently reviewed, while retaining their original evidence limits.

The earlier archive root set must gain `docs/WINDOW-STATUS.md`, `docs/CONTRACT.md`, `docs/proposals/static-execution-states.md` and `docs/proposals/static-execution-states-review.md`, plus the final independent review/admission record selected by the release owner. The existing recursive dist and vendor roots include the new glyph tokens and assets. No package was created in this review.

I edited only this ignored review record. I did not edit source, run browsers, change admission, commit, tag or publish.
