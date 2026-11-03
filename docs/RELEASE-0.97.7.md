# PUDL 0.97.7

This point release keeps a path bar to one line, shows a dock strip's hidden tabs behind a More button, and stops a dock tab's menu button standing alone at the strip's edge. The designs are docs/proposals/path-bar-one-line.md and docs/proposals/dock-strip-overflow.md.

A path bar no longer wraps. When its places do not fit, the places above the current one shrink, each to an ellipsis, and the current place shrinks last; when they still do not fit, the bar scrolls sideways and starts scrolled to its end, so the current place is in sight and nothing below the bar moves as the reader goes deeper. The bar is a scroll container of the opposite direction to the page holding the list in the page's own direction, which every engine starts at the page's end; a reversed flex container, the first design, does not start at its end in WebKit. No script is involved. Scrolled-off places stay in the Tab order. In a toolbar the bar takes the room between the buttons. `.path.wrap` keeps the old wrapping.

A shared dock strip whose tabs do not all fit shows `.win-dock-more` at its end, before the collapse button, named "More tabs" with the hidden count. Its menu lists the hidden tabs in strip order, each with its window's picture or glyph, title and state mark, and choosing one selects the tab and scrolls it whole into view. The strip is measured with the button present, so the button appearing never covers a tab. Every dock edge with tabs and every split pane has one; an icon rail does not. A context menu's rows gain `icon` and `mark` fields for this.

A dock tab's menu button showed whenever its own spot was inside the strip, so a tab scrolled almost entirely off the start left its caret alone at the edge. It now shows only while the whole tab is inside the strip, and arrowing to a tab brings the whole tab into view. A report of the last tab cut under the collapse button was not reproduced, in PUDL's fixtures or in a host application, and is closed.

## Validation

New suites tests/path-bar.test.js and tests/dock-overflow.test.js cover each proposal's tests, and tests/dock-tab-menu.test.js now asserts the whole-tab rule. With the tree-grid, toolbar, shared-docks, split-docks, docked, context-menu, menus, window-menu, components and consistency suites they passed in Chromium, Firefox and WebKit, run once by the implementer and again independently before the tag: 33 of 33 suite runs on the second run. Every path bar's current place was measured whole and in view in all three engines. Light and dark captures of path bars and of a dock with hidden tabs and its menu open were reviewed. WebKit under the test driver moves Tab past links, so the path bar suite checks keyboard Tab in Chromium and Firefox and focus by script in WebKit. Generated minified copies pass the freshness check.

No whole-project matrix was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.7 CDN examples after publication.
