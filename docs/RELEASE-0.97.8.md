# PUDL 0.97.8

This point release stops a path bar padding out a short place. Since 0.97.7 every place but the current one had a minimum width of 3em, so that it could shrink to an ellipsis without disappearing. The minimum also applied to a place that never needed to shrink, so a root "/" or a home "~" was laid out 3em wide with its words at the start, and a gap opened before the separator after it.

A place's floor is now 3em or its own width, whichever is less. Its flex basis is its content and its minimum is the flex item's automatic minimum, which the flexbox specification makes the smaller of the item's width and its content's minimum width. Its width is written as `min(3em, 100%)`. CSS Sizing treats a percentage that depends on its own container's size as `auto` while that container measures its content, so the list is as wide as its places' content, and while laying the places out the width resolves to 3em. A plain `3em` width gave the right floor but made the list measure each long place as 3em, which cut places that had room. `.path.wrap` places keep their own width as before.

## Validation

tests/path-bar.test.js gains a check that a one-character place is no wider than its content, measured without its separator. The path-bar, toolbar-fold, toolbar-fields, components, consistency, tree-grid, files, mono-ligatures and samples-features suites passed in Chromium, Firefox and WebKit. One Firefox components run failed once and passed on seven reruns, four with this change and three without it. Generated minified copies pass the freshness check.

No whole-project matrix was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.8. Its immutable commit is 871b4d98f5a458d0f89f4183d33225001553f5c4 and its annotated tag object is a573e951e2a91acef28e316a4e491c9ae0b0feb5. The reproducible archive contains 429 files including all 183 dist files, occupies 6270866 bytes, and has SHA-256 96a2c8ae4a97ec8ac12400f00d4a38f3e59f09d65f91f8a9746a49b97b45b358. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JS files match their tagged bytes. Main's 25 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
