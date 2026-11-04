# PUDL 0.97.9

This point release prevents a skin attribute observer from repeatedly redrawing unchanged content. The skin runtime checks stylesheet availability after DOM insertions. It previously wrote `data-skin` and `data-skin-pref` on the document root on every check, even when both values were unchanged. A consumer that redrew its content after either attribute mutation could trigger another check and enter a mutation-observer loop without yielding.

The runtime now writes each attribute only when its value differs. Real skin selection, preference changes and availability fallback retain their existing notifications. Hosts need no changes.

## Validation

The new skin-runtime regression reproduces a consumer that redraws DOM after skin attribute mutations. Against 0.97.8 it reaches a twelve-redraw safety cap in Chromium, Firefox and WebKit. With the correction, one real selection produces one consumer redraw, repeated selection and unrelated DOM insertion produce no skin attribute notifications, and removing the selected stylesheet changes the effective skin once while retaining its preference.

All eighteen skin-runtime and host-persistence checks passed across Chromium, Firefox and WebKit, nine against readable assets and nine against minified assets. The reference page was checked in both themes, with every section retaining the previous release's content and geometry and no page errors. Generated minified copies pass the freshness check. No whole-project matrix or independent second review was run. CI results after the push are follow-up evidence.

This release fixes the observer feedback loop. It does not establish that the fix resolves intermittent application sluggishness. A separate streaming benchmark previously found no timing improvement from suppressing unchanged skin writes.

## Publication

The archive and checksum will be built from the immutable tag and checked against public downloads. Versioned CDN CSS and JavaScript files will be checked against their tagged bytes before the adoption handoff.
