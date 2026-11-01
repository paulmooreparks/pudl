# PUDL 0.96.4

This point release adds an execution-state badge that hosts may use, draws a taskbar stack's rows with it, and gives those rows a menu row's metrics. Paul approved the three changes on 2 November 2026 after an adopter asked for them, and the lead implemented, reviewed and published them from the primary checkout.

A `.badge` with `data-state` of `working`, `waiting`, `stuck` or `idle` leads with the state's static glyph in the state's colour, the same glyph and colour the window system draws, and the words inside are the host's. A stack row's state mark is now that badge, at the row's end before Close, with the words from `data-win-state-label` and the full state in the row's name and tooltip. It sits in a column of fixed width, 12em capped at half the row, so a change of state or words moves nothing else in the row, and a row with no state keeps the empty column. The stack panel sets `text-sm` type of its own instead of inheriting the body's, and a row has 6px by 14px padding and a 14px glyph, standing 32px tall where it stood 36px. The taskbar button and title bar are unchanged.

## Validation

The new suite tests/stack-state-chip.test.js checks the host badge's glyph and colour for all four states, a row's height, type, padding and glyph size, the badge's class, state, words, size, weight and place between the title and Close, the empty column of a row with no state, that a change of state and words leaves the title and column where they were, the row's accessible name, that the taskbar button's own mark is untouched, and the absence of page errors. It passed in Chromium, Firefox and WebKit with the taskbar-stacks, taskbar-stacks-full, window-status, window-icon and dock-tab-menu suites. Light and dark captures of the stack popup were reviewed by the lead. Generated minified copies pass the freshness check.

Under Paul's minimal-testing direction for this batch no whole-project matrix, independent second review or negative control was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Limits

The badge's words truncate within the fixed column when they are long; the full words remain in the row's name and tooltip, as before. A host that had set the stack panel's font size itself should remove that rule after adopting this release, since the panel now sets its own. Forced-colours mode draws the badge as it draws any badge, with a CanvasText border.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.96.4 CDN examples after publication.
