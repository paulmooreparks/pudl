# Date picker nearest-owner independent review

The held nearest-owner correction passes independent revalidation. The original nested-picker candidate failures are closed for date and time, source and minified JavaScript, in Chromium, Firefox and WebKit. Prior tagged and candidate failures remain retained.

## Rendered and regression evidence

The unchanged nested-v2.cjs probe completes 36 observations. All 24 candidate choices retain their auto-popover owner; all six tagged pointer controls still close it. The raw probe exit remains 1 solely for those tagged failures. All 36 changed choices emit one input event followed by one change event on the original input. Before/after captures, state observations and served hashes are retained in tests/output/verification-date-owner-20261113-2002. The probe is byte-identical to the earlier independent script. Its CSS remains the unchanged normal stylesheet; full minified asset routing is covered separately by the regression runner.

The seven focused suites pass source 21/21 in 73 seconds and minified 21/21 in 83 seconds, serially on checked port 8895. Both terminal exits are 0. All 42 raw/effective suite records are zero, without printed failures or timeouts. The new owner suite covers pointer/keyboard date/time choices in auto popovers, modal dialogs and popovers inside a modal, plus child-first Escape, authored movement, reparenting, parent closure, reopening and refusal to open under a closed owner. Existing authored-relocation, owner-cleanup, validation, date, combo and toolbar-field suites remain included.

The additional independent extra.cjs passes twelve source/minified date/time combinations, terminal exit 0. It retains the earlier draft/echo/reset/detachment/dialog checks and adds event-contract observations. Rejected Enter, unchanged Enter and host refresh emit no original input/change pair; changed accepted Enter and clearing each emit exactly one pair in order. Submission is locally prevented in this probe so these event observations do not navigate. Existing tests separately cover native form behavior.

## Source and contract disposition

Initial placement, opening and relocation resolve the nearest dialog or popover ancestor. Reparenting closes an open picker first. Opening and focus return require a connected rendered field and available containing surfaces. Parent-close cleanup and manual Escape handling remain present. The incremental correction adds no pointer suppression, showPopover source-option dependency or host auto-opening. Existing pointer handlers elsewhere in the date component are unchanged.

The appended CONTRACT.md wording matches the commit implementation and observations. A changed committed value is stored on the named source before one bubbling input event and then one synchronous bubbling change event. Rejected or unchanged commits emit neither. Host assignment with refresh emits neither, and proxy typing is separate from committed source notification. The component makes no new automatic submission/navigation promise. Enter's ordinary native form behavior remains possible. These are component-dispatched events, so the wording does not imply trusted hardware events.

The correction preserves the earlier relocation and validation contract. Native capability differences, authoritative native constraint rejection, the fractional-date-step qualification, direct-source reporting limits and refresh before same-stack host validation remain explicit. Browser focus placement, assistive speech, actual browser-chrome zoom, hardware touch and deployed host behavior are not certified by these checks.

## Provenance and handback

The source SHA256 is 025aaa26e149911691f56d9e2da72f800445612e299a501942eb402bccd74471. The minified SHA256 is 228ccb02872f9fd2bd81b244384743fa449ae14060342679e1b3cd1bb2045439, and its map is efe3f7698aa012f942ba7ce2254ac10f61f969db9d35168c218347377e941d2b. CONTRACT.md is 99acc56a9c879ec05132f35dc4560f8e11464536ac270e9d20911896c9adc22b. before-independent.json contains actual measurements before execution; audit.json repeats them afterward with no held-file drift. Full logs, capabilities and runner directories are retained beside that audit.

All owned runners, browsers and servers have exited, and port 8895 has no listener. Execution ownership returns to the lead with PASS for the bounded correction. Packaging remains the lead's decision. No runtime, existing test, commit, release, installation or consumer file was changed.
