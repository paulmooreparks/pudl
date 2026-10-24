# Track open panels during resize

PUDL's menu script previously searched the entire document on every window or visual-viewport resize and captured scroll event to discover whether any menu or popover was open. A second document search enumerated panels before repositioning. Long mounted histories made the no-menu path expensive even though there was nothing to move.

The implementation seeds a set from panels already open when the script initializes. Captured `beforetoggle` events add opening panels and remove closing panels. Resize and scroll handlers schedule at most one animation-frame callback and visit only tracked panels. The callback removes disconnected or closed entries before positioning, including entries left by cancelled openings. Rapid close and reopen sequences do not rely on one `toggle` event arriving for every transition.

Panels must carry their `.menu-panel` or `.popover` class when opened. PUDL's constructors and documented markup do so. The implementation uses documented native popover events and `:popover-open` state. It introduces no application-specific selectors or attributes.

## Evidence

The synthetic selector benchmark uses 21,000 rows and 189,118 DOM elements across 24 viewport sizes. Substituting only the tagged 0.83.1 menu script produced 46 discovery calls totaling about 314.2 ms. The tracked implementation produced zero discovery calls. The diagnostic wraps selector methods and therefore is intended for attribution rather than unbiased wall-time comparisons.

Dinah Development independently reports four alternating profiled renderer runs on four real saved histories with 21,034 rows and 177,510 DOM nodes. Baseline resize wall times were 4,800 and 4,705 ms; menu-only candidate times were 3,062 and 3,112 ms. Script time changed from 1,808 and 1,893 ms to 508 and 426 ms. The first baseline CPU profile attributed 1,205.664 ms to `querySelector` called by `placeOpen`; the candidate removed it from the sampled hotspots. These are application-agent measurements from an authenticated Edge HTTP equivalent with provider opens blocked, not independently reproduced PUDL measurements or native WebView2 composition results.

The reported application candidate has SHA-256 `f38f61a70f24acf91a5c897c3ed79ee2442b975db79b792cf99f00336c9a0734`. Restore remains dominated by style work, and this fix does not establish that startup is solved. Dinah's candidate substitution remains test-only until its agent adopts an authoritative revision.

## Verification

The regression suite checks closed-menu resize behavior, repositioning after viewport changes and scroll, close and reopen, removal, dynamic replacement, cancelled opening, rapid close and reopen, and an already-open panel when the script loads. Existing menu fitting and context-menu suites cover the surrounding placement and interaction behavior. The ribbon chooser and outline-resize work remain separate from this fix.

The menu tracking, fitting and context suites pass all nine engine/suite runs on Windows against readable assets and all nine on Linux against minified assets. The expanded tracking suite also passes against minified assets in all three engines on Windows. The minifier consistency check and whitespace checks pass. The source script's SHA-256 matches the candidate measured by Dinah Development.
