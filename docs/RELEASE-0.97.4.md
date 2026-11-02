# PUDL 0.97.4

This point release corrects the folding status area so that its Status item keeps one width. In 0.97.0 the Status item's badge carried the widest reserve among the folded badges, but only the taskbar's fit used it. On screen the badge was as wide as its total, so a total growing from 0 to two digits widened the Status item and moved the controls beside it, against the rule that nothing moves on a live change of state. The badge now lays the reserve invisibly under the count, in one grid cell, so it is always as wide as the reserve, and it keeps that width while blank. A Status item with no folded reserve shows its badge only with a total, as before.

## Validation

tests/status-fold.test.js gains a check that the Status item's width is the same with its total at 0, 7, 42 and 99+ and while blank. It passed with the status-area and win-bar suites in Chromium, Firefox and WebKit, and a capture of the folded tray at totals of 5 and 0 was reviewed. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.4. Its immutable commit is eb4f0a7cfbd38cb713b96d6120b89165eaa5f5e6 and its annotated tag object is 05e9d273482d73b9938bf78e6ffd2e290e84fc1d. The reproducible archive contains 423 files including all 183 dist files, occupies 6254574 bytes, and has SHA-256 cda5f5e85a9e37872b962b869faf45a23f61a1e61750c9d4eba30d5b5208157b. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JS files match their tagged bytes. Main's 25 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
