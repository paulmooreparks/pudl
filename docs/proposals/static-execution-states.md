# Static execution states and host title chips

This change was designed and implemented on 1 November 2026. The implementation was first isolated for review and then combined with the skins and companion themes in 0.96.0.

## Contract

Working uses a solid right-pointing `play` triangle and the existing accent paint. Waiting uses `pause`, two solid bars, and warning paint. Idle uses the existing solid `square` and muted text paint. Stuck retains the warning triangle and danger paint. Every generated title, taskbar, dock, stack summary, stack row and folded status mark uses the same mapping. The legacy running attribute maps to static Play. Execution glyphs never animate, with either motion preference. The old `working`, `flag`, `ring` and octagonal `stop` glyphs remain available for other uses.

A window may set `data-win-state-title="none"`. Only that exact value suppresses the generated title execution chip and its execution row in Window status. Omitted, empty and unrecognized values preserve the default title presentation. Suppression frees the 24px title chip slot. It does not remove host `.win-status` chips, change their glyphs or words, or suppress taskbar, dock, stack rows or aggregate execution states.

Without suppression, the existing reservation remains present even when execution state is absent. With suppression, changes between execution states do not change header geometry or the folding threshold. Toggling suppression live performs the local header refit needed to free or restore the slot. Window bounds, body identity, edits and URL state remain unchanged. A live change refreshes an open status popover even when a shared dock hides the header. An execution row counts toward a configured row reservation only when it is included. Removing the last visible status closes the popover using the existing focus-return rules.

Whole-window replacement copies or removes the suppression attribute in the same way as the other public status attributes. PUDL owns the generated nodes; applications use the public attribute and their own status chips rather than editing generated chrome.

## Validation

The candidate must verify exact glyph shapes and static rendering under both motion preferences on every execution surface. Tests also cover legacy running, aggregation priority and counts, label/detail behavior, both themes, the admitted skins, forced colours, suppressed title geometry, live toggles, reserved rows, host chips and decorative glyphs, hidden dock headers, empty-popup focus return and whole-window replacement. Rendered 16px captures must be inspected.

Independent review precedes publication. The full normal and minified matrices and generated-asset checks run on a frozen release candidate. The archive and checksum are built from the immutable release tag and verified after download, with CDN byte verification and CI recorded separately. This candidate adds a public attribute and changes the documented glyph mapping, so the implementation release is 0.96.0 under `RELEASING.md`; the specification dependency is 0.52.3. Earlier drafts used 0.95.3 as a proposed release number. Publication remains conditional on the review and release gates.
