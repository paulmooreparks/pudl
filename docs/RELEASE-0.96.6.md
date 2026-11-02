# PUDL 0.96.6

This point release corrects a sub-pixel defect in the 0.96.5 stack list sizing, reported by an adopter the same day. It is a correction within the sizing change Paul approved on 2 November 2026, and the lead implemented, reviewed and published it from the primary checkout.

In 0.96.5 the stack panel's kept width came from `offsetWidth` and each badge's natural width from the words' `scrollWidth`. Both are whole pixels, and either can fall a fraction short of the text it measures, so a title or a badge that fitted its box to the fraction rendered with an ellipsis. The panel's width now comes from its fractional rectangle and the words' width from a Range over their text, each rounded up with a pixel to spare.

## Validation

tests/stack-lifecycle.test.js now judges clipping by the text's own fractional rectangle against its box, for the titles and for every badge's words, since whole-pixel `scrollWidth` against `clientWidth` cannot see a sub-pixel cut. It passed with stack-state-chip, window-states, window-status, taskbar-stacks and taskbar-stacks-full in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check. The adopter's reproduction was in Edge with the Inter face at 1440 by 900; the fixture here uses the default face, so the fractional case is covered by construction rather than by that exact reproduction.

Under Paul's minimal-testing direction no whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.6. Its immutable commit is 5692368d3599967c7da39f2df622c8e0c6ee2a69 and its annotated tag object is d8d5b4a45dea27cf65cc1eae8b8c66ea5411b9b0. The reproducible archive contains 407 files including all 180 dist files, occupies 6195454 bytes, and has SHA-256 fcf2da48c80ea0c0bfc9347d6135ecbaaceb0490005c03108ed18ebd2a5a3a2a. The unauthenticated public downloads of the archive and checksum match, every archived blob and the ZIP commit comment match the tag, and all 97 versioned CDN CSS and JS files match their tagged bytes. Main's 24 CDN examples now use those verified hashes. The package closure check at the release commit found no missing reference.
