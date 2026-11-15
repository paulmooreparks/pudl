# Independent shared-topbar correction review

Verification reviewed the held candidate in `C:/Users/paul/source/repos/pudl-topbar-fixes`, branch `fix/topbar-fitting`, against v0.107.1 commit `e2c05a919dba47ead103b0940e51f3d8200fb01a`. The original tagged red evidence and assessment remain unchanged. No candidate runtime or existing test was edited.

## Reproduction and source assessment

The original native-file pages now pass both assertions in Chromium, Firefox and WebKit using actual isolated readable and minified distributions, for twelve passing assertions and terminal exit 0. Loading at 220px then widening to 1400 restores all five direct commands, matching a fresh wide load. At 700px the enhanced shared menubar/toolbar stays on one row without ribbon opt-in. Complete fonts are copied with the candidate. Exact page/capture states and browser versions are in `tests/output/verification-topbar-candidate-20261113-1417/results.json`.

The diff addresses the measured causes. Intrinsic measurement resets all helper-owned group stages before applying authored visibility filtering. Generated stage-5 hiding therefore no longer excludes group contents from full-width bounds. Authored hidden attributes and host display:none remain effective. Every previous stage and More state is restored after measurement. The change does not redefine keep/end ordering or make hidden commands available.

The generated `toolbar-fold-ready` class is added only after fold controls have been constructed. Single-row clipping is scoped to that enhanced state. Before enhancement, toolbar groups can wrap within the available width. The shared-topbar no-wrap selector is also gated on an enhanced menubar and shared foldable composition, so a script-disabled page retains wrapping. This is generated state, not a new host configuration API. Menu and menubar scripts remain tag-identical.

The native no-script 220px capture was inspected and shows all five original buttons within the toolbar width. Focused regressions also check no-script bounds, authored hidden/CSS-hidden groups, repeated forced measurements, repeated narrow/wide cycles, end groups, RTL, folded-menu keyboard opening/Escape, toolbar fields, ribbon and menubar behavior. This does not add a visible no-script site menu: the original source list is still authored hidden and requires a host fallback. Demo button visibility is not proof of a PFO server action.

## Accounting and bytes

The scoped correction disposition is PASS. Source regressions pass 27/27 in 85 seconds and minified regressions pass 27/27 in 86 seconds, terminal exit 0 for each. All 54 raw/effective exits are zero, with no printed failures or watchdog timeouts. Held file/test hashes and both isolated runtime copies match after execution. The selected suites are topbar-fitting, toolbar-fields, toolbar-fold, toolbar-refit, toolbar-work, menubar-application, menubar-ribbon, menubar-toggle and ribbon-tab-tips. No unrelated browser matrix was repeated.

All held candidate paths and the eight existing regression test files were hashed before execution. `tests/output/verification-topbar-candidate-20261113-1417/audit.json` binds before/after values, isolated-copy parity, terminal exits, printed failures and timeout flags. The same directory contains the native-file probe, captured results, complete asset copies and images. Existing server-runner logs remain under unique `verification-topbar-regression-source-20261113-1417` and `verification-topbar-regression-min-20261113-1417` directories in the candidate worktree.

| Readable asset | SHA-256 |
| --- | --- |
| dist/pudl-toolbar.js | 6baf776897b8e97ea6de9bfeb3efb8fca4df15eaaaa63b39278ffec1f76960ae |
| dist/pudl.css | 4a22b5ce602813da099ffb9908420cde1d8678171218c3ae989cd0fe9b8b494d |
| dist/pudl-menu.js | 2b1eb8c36e555669c5074789234f4e082efb28f8d41d8ea1d2c72776d5dae524 |
| dist/pudl-menubar.js | 96f16512f8c643face76165c8d210f2518f879f896ccc667a964002ba36f2b86 |

The audit includes the minified files and maps. This review covers current pinned browser engines and focused synthetic/demo pages. Older supported engine releases, actual screen-reader output, browser-chrome zoom and deployed PFO behavior remain unproved. No runtime implementation, commit, packaging, release, installation or restart was performed by Verification.

All owned runners and browsers have exited, and the isolated server on port 8799 has stopped. Verification returns the scoped disposition to PUDL Team Lead before proceeding to the queued combo review.
