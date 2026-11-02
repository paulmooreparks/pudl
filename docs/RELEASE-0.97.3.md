# PUDL 0.97.3

This point release corrects the folding status area of 0.97.0. An item the page hides with `hidden`, such as one that appears only when there is news, was folded with the others, listed in the Status menu, counted in the Status item's name and able to give the Status item its tone, though it was not shown. A hidden item is now out of the fold altogether. It joins once it is shown, which fits the taskbar again, and leaves when hidden again, losing its folded mark.

## Validation

tests/status-fold.test.js gains a hidden item with an accent badge and checks that it is not folded, named or toned, that it folds and is named once shown, and that it leaves the fold when hidden again. It passed with the status-area and win-bar suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.3 CDN examples after publication.
