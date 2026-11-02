# PUDL 0.96.5

This point release corrects the taskbar stack list's sizing from 0.96.4 and adds a lifecycle word for a window with no execution state. Paul approved both on 2 November 2026 after an adopter reported the cut-short titles from his own screenshot, and the lead implemented, reviewed and published them from the primary checkout.

The stack list now sizes to its longest title as it opens, up to 560px or the viewport less 8px, where 0.96.4 fixed it at 380px with a 12em state column that left titles about 114px. It keeps that width while open, so Close stands still as titles and states change. The state column is as wide as the widest badge in the list and no wider, measured by the script into a custom property on the panel; every row's badge ends in one line before Close, a row with no state keeps the column, and the title takes the rest and truncates last. The menu script gained `data-menu-size="own"` so a panel it places can keep the width its own stylesheet gives it; the stack panel uses it.

`data-win-lifecycle` on a window gives a word such as Closed for a window with no execution state. A stack row and the folded Window status draw it as a plain badge with no glyph in the state's place, and the row's name and tooltip include it. It is nothing to the compact marks on the title bar, taskbar and docks, adds nothing to a stack's count of states, and gives way to an execution state while one is set.

## Validation

The new suite tests/stack-lifecycle.test.js checks the list growing to a long title within the cap, short titles uncut, the state column equal to the widest badge in every row, every badge ending in one line before Close, the lifecycle badge's class, words, neutral colour and absent glyph, the row's name, the stack's aggregate ignoring the word, an execution state taking the word's place and giving it back, a changed word followed live, the empty column kept, and the folded Window status row. The stack-state-chip suite was revised for the measured column. These passed with window-states, window-status, taskbar-stacks, taskbar-stacks-full, window-icon, dock-tab-menu, menus, popover and context-menu in Chromium, Firefox and WebKit. Light and dark captures of the stack popup were reviewed by the lead. Generated minified copies pass the freshness check.

A first cut used CSS subgrid for the shared column; Chromium did not size the parent track from the subgrid's items, so the column is measured by script instead. Under Paul's minimal-testing direction no whole-project matrix, independent second review or negative control was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Limits

A title that arrives longer than the list while it is open truncates until the list next opens, since the width is kept while open. A badge wider than half the row truncates its words, with the full words in the row's name and tooltip. The state column is remeasured on each redraw of the rows, so a change that makes a different badge the widest moves the titles' right edge by the difference.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.5. Its immutable commit is d303186dfa15453eadc234d1697ee615e7f3a5e5 and its annotated tag object is 712aacb8bf977502b3c8522fa8892019a5e335b4. The reproducible archive contains 406 files including all 180 dist files, occupies 6193568 bytes, and has SHA-256 0910a0584cdafc4ad248f9f2ddd1f1f2e5e0ad451ca3b767d127ed3d3d8530d0. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 97 versioned CDN CSS and JS files match their tagged bytes. Main's 24 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
