# PUDL 0.97.9

This point release prevents a skin attribute observer from repeatedly redrawing unchanged content. The skin runtime checks stylesheet availability after DOM insertions. It previously wrote `data-skin` and `data-skin-pref` on the document root on every check, even when both values were unchanged. A consumer that redrew its content after either attribute mutation could trigger another check and enter a mutation-observer loop without yielding.

The runtime now writes each attribute only when its value differs. Real skin selection, preference changes and availability fallback retain their existing notifications. Hosts need no changes.

## Validation

The new skin-runtime regression reproduces a consumer that redraws DOM after skin attribute mutations. Against 0.97.8 it reaches a twelve-redraw safety cap in Chromium, Firefox and WebKit. With the correction, one real selection produces one consumer redraw, repeated selection and unrelated DOM insertion produce no skin attribute notifications, and removing the selected stylesheet changes the effective skin once while retaining its preference.

All eighteen skin-runtime and host-persistence checks passed across Chromium, Firefox and WebKit, nine against readable assets and nine against minified assets. The reference page was checked in both themes, with every section retaining the previous release's content and geometry and no page errors. Generated minified copies pass the freshness check. No whole-project matrix or independent second review was run. CI results after the push are follow-up evidence.

This release fixes the observer feedback loop. It does not establish that the fix resolves intermittent application sluggishness. A separate streaming benchmark previously found no timing improvement from suppressing unchanged skin writes.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.9. Its immutable commit is 644a8aeee656192d4912c859392e324bfd7ff8f6 and its annotated tag object is ff4215be3abf38c334ffc2f5aadfc272634b6759. The reproducible archive contains 430 files, including all 183 dist files, occupies 6272630 bytes, and has SHA-256 1d41572627210a70cb937216585050ffe873d3c287c468e20a3cd5b38b8c791f. The unauthenticated public archive and checksum downloads match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JavaScript files match their tagged bytes. Main's 25 CDN examples use those verified assets. The package closure check found no missing reference.
