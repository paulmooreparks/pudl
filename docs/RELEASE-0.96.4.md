# PUDL 0.96.4

This point release adds an execution-state badge that hosts may use, draws a taskbar stack's rows with it, and gives those rows a menu row's metrics. Paul approved the three changes on 2 November 2026 after an adopter asked for them, and the lead implemented, reviewed and published them from the primary checkout.

A `.badge` with `data-state` of `working`, `waiting`, `stuck` or `idle` leads with the state's static glyph in the state's colour, the same glyph and colour the window system draws, and the words inside are the host's. A stack row's state mark is now that badge, at the row's end before Close, with the words from `data-win-state-label` and the full state in the row's name and tooltip. It sits in a column of fixed width, 12em capped at half the row, so a change of state or words moves nothing else in the row, and a row with no state keeps the empty column. The stack panel sets `text-sm` type of its own instead of inheriting the body's, and a row has 6px by 14px padding and a 14px glyph, standing 32px tall where it stood 36px. The taskbar button and title bar are unchanged.

## Validation

The new suite tests/stack-state-chip.test.js checks the host badge's glyph and colour for all four states, a row's height, type, padding and glyph size, the badge's class, state, words, size, weight and place between the title and Close, the empty column of a row with no state, that a change of state and words leaves the title and column where they were, the row's accessible name, that the taskbar button's own mark is untouched, and the absence of page errors. It passed in Chromium, Firefox and WebKit with the taskbar-stacks, taskbar-stacks-full, window-status, window-icon and dock-tab-menu suites. Light and dark captures of the stack popup were reviewed by the lead. Generated minified copies pass the freshness check.

Under Paul's minimal-testing direction for this batch no whole-project matrix, independent second review or negative control was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Limits

The badge's words truncate within the fixed column when they are long; the full words remain in the row's name and tooltip, as before. A host that had set the stack panel's font size itself should remove that rule after adopting this release, since the panel now sets its own. Forced-colours mode draws the badge as it draws any badge, with a CanvasText border.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.4. Its immutable commit is d8353a6715c91fd6c6995b2760c4bf370fdcb652 and its annotated tag object is 0fc36e399a86887126bf5e224300e09c16f59fcb. The reproducible archive contains 405 files including all 180 dist files, occupies 6187943 bytes, and has SHA-256 6514a46fda22f5afba7f232001ac338d124e28008b1206e236b4d23a8fb232c0. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 97 versioned CDN CSS and JS files match their tagged bytes. Main's 24 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.

A tag v0.96.4 was pushed for about a minute on the previous commit 5ca0c10 by a broken command sequence, before any release object or archive existed, and was deleted and re-created on the release commit above. No artifact was published from the misplaced tag.
