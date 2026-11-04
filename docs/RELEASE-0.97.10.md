# PUDL 0.97.10

This point release narrows five rules in `pudl-windows.css` so streaming content does not make their relational selectors search across entire windows or the window layer. Shared-dock fallback rules check sibling dock groups. Compact-menu detection stays within the header, and open-menu paint checks header/menu siblings in either order. Declaration bodies and specificity are preserved. Hosts need no new markup, attributes or JavaScript state. The design is recorded in [Window selector locality](proposals/window-selector-locality.md).

This release includes the skin-attribute notification fix from 0.97.9. It does not include scheduling or geometry-sharing changes.

## Performance evidence

Eight balanced baseline/candidate pairs on a retained streaming host workload measured paired median style/layout reductions of 16.0 percent with open windows and 20.4 percent after reopening. Input-delay p95 improved by 4.7 ms and 4.0 ms respectively. Every loaded pair reduced style/layout work, and all sixteen cases passed their integrity checks. These figures were recomputed from the retained paired results during release review.

The tradeoff is a paired median 12.5 ms of additional style/layout work during the first 500 ms of closing four windows. Some individual input pairs worsened. Transition long tasks remain, and this candidate did not pass a separate scheduler experiment's stricter every-pair typing gate or its 20 percent mounted reduction target. The measurements used PUDL 0.97.5 in headless Edge 156.0.4314.42 and do not establish a cure for intermittent live stalls. Integration of the complete 0.97.10 asset set into a host application remains a separate check.

## Validation

The upstream regression compares old and new selector matching and computed styles in 282 cases per engine, covering all dock edges, dock-only state, group sibling positions, nested groups, insertion, removal, class changes, compact controls and menu state. A separate menu-paint test covers all eight skins in light and dark modes, Escape and direct dismissal, and menus before or after the header.

All 54 suite runs passed across Chromium, Firefox and WebKit, 27 with readable assets and 27 with minified assets. They cover the existing dock and menu suites and server-rendered strips with JavaScript disabled, including the fallback when the strip is absent. Both reference-page themes retain every section's content and geometry, with no page errors. Generated minified copies pass the freshness check. No whole-project matrix was run. CI on the push is follow-up evidence.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.97.10. Its immutable commit is 867a3d038f3b3bae02555ac14622060a21c460c9 and its annotated tag object is 29f63c6eec6558ceaa004ad0a71560638851b8ae. The reproducible archive contains 432 files, including all 183 dist files, occupies 6277582 bytes, and has SHA-256 c87f04a61d496e0ba01e8be6231a0fd3009c2c2cac7a1f743aab45de0bfdc8d8. The unauthenticated public archive and checksum downloads match, every archived blob and the ZIP commit comment match the tag, and all 99 versioned CDN CSS and JavaScript files match their tagged bytes. Main's 25 CDN examples use the verified assets. The package closure check found no missing reference.
