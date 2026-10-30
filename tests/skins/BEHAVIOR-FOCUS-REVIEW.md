# Bevel behavior and keyboard focus review

Bevel passes the reviewed behavior suites. This record retains the initial ordinary-button focus failure and its evidence. The subsequent opaque correction resolves that card-surface failure; [OPAQUE-FOCUS-REVIEW.md](OPAQUE-FOCUS-REVIEW.md) records the remaining active-window and topbar failures. Bevel remains unapproved for release.

## Behavior results

All 24 suite runs pass. The runs cover context menus, taskbar stacks, snapping and docking in Chromium, Firefox and WebKit, with light and dark initial theme forms. The existing taskbar suite also exercises its pointer, touch, RTL, focus, live-update and forced-colour paths. These are behavior checks under Bevel paint; they do not establish every visual accessibility requirement in those states.

The `behavior-review.js` harness serves the immutable corrected candidate from `tests/output/skins-bevel-corrected-source`. It injects the Bevel selection and stylesheet into served HTML without editing the fixtures or shipped files. Each suite records successful HTML injection and skin stylesheet responses. The taskbar suite changes themes itself for some cases. Other fixtures retain the initial form. No synthetic `setContent` suite is counted as covered by this HTML injection.

The aggregate log is `tests/output/skins-bevel-behavior.log`. Individual logs and the script hashes are in `tests/output/skins-bevel-behavior/results.json`. The suites ran serially, with no overlapping browser jobs.

## Focus finding

The minimal fixture renders an ordinary `.btn` on `.card`, using the same frozen candidate styles and generated Bevel CSS. The test captures its unfocused paint, presses Tab, verifies `:focus-visible`, and captures the focused paint. Text, fill and border colors remain unchanged. The external ring is the changing focus indicator.

The pixel regression measures every changed pixel outside the button's border rectangle within a five-pixel surrounding band. The strongest rendered contrast change is 1.522:1 in light and 1.529:1 in dark, in all three engines. None of the ring reaches the required 3:1. These are measurements of the rendered pixels, including alpha compositing, rather than a comparison against an uncomposited token.

The original frozen Standard stylesheet is rendered separately as a control. It also fails, at approximately 1.53:1. Its failure is retained as an inherited defect; the control is not a passing conformance baseline. Future corrections must preserve Standard expectations or explicitly handle its independent defect rather than replacing expected captures.

The initial focus log is `tests/output/skins-bevel-focus.log`, with observations and before/after screenshots in `tests/output/skins-bevel-focus`. The regressions are `focus-review.js` and `focus-pixels.py`. The current regression gates Bevel and records Standard as a control. If the approved indicator moves inside the control, the measurement needs a corresponding separately reviewed mapping.

The implementation contract currently preserves the focus treatment, while the approved proposal requires 3:1. The architect must resolve that boundary and provide a conformant Bevel focus candidate. Verification has not changed either the contract or shipped styles.

## Other gates

The corrected runtime independently passes 51 checks, recorded in [RUNTIME-REVIEW.md](RUNTIME-REVIEW.md). Standard preservation and the earlier Bevel surface, geometry and destructive-text checks remain recorded separately in [SWEEP2-BEVEL-REVIEW.md](SWEEP2-BEVEL-REVIEW.md).

Comprehensive status/category contrast, gradient coverage, clipping, RTL visual preservation, actual zoom, Linux, system/blocked fonts, manual assistive technology and release admission remain open. Passing the behavior suites does not close them. All browser and server jobs finished before this finding was sent back.
