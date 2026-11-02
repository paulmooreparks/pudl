# PUDL 0.96.8

This point release gives a tree two custom properties a host may set, so its rows line up with the content around them.

`--tree-indent`, defaulting to `var(--space-4)`, is the step each nested level moves in by. `--tree-row-pad-start`, defaulting to 6px, is the space before a row's toggle or glyph. Both are set on `ul.tree`. The toggle, glyph and gap metrics are unchanged, and a tree that sets neither renders exactly as before, since the defaults are the values the stylesheet had as literals.

## Validation

The new suite tests/tree-indent.test.js checks that a tree with neither property set keeps its 6px start padding and spacing-token indent, that setting both on the tree moves every level's row padding and indent accordingly at three levels, and that the toggle's size and the gap are unchanged. It passed with the row-actions and context-menu suites, which exercise trees, in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.8. Its immutable commit is 5920c1e140bcd52d17eea338fb5673da7d6dc14d and its annotated tag object is aca46018b52bad52a8b56847b2973a759e74ddc4. The reproducible archive contains 409 files including all 180 dist files, occupies 6200026 bytes, and has SHA-256 581f13ad18c2f72895b6c8a290b544bb0403752c94441b3569afe40d7d1006a6. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 97 versioned CDN CSS and JS files match their tagged bytes. Main's 24 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
