# Independent skin runtime review

The corrected runtime passes 51 independent checks across Chromium, Firefox and WebKit on Windows. This acceptance covers availability and preference behavior. It does not establish skin conformance or release readiness.

## Finding and correction

The initial complete run passed 45 of 48 checks. In every engine, setting a registered link's `sheet.disabled` property removed its paint while `current()` and `available()` still reported Bevel. The runtime checked the link's disabled flag but omitted the stylesheet's flag. The original results remain in `tests/output/skins-runtime-review2/results.json`.

The corrected runtime checks both flags and provides `refresh()` for CSSOM changes that have no corresponding DOM mutation notification. The host must call this documented API after such writes. `current()` also reconciles selection, while `available()` reads readiness without changing root attributes.

The regression verifies that disabled stylesheets leave the available list, reconciliation selects Standard, and re-enabling followed by refresh restores the retained preference. Repeated refresh calls do not emit duplicate change events.

## Coverage and identity

The independent harness is `runtime-review.js`. It checks loaded-sheet registration; invalid, reserved and disconnected registration; link disabling; removal; href and media revocation; media-query transitions; actual cross-tab storage events; unavailable preferences; blocked storage; and absence of network requests when selecting an unavailable skin. Selection preserves the mounted edited input, its value, text selection, focus, theme, URL and browser history length.

The corrected results are `tests/output/skins-runtime-corrected/results.json`, with the log at `tests/output/skins-runtime-corrected.log`. The reviewed runtime's SHA256 is `a3836f6edc6ecc8c722c31332ca9c2fe81931c6963ed00fcf36f481781bcae4d`. The actual browser versions are Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6.

The earliest probe was interrupted without producing a complete result. The harness was then given explicit operation deadlines and partial-result recording. That interrupted probe is not counted as a passing run or a product failure.

Runtime registration establishes availability only. Release admission must still ensure that offered generated files have passed the skin conformance gates. The Bevel interaction and accessibility review is recorded separately.
