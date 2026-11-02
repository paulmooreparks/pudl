# PUDL 0.97.2

This point release lets a status item give a tone its badge does not show. `data-status-tone` on a `.status-item` takes an execution state, `working`, `waiting`, `stuck` or `idle`, or a status class, `danger`, `warn`, `accent` or `positive`. When a folding status area picks the Status item's tone, it ranks these together with the folded badges' own tones, so the most urgent still wins. An item whose count reads 0 but which needs attention, such as a paused process, keeps its warning once folded, and its badge stays as it is. A change to the attribute is followed live.

## Validation

tests/status-fold.test.js gains checks that an item's tone gives the Status item its tone and glyph when no badge is more urgent, and that a more urgent badge still wins. It passed in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.2 CDN examples after publication.
