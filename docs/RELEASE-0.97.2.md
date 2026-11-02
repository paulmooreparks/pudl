# PUDL 0.97.2

This point release lets a status item give a tone its badge does not show. `data-status-tone` on a `.status-item` takes an execution state, `working`, `waiting`, `stuck` or `idle`, or a status class, `danger`, `warn`, `accent` or `positive`. When a folding status area picks the Status item's tone, it ranks these together with the folded badges' own tones, so the most urgent still wins. An item whose count reads 0 but which needs attention, such as a paused process, keeps its warning once folded, and its badge stays as it is. A change to the attribute is followed live.

## Validation

tests/status-fold.test.js gains checks that an item's tone gives the Status item its tone and glyph when no badge is more urgent, and that a more urgent badge still wins. It passed in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.2. Its immutable commit is bdcc7ddd64f21cba2ff82e27d1b975fa194e1f3a and its annotated tag object is 54da01a36ba7120e742c1a1d69ff1da620b8bdb4. The reproducible archive contains 420 files including all 183 dist files, occupies 6249533 bytes, and has SHA-256 ff42a7c9a37edd4a29742dde15be3032c128ea157540b1c6d80978ba8c9bfd8b. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JS files match their tagged bytes. Main's 25 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
