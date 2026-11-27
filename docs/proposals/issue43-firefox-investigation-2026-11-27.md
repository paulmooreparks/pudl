# Firefox host launcher investigation

The first bounded investigation leaves issue 43 open. It establishes where the original operation stopped and rules out an unconditional failure of the released menu-mode title and hamburger sequence. It does not establish the historical cause or justify a product change.

## Original evidence

The original Firefox output stops at tests/host-launcher.test.js:36 while the first site glyph click is waiting for visibility, enabled state and stability. The locator resolved one menuitem with aria-expanded=true and the expected popover target. There is no recorded click dispatch or event-interception message. The saved failure image shows the hamburger and open launcher. A screenshot taken after a timeout cannot establish the geometry during that timeout.

The preserved originals are in the neutral-count worktree under tests/output/launcher-ribbon-20261126-6/firefox/host-launcher. Its aggregate records revision=null. It has no trace or failure-time computed-style/frame history, so exact historical source binding and the blocked actionability condition remain unknown. The published source must not be presented as an exact reconstruction of that run.

## Released-source observations

The follow-up worktree starts at be15ce340d4549625bdc091db9ead8fded5069ce. No product or existing test file changed.

| Observation | Evidence | Limit |
| --- | --- | --- |
| Firefox 155.0 completed title close, title reopen and first glyph close. | tests/output/issue43-20261127/released-first-glyph.json | One fresh context does not reproduce the historical failure. |
| The glyph retained a 26 by 26 rectangle at x=14, y=10, visible display and enabled state at each inspected boundary. The hit target was the glyph and no animations were returned. | The same JSON records DOM, computed styles, hit target and animation state. | Boundary samples do not prove historical frame stability. |
| The unchanged complete host-launcher suite passed with its ordinary 30-second click timeout. | original-with-trace.log and original-with-trace-result.json in the same output directory | The diagnostic wrapper enables tracing and therefore changes observation overhead. |
| The main browser context has a retained trace ZIP. | host-original-context-0.zip | A secondary clean context closed itself before wrapper teardown. Its trace stop error is retained in trace-errors.log; no secondary trace is claimed. |

The release's ribbon-only glyph CSS exception at dist/pudl.css:765 requires active ribbon and role=button. The original resolved glyph was role=menuitem. The synchronous tab guard at dist/pudl-launcher.js:321 applies to role=tab; the observed host identity is also role=menuitem. Neither correction can be cited as a demonstrated repair of this timeout. The current probe did not require ribbon mode, forced classes, a longer wait or retry.

## Proposed correction and next boundary

No product fix is justified by the available evidence. The concrete next correction should preserve the missing failure evidence in this single host suite. Its existing catch should save a JSON sidecar containing the matched controls' connection, disabled/inert state, computed display/visibility, rectangles, menu folding classes, launcher presentation, document visibility and center hit targets. A documented Playwright context trace should cover the next single Firefox run and be stopped before each context closes. Existing assertions, timeouts and click actionability checks should stay unchanged. Do not force the click or retry the failing action.

Playwright documents click actionability and tracing at https://playwright.dev/docs/actionability and https://playwright.dev/docs/api/class-tracing. These APIs support observing the failure without making a measured browser quirk part of the product design. If another failure is captured, classify the failed precondition from its trace and sidecar before changing product logic. A passing run alone leaves issue 43 open.

Issue 44 was not inspected or executed. This investigation made no release, issue-state or repository-history mutation. The follow-up branch owns only this note and ignored diagnostic files so far.

## Evidence correction

The candidate changes only tests/host-launcher.test.js and this note. It retains every assertion, click actionability check and timeout. It retains glyph handles immediately before the first click so a failure can describe retired controls as well as every current locator match. This adds one handle query per host kind; the JSON and screenshot collectors run only after failure.

PUDL_HOST_TRACE=1 enables suite-local screenshots, snapshots and source tracing. The default path does not start tracing. Tracing adds observation overhead and may affect scheduling, so traced passes cannot establish that the intermittent defect is repaired. The main context and the separate shared-page context are explicitly owned. Each trace stops before its context closes; final cleanup also covers failures before the shared-page close.

Every evidence collector catches its own failure. The catch rethrows the original test error, and cleanup cannot replace it with a screenshot, JSON, trace-stop or browser-close error. Collection failures are printed separately. The failure sidecar records original error identity text, matched and retained controls, connection, inert/disabled/hidden states, computed visibility and rectangles, center hit targets, document visibility, menu folding classes and launcher presentation. DOM data comes only from the invented host studies.

The controlled diagnostic is separate from candidate acceptance. Its first setup used the default server address because the harness required the shared library before setting PUDL_ROOT. That setup failure is retained under controlled-failure and supplies no product result. The corrected harness under controlled-failure-valid injects one sentinel at the first glyph click, retires its original node and replaces it with a disabled/inert clone. It makes screenshot collection reject, makes JSON collection reject after writing its sidecar and makes trace collection reject after saving its ZIP. The original sentinel reaches both error reporters by object identity and the process exits 1. This exercises failure handling without modifying the suite's assertions or product source. It does not reproduce issue 43.

The frozen single-suite run is under tests/output/issue43-evidence-correction-20261127/frozen-run. Its exact candidate hash is recorded before execution in frozen-before.json. The final handoff records actual child receipts, trace ZIP CRC checks and the unchanged candidate hash. Earlier diagnosis files and original failed evidence remain untouched. No commit or publication is included in this handoff.

## Required teardown correction

Independent review found that the first evidence candidate swallowed required context/browser close failures after a successful test body. That candidate and its original evidence remain retained. The corrected candidate separates required cleanup from optional diagnostics. It stores a primary body error, attempts each remaining owned context close and browser close once, and reports cleanup rejections separately. If the body already failed, its original error object survives. If the body passed, the first real required cleanup error propagates after all remaining cleanup attempts. Shared-context early close is tracked so cleanup does not retry it.

The new controlled records are separately labeled primary-chromium, context-chromium and browser-chromium under tests/output/issue43-teardown-correction-20261127. They inject an existing primary failure with both close operations rejecting, a successful body with required main-context close rejecting, and a successful body with browser close rejecting. Each retains its expected nonzero receipt and original error identities. The normal single-suite runs use tracing off, with a trace-start tripwire and a recorded zero invocation count. Their context and browser close attempts are also recorded.

Retained-handle queries add normal-path protocol, scheduling and memory overhead even when tracing is off. Only the JSON/style/hit/screenshot capture is failure-only. Opt-in traces add further observation overhead. None of these controlled or normal results establishes the cause of issue 43, and issue 44 remains stopped.
