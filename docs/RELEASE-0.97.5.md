# PUDL 0.97.5

This point release brings a destructive button's resting words up to 4.5:1 in the dark theme. Measured against the raised fill under the words, Standard's dark destructive button read 3.79:1, a shortfall already recorded in the skin reviews, and every skin used with a companion palette read between 3.56:1 and 3.93:1. With the default palette the skins passed, some by a narrow margin.

The core stylesheet now sets `--danger-rest-fg` in the dark theme to `color-mix(in srgb, var(--danger) 55%, var(--text))`, on the root element so that it outranks each skin's own setting. The words stay red and read at least 4.73:1 across all eight treatments, the four palettes and both themes. The light theme keeps each skin's existing value and Standard's plain danger colour, which already passed.

## Measurement

The figures come from the resolved colours: the button's words over each colour of its fill between the top and bottom of the words, with translucent fills laid over the card beneath. Gel's glossy upper fill is lighter at its very top edge than anywhere under the words, and the words do not reach it; measured against that edge alone the figure is lower, and no red that keeps its hue would pass it.

## Validation

The skin, palette, contrast, axe, grammar, consistency, danger-glyph and disabled-button suites passed in Chromium, Firefox and WebKit. The palette suite compares Standard's rendering with a pinned commit to catch palette work changing Standard; the pin now moves to the commit carrying this deliberate change, so it keeps guarding everything else. Light and dark captures of the destructive button on Standard, Gel and Glaze with the default and Gel palettes were reviewed. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.5 CDN examples after publication.
