# Window stack candidate verification

The implementation candidate is `1d4f6b09ab3169759e54bd332aeffe2a499a615e` in the `pudl-window-stack` checkout. It is based on published PUDL 0.100.0 and its publication record. The candidate implements the contract in [WINDOW-STACK.md](../WINDOW-STACK.md). Its source commit also includes a launcher dismissal focus correction for Linux WebKit, where the native popover dismissal cleared focus that a destination had already moved outside the popup.

The integration assets are `dist/pudl-windows.js`, `dist/pudl-windows.css`, `dist/pudl-regions.js`, and `dist/pudl-launcher.js`, together with their generated copies and maps under `dist/min/`. No consumer files were edited. The glyph-first tray contract is inherited unchanged from the published base. Taskbar pinning remains outside this candidate.

## Completed checks

The eight core window suites passed in Chromium, Firefox and WebKit, for 24 passing source runs. The dock/API/region group passed 14 of 15 source runs. Its Firefox split-docks run timed out at `page.reload()` while waiting for the load event. The original failure is retained in `tests/output/stack-dock-source/firefox/split-docks/output.log`.

A diagnostic run of the same split-docks suite with browser tracing and request/lifecycle records passed on the released baseline and on the candidate. Each exercised all four dock edges. The candidate trace is retained in `tests/output/stack-reload-candidate`. These passes do not identify the original timeout's cause.

All 36 distinct focused window suites passed against minified assets across the three engines in `tests/output/stack-min`. The region-navigation suite's new assertions preserve stack state in both the live snapshot and URL. The stack-specific suite covers reload after repeated raises, normalization, detached snapshots, candidate URL purity, taskbar independence, minimized state, parent/child constraints, rekey and close, dock bands, delayed fragments, history and failed fragments.

## Remaining gates

Dinah owns the restart integration test against this exact candidate. Its test must compare saved and restored order, active window and rendered overlap, including delayed editor/chat loading and a user activating another window during loading. An explicit delayed editor-open helper can independently raise a window after another selection; PUDL stack persistence does not suppress host activation.

Full Linux CI is required before release. The published 0.100.0 publication run failed Linux WebKit's launcher destination-focus assertion and a dock-overflow hidden-tab list assertion. The candidate addresses the focus clearing. The dock-overflow result and the unexplained local Firefox reload timeout remain retained limitations until assessed. No claim of a clean full matrix is made here.
