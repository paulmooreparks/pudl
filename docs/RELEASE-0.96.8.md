# PUDL 0.96.8

This point release gives a tree two custom properties a host may set, so its rows line up with the content around them. Paul approved it on 2 November 2026 after an adopter asked, and the lead implemented, reviewed and published it from the primary checkout.

`--tree-indent`, defaulting to `var(--space-4)`, is the step each nested level moves in by. `--tree-row-pad-start`, defaulting to 6px, is the space before a row's toggle or glyph. Both are set on `ul.tree`. The toggle, glyph and gap metrics are unchanged, and a tree that sets neither renders exactly as before, since the defaults are the values the stylesheet had as literals.

## Validation

The new suite tests/tree-indent.test.js checks that a tree with neither property set keeps its 6px start padding and spacing-token indent, that setting both on the tree moves every level's row padding and indent accordingly at three levels, and that the toggle's size and the gap are unchanged. It passed with the row-actions and context-menu suites, which exercise trees, in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

Under Paul's minimal-testing direction no whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.96.8 CDN examples after publication.
