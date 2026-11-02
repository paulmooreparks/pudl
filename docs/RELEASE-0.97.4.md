# PUDL 0.97.4

This point release corrects the folding status area so that its Status item keeps one width. In 0.97.0 the Status item's badge carried the widest reserve among the folded badges, but only the taskbar's fit used it. On screen the badge was as wide as its total, so a total growing from 0 to two digits widened the Status item and moved the controls beside it, against the rule that nothing moves on a live change of state. The badge now lays the reserve invisibly under the count, in one grid cell, so it is always as wide as the reserve, and it keeps that width while blank. A Status item with no folded reserve shows its badge only with a total, as before.

## Validation

tests/status-fold.test.js gains a check that the Status item's width is the same with its total at 0, 7, 42 and 99+ and while blank. It passed with the status-area and win-bar suites in Chromium, Firefox and WebKit, and a capture of the folded tray at totals of 5 and 0 was reviewed. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.4 CDN examples after publication.
