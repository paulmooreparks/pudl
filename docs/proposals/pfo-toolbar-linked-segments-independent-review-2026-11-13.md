# Folded native linked segments independent review

The held linked-segment correction preserves native anchors in folded groups. Both unchanged original probes now close the candidate failures across Chromium, Firefox and WebKit; tagged controls retain their missing-link failures. The incremental source diff is reviewed against the approved six-file topbar overlay, rather than treating the old tag as the complete baseline.

## Source and contract review

Direct segmented anchors produce anchors with menuitem roles and retain native navigation attributes, accessible naming/description metadata and aria-current. They do not acquire button-choice checked state. Disabled or destinationless choices lose href and expose aria-disabled. Descendant IDs and inline handlers are stripped from the semantic copy, and command/toolbar binding internals are excluded. Original source listeners are not forwarded. Document-delegated handling receives the visible anchor's event.

Visibility inspection temporarily resets only generated group stages, while still checking authored hidden/display/visibility state within the group. It intentionally does not suppress an inactive ribbon tab's choices because that toolbar's generated presentation is hidden. The focused tests cover authored hidden links and CSS-hidden segments, generated folding stages and inactive ribbon choices. This is bounded coverage, not a claim about every possible host stylesheet.

The live map reuses surviving native rows, updates attributes/current state, removes missing or unavailable destinations and retains focused identity. Lost component focus falls back to an eligible row or the visible opener when the menu empties, while outside focus is preserved. Deferred resize return restores a visible native source only while focus remains component-owned; navigation exempts that recovery. Per-segment observers disconnect when the menu closes, and generated menu mutations/stage probes are filtered from their own update work. No feedback-loop failure was observed in the focused execution.

The overlay comparison confirms that the approved CSS, minified CSS and CSS map are unchanged. Only toolbar JavaScript and its minified copy/map differ within the six runtime overlay files. The incremental change is segment rendering, live reconciliation and focus recovery. The earlier topbar allocation assessment remains separate, as do generic popup focus-entry and unimplemented planner/field requests.

## Original probe and native behavior evidence

Evidence is tests/output/verification-toolbar-links-20261113-2140. Separate source and minified copies of the original probe remain SHA256 7025c63890b3761923919e944e64d4ed75ace7a60feee7429b294248c3659ca2. Each probe retains raw exit 1 for three tagged controls with zero folded anchors. Each corresponding candidate control exposes both anchors with menuitem roles. The isolated replay uses copied frozen assets, whose toolbar bytes are independently checked against the held candidate.

The focused native-link suite exercises same-page navigation, Enter, target-blank destination creation, Control-click creation through the browser-context page event, and a download event with the authored filename. It separately checks order, href/target/rel/download, aria-current, button radio state, disabled destination removal, live naming/destination/current updates, authored hiding, insertion/removal, empty-menu focus, outside focus and deferred resize return. RTL restoration and end-group behavior remain in the focused set, alongside original fitting fixtures and ribbon regressions.

The delegated metadata/listener checks establish routing eligibility and one observed delegated event, with no forwarding of the source listener. They are not a new end-to-end region-fetch proof. Browser-context new-page events and destination assertions establish the observed modified-navigation behavior in these profiles; they do not certify every OS modifier policy, keyboard layout, hardware touch path or actual screen-reader speech. The download check observes the native event and filename, not an archive-integrity guarantee.

## Provenance

The source SHA256 is b0dff61de791b3dcc86464d63c61a2696000315cd75904588bfdc68effdd3894. Minified SHA256 is 64993a81e4db1486c849f130c500ed922d26368ab5001fe42ea393337ffe9003; its map is 3a4becd94115d62727012eed319374ace8fb5e65d400b51344c88f2eb2c2f5b4. before-independent.json contains actual held runtime, documentation, test and fixture measurements. audit.json repeats them afterward with no drift and records the exact six-file overlay comparison.

## Final accounting and handback

The final-byte full focused set passes source 24/24 in 80 seconds and minified 24/24 in 82 seconds, serially on checked port 8905. Both terminal exits are 0. All 48 raw/effective records are zero with no printed failures or timeouts. This independently closes the engineer's final-source full-regression evidence gap after the opener-fallback branch. Original-probe tagged exits remain 1 and are accounted separately from zero candidate failures. Complete runner directories, logs and captures are retained.

All owned runners, browsers and servers have exited, and port 8905 has no listener. Execution ownership returns to the lead with PASS for this bounded correction. Packaging remains the lead's decision. No runtime, existing test, archive, commit, release, installation or consumer file was changed.
