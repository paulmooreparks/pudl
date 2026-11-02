# PUDL 0.96.6

This point release corrects a sub-pixel defect in the 0.96.5 stack list sizing, reported by an adopter the same day. It is a correction within the sizing change Paul approved on 2 November 2026, and the lead implemented, reviewed and published it from the primary checkout.

In 0.96.5 the stack panel's kept width came from `offsetWidth` and each badge's natural width from the words' `scrollWidth`. Both are whole pixels, and either can fall a fraction short of the text it measures, so a title or a badge that fitted its box to the fraction rendered with an ellipsis. The panel's width now comes from its fractional rectangle and the words' width from a Range over their text, each rounded up with a pixel to spare.

## Validation

tests/stack-lifecycle.test.js now judges clipping by the text's own fractional rectangle against its box, for the titles and for every badge's words, since whole-pixel `scrollWidth` against `clientWidth` cannot see a sub-pixel cut. It passed with stack-state-chip, window-states, window-status, taskbar-stacks and taskbar-stacks-full in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check. The adopter's reproduction was in Edge with the Inter face at 1440 by 900; the fixture here uses the default face, so the fractional case is covered by construction rather than by that exact reproduction.

Under Paul's minimal-testing direction no whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.96.6 CDN examples after publication.
