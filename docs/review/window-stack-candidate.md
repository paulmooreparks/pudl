# Window stack candidate verification

The initial implementation candidate is `1d4f6b09ab3169759e54bd332aeffe2a499a615e` in the `pudl-window-stack` checkout. It is based on published PUDL 0.100.0 and its publication record. The candidate implements the contract in [WINDOW-STACK.md](../WINDOW-STACK.md). Its initial launcher focus correction was insufficient. The Linux investigation below identified the cause in Start's queued open notification.

The window integration assets are `dist/pudl-windows.js`, `dist/pudl-windows.css` and `dist/pudl-regions.js`, together with their generated copies and maps under `dist/min/`. The final focus correction additionally changes `dist/pudl-start.js`. The initial candidate's attempted `pudl-launcher.js` correction was removed after source attribution. No consumer files were edited. The glyph-first tray contract is inherited unchanged from the published base. Taskbar pinning remains outside this candidate.

## Completed checks

The eight core window suites passed in Chromium, Firefox and WebKit, for 24 passing source runs. The dock/API/region group passed 14 of 15 source runs. Its Firefox split-docks run timed out at `page.reload()` while waiting for the load event. The original failure is retained in `tests/output/stack-dock-source/firefox/split-docks/output.log`.

A diagnostic run of the same split-docks suite with browser tracing and request/lifecycle records passed on the released baseline and on the candidate. Each exercised all four dock edges. The candidate trace is retained in `tests/output/stack-reload-candidate`. These passes do not identify the original timeout's cause.

All 36 distinct focused window suites passed against minified assets across the three engines in `tests/output/stack-min`. The region-navigation suite's new assertions preserve stack state in both the live snapshot and URL. The stack-specific suite covers reload after repeated raises, normalization, detached snapshots, candidate URL purity, taskbar independence, minimized state, parent/child constraints, rekey and close, dock bands, delayed fragments, history and failed fragments.

## Remaining gates

The consuming host owns its restart integration test against this exact candidate. Its test must compare saved and restored order, active window and rendered overlap, including delayed editor/chat loading and a user activating another window during loading. An explicit delayed editor-open helper can independently raise a window after another selection; PUDL stack persistence does not suppress host activation.

Full Linux CI is required before release. The published 0.100.0 publication run failed Linux WebKit's launcher destination-focus assertion and a dock-overflow hidden-tab list assertion. The candidate addresses the focus clearing. The dock-overflow result and the unexplained local Firefox reload timeout remain retained limitations until assessed. No claim of a clean full matrix is made here.

## Linux attribution

Linux WebKit reproduced both failures locally using the pinned Playwright 1.63.0 container under the shared browser lock. The retained event trace in `tests/output/linux-webkit-diagnostic/webkit/launcher-feedback/screenshots/focus.json` shows destination focus moving to the outside button, followed by a queued Start open-toggle handler focusing the filter again. The feedback timer then hides that focused filter. The attempted dismissal-time focus correction could not repair focus that had already been stolen earlier; it was removed.

Start now captures the focused element before opening and performs its deferred initial-focus move only if focus is still on that same element. Programmatic opening retains its synchronous initial focus. The regression activates a destination in the same script task as opening, before the queued toggle notification. The focused Linux regression passes in `tests/output/linux-webkit-focus-correction`.

The dock-overflow suite sampled layout after a timer without waiting for the animation frames that update overflow controls. Waiting for those rendering frames made the unchanged production dock implementation pass on Linux WebKit in `tests/output/linux-webkit-dock-frames`. The test still asserts the exact hidden-tab list, count and button visibility. No production dock workaround or longer arbitrary delay was added.

## Integration and follow-up checks

The consumer's Edge integration passed against frozen tip `09bb8ab` with readable and minified assets. Four fresh-context restorations exercised saved stack, active window and rendered overlap with delayed editor/chat readiness and intervening activation. No startup editor-focus event occurred. The native bridge was stubbed, so this establishes the frontend restoration path rather than a native executable restart. The consumer retains its fixture and evidence in its isolated checkout's `docs/plans/window-stack-persistence.md`.

The launcher correction passed 12 source and 12 minified focused runs across the three engines. The public stack sample passed reload and screenshot checks in both themes. These records are in `tests/output/stack-launcher-regression`, `tests/output/stack-launcher-min` and `tests/output/window-stack-{light,dark}.png`.

The first candidate CI run caught an inventory mistake in this document's companion contract and a fixed-sequence URL assertion in the older regions suite. Stack persistence is window state rather than an additional component; its contract now lives in the window URL section. The navigation test now checks the actual parameter values, including `z.order`, independently of their serialization sequence. The corrected component, regions and dock-overflow suites passed all nine focused source runs across the three engines in `tests/output/stack-ci-contract-source`. The original CI failures remain available in run `42187820330`.

The final Start correction passed all 21 source and 21 minified focused Windows runs in `tests/output/start-focus-source` and `tests/output/start-focus-min`. Linux WebKit passed all ten source and ten minified focused runs in `tests/output/linux-webkit-final-source` and `tests/output/linux-webkit-final-min`. These include the same-task open/activation regression. Window script, window stylesheet and region script bytes remain identical to the consumer-verified `09bb8ab` candidate.

CI run `42190204734` passed the full readable Chromium and Firefox suites and the full minified Chromium suite. Its WebKit run failed a sidebar resize assertion after a fixed 200 ms delay and timed out waiting for standalone applet commands after a redundant navigation to the just-opened page. The latter page and its menu/applet scripts are unchanged from 0.100.0. Isolated Linux WebKit runs of the candidate and released baseline both passed the three relevant suites, retained in `tests/output/linux-webkit-new-failures` and the baseline checkout's `tests/output/linux-webkit-baseline-comparison`. Those passes do not establish the timeout's cause.

The sidebar test now waits for its advertised maximum to match the resized layout before checking the value. The menu test checks the standalone page reached by its actual Open as a page command, without a second navigation to that same address. Neither change modifies production behavior or removes the menu execution and cleanup checks. The original failures remain retained in the CI run and downloaded artifacts.

## Prepublication acceptance

Run `42192334141` passed all 140 readable Chromium suites, all 140 readable WebKit suites and all 140 minified Chromium suites, plus font generation and minified freshness checks, on `bc03cba`. Run `42190204734` passed all 140 readable Firefox suites on `5bdc36f`. `git diff 5bdc36f bc03cba -- dist` is empty, so these results cover identical production assets. The three suites affected by the test-only changes also passed on local Linux Firefox in `tests/output/linux-firefox-final-navigation` and Linux WebKit in `tests/output/linux-webkit-final-navigation`.

The remaining Firefox job for `bc03cba` was still installing its browser when publication was prepared. Acceptance uses the complete Firefox run on identical production assets together with the focused verification of the revised tests; it does not report that pending job as passed. No further production change followed these checks.
