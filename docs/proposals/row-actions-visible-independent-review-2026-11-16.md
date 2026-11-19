# Independent review of always-visible row actions

I recommend REVISE for one bounded accessibility finding before release assembly. Visibility, ordinary button traversal, geometry and menu behavior pass the scoped review. Empty naming attributes and an unresolved labelled-by reference suppress the new fallback and leave empty glyph buttons unnamed.

This review answers assignment 10102 against `C:/Users/paul/source/repos/pudl-row-actions-visible`, branch `fix/row-actions-always-visible`, based on `ad46b82c7dbe78b627b38f8bcb0e1d9b7a96a6c7`. The engineer retains byte custody. I made no candidate, commit or publication change.

## Required correction

At `dist/pudl-menu.js:979`, the fallback tests attribute presence rather than whether the supported naming input supplies a name. These three dynamically inserted buttons all remain unnamed after initialization:

```html
<button data-row-actions aria-label=""></button>
<button data-row-actions title=""></button>
<button data-row-actions aria-labelledby="nonexistent"></button>
```

All three produce the Playwright accessibility snapshot `- button` in Chromium, Firefox and WebKit, using both source and minified bytes. The six observations per case are preserved in `probe-results.json`. Valid authored aria-label, labelled-by, title and text names remain intact in the passing controls.

The approved contract requires a meaningful fallback for empty glyph-only buttons. Supply that fallback for the demonstrated empty/unresolved cases while preserving valid authored naming and labelled-by precedence. Include whitespace-only naming inputs in the bounded correction. An absent target must not require deleting its authored reference; a later valid target can retain its normal precedence. Document the supported fallback rule and add regression cases for the actual defect. This recommendation does not require a replacement implementation of the complete accessible-name algorithm. The [W3C accessible-name rules](https://www.w3.org/TR/accname/) distinguish usable ID references and nonempty labels from attribute presence.

## Verified behavior and test correction

I independently replayed all nine affected suites, serially, across source/minified forms and all three engines. All 54 child executions passed with matching raw/effective zero exits, no printed failures and no suite deadlines. Six menu-open-tracking executions intentionally have no output log. Generated freshness verifies all 48 copies; whitespace checking exits zero.

My separate probe records both themes, pointer-away rest visibility, 24px geometry, unchanged hover/focus/selection positions, actual forward/reverse Tab sequences, dynamic insertion, valid authored naming, disabled/hidden/inert exclusion, Enter/Space opening and Escape focus return. Each engine/form reaches every enabled action in both directions. Both themes were captured, and I visually inspected the Chromium light/dark reference views. A separate correctly addressed menuitem activation check passes all six engine/form combinations.

The engineer's WebKit correction removes an assumption that reverse Tab must return to a link. [Apple documents configurable Tab-to-link behavior](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac). That documentation does not establish a universal default for this Windows WebKit port. The correction is acceptable because the final test separately requires all seven action buttons in both directions, and my independent sentinel-to-sentinel traversal proves those buttons are not skipped. The original failing link assertion remains preserved.

## Delta, identities and accounting

The held 181-entry manifest remains `a6e6407c490b7d03bc5b797ae94426a3d76319402202994ffb7cf2437e2a98a6` before and after review, with zero entry mismatches. The 910-file baseline comparison finds exactly nine tracked changes: six menu/base-CSS source/generated assets, README, CONTRACT and the existing row-actions test. The new owned test and implementation/handoff documents are separately inventoried. No unrelated baseline file changed. The existing test replaces the superseded hiding/Tab-exclusion assertions while retaining menu placement, ownership, closing and touch checks and their waits. Roving tree/list handlers target their item links rather than these action buttons.

| Reviewed asset | SHA256 |
| --- | --- |
| dist/pudl-menu.js | c6a4a0db53b1fec7a1010ce24d7b8431dc9ca1e857348913aeeebbca37e2b50a |
| dist/min/pudl-menu.js | 0f56ed148794d10dbc95f8d4c7c5d8a041a62086e1d17ced7b25c1cfca9eeb4b |
| dist/pudl.css | 050f2d8a21120d81a1bab0e7855e5a06da0aa523992d47efbe465f198ef0dc97 |
| dist/min/pudl.css | ccee6ec56d4a695b70409c32b05afc3b3d4a8f33603b0926edaedbd0f81e281d |

The independent server records matching response hashes for these assets in every engine/form. Minified routing changes only exact dist JS/CSS paths and rebases CSS resource URLs as the repository harness does. A favicon 404 is retained; it does not affect the asset checks.

The engineer's historical 66 records reconcile to 65 passes and one initial WebKit failure. All 60 final executions pass. The retained accounting also distinguishes silent successes and the initial audit assumption about missing logs.

Independent evidence is under `tests/output/verification-row-actions-20261116-0905`. My first launch produced 27 raw/effective dependency failures before browser startup because NODE_PATH was missing. I retained them and supplied the existing primary dependency directory without installation. The subsequent source/minified regressions pass 54/54. The owned six-run probe retains 84 boolean assertions: 24 initial expectation failures are classified against the fixture's actual DOM order, six assertions expose the naming defect, and 54 pass. The correct native order is Alpha, Beta, Gamma, articles, site, One, Two because the parent action follows its child list. All 24 recorded sequences match that order or its reverse. No browser repeat was needed to establish this classification.

The same owned probe has six 30-second locator timeouts because I addressed a menuitem as a button. These are probe defects, not candidate regressions. The corrected activation-only control passes 6/6 without changing waits or candidate bytes. Raw evidence remains intact. Initial path setup errors are tool setup failures and started no test child. This review makes no clean-matrix claim for the owned probe.

All runners exited and owned browsers/servers closed. Ports 25361 and 25362 have no listeners; no unrelated process was terminated. Manual assistive-technology and physical-input verification remain unperformed. The prior release and other held candidates remain separate. PUDL Team Lead should disposition the bounded naming correction and assign its implementation before any release assembly.
