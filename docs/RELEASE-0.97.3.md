# PUDL 0.97.3

This point release corrects the folding status area of 0.97.0. An item the page hides with `hidden`, such as one that appears only when there is news, was folded with the others, listed in the Status menu, counted in the Status item's name and able to give the Status item its tone, though it was not shown. A hidden item is now out of the fold altogether. It joins once it is shown, which fits the taskbar again, and leaves when hidden again, losing its folded mark.

## Validation

tests/status-fold.test.js gains a hidden item with an accent badge and checks that it is not folded, named or toned, that it folds and is named once shown, and that it leaves the fold when hidden again. It passed with the status-area and win-bar suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.3. Its immutable commit is bb56f82dfcceabc30c8260b14b137811dae71451 and its annotated tag object is 6daf2caa01c20cde199bbc9d9938da7a22d3a146. The reproducible archive contains 421 files including all 183 dist files, occupies 6251195 bytes, and has SHA-256 354199e1074a5495ef75db1f56241f85e72e0cd599e36c2af861c39ca7d2a209. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JS files match their tagged bytes. Main's 25 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
