# Date/time correction independent review

The held date/time correction requires revision before packaging. The new validation behavior works in the supplied required-date page, but moving an authored input into a disabled fieldset's first legend leaves its generated field behind. This breaks effective disabled parity and removes the visible field from native reporting. The failure occurs for both date and time in source and minified assets across Chromium, Firefox and WebKit.

## Structural blocker

The independent probe enhances a required date or time input within a fieldset, disables the fieldset, moves only the authored input into its first legend, then calls public refresh. After two animation frames, the source is enabled with willValidate=true, while the proxy remains disabled with willValidate=false. Form reportValidity returns false and emits only the cancelled source invalid event. Focus remains on the outside button. The described echo contains the error, but that does not restore the proxy's reporting eligibility.

The source synchronization block relocates generated content only when source and proxy form owners differ. Both elements still belong to the same form in this case, so that condition cannot reconcile their different fieldset semantics. The supplied first-legend test explicitly moves the source, generated wrapper and echo together. Hosts must be able to move only their authored input and refresh it. Correct placement must preserve the pending draft, echo relationship, picker owner and reset binding when crossing forms or fieldsets, including removal and reinsertion.

The first-legend exception follows the documented HTML disabled-control rules; it is not a measured browser exception. The relevant definitions are in the [HTML form-control infrastructure](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#concept-fe-disabled). Interactive reporting and its browser-owned presentation are separately specified in [constraint validation](https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#interactively-validate-the-constraints).

## Supplied page and validation behavior

The supplied date JavaScript and CSS match raw v0.107.1 blobs at e2c05a919dba47ead103b0940e51f3d8200fb01a. The original HTML is preserved as supplied.html; the probe changes only resource URLs for isolated HTTP serving. This is not native file-opening evidence. The page has no novalidate attribute.

The tagged page produces a hidden-source focusability console message for ordinary submit, scripted reporting and dynamically enhanced submit in all three profiles. Each path also reaches an eligible visible invalid field, and observed focus lands there. These observations do not establish the reported claim that scripted reporting has no usable target. The original ordinary-submit claim remains withdrawn.

Against source and minified candidate assets, all eighteen supplied-page observations retain source-only invalid cancellation and an uncancelled eligible proxy, block submission and expose the required feedback through the described echo. No console or page errors occur in these candidate page observations. Observed focus lands on the proxy, but focus placement is browser-owned. Reporting eligibility and cancellation are verified separately from focus.

The separate date/time probe confirms static checking keeps outside focus and records authored/effective type. Chromium and Firefox expose native date/time types; this WebKit profile exposes text. The structural failure remains present in all of them. Its twelve failures, screenshots and terminal exit 1 are retained without weakening the assertions.

## Source assessment and limits

The correction synchronizes draft validity before commit events and uses guarded reset tickets, cancellation checks and owner checks. Refresh intentionally discards a local draft in favor of the supplied source value. That explicit contract must remain distinct from preserving local state during internal placement repair. Direct source validity calls describe committed native state and cannot validate another element's draft. Host-owned silent mutations require refresh before immediate form validation.

The exact arithmetic follows Gregorian day quantities, millisecond time quantities and min/value/default step bases. The [HTML input definitions](https://html.spec.whatwg.org/multipage/input.html#attr-input-step) provide the constraint basis, including overnight time ranges. The supplied capability records retain native rejection separately from the component lattice. A fractional date step accepted by the arithmetic can still be rejected by the native source, and that rejection remains blocking. This limitation does not waive invalid drafts or unsupported-type constraint checking. Existing seconds, milliseconds and large native years are covered without expanding typed parsing.

The owning-surface cleanup uses close/beforetoggle events and a filtered document observer. The focused owner suite covers date/time in popovers and modal dialogs, including no component focus call into a closed owner. Broader Escape, arbitrary CSS visibility and detached lifecycle combinations are not independently certified by that suite. Placement repair must reconsider those relationships rather than assuming a visible generated wrapper still represents a connected authored input. No screen-reader speech, manual browser-chrome zoom or deployed host integration is certified.

## Provenance

The source SHA256 is 6ead75d6fdb6c173e2fdf48488f4936612a89817b9215e9e0395412c2e56f4a4. The minified SHA256 is 50cff2f14158f990af94f1f38446b8bb4f6dbbee11f629a3754982366f3e71b4, and its map is e858e2da0c81508ff117f4a2a0310c12d1ce89d25f1ef05d98ec147dbefd20e5. Evidence is retained in tests/output/verification-date-candidate-20261113-1502. before-hashes.json preserves the supplied hold manifest at review start. The probe records actual served JavaScript hashes, and the final independent audit matches all runtime, README, fixture and regression-test bytes against that manifest. The map and test baseline were supplied hashes rather than a separate initial independent measurement.

## Final handback

The five focused suites pass 15/15 source in 57 seconds and 15/15 minified in 48 seconds, serially across all three engines. Both terminal exits are 0. All thirty suite records have raw/effective exit 0, no printed failure and no timeout. They include rejected and pending drafts, external ownership, cancelled and superseded resets, owner cleanup, existing date behavior, combo and toolbar fields. These successes remain separate from the independent probe's twelve structural failures and terminal exit 1. audit.json also checks all eighteen candidate supplied-page observations against cancellation, reporting eligibility, feedback and blocked-submission conditions without counting observed focus as a contract guarantee.

Full runner directories, capabilities, logs, captures and probe source are retained in the independent evidence directory. No held candidate or existing test bytes changed during this review. All owned browser runners and servers have exited, and port 8881 has no listener. Execution ownership returns to the lead with REVISE disposition. Packaging remains blocked until the placement correction is independently revalidated. No runtime, existing test, commit, package or installation was changed.
