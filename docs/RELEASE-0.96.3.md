# PUDL 0.96.3

This point release lets a window show a picture in place of its glyph, and corrects the contract's list of glyph tokens. Paul approved both on 2 November 2026 after an adopter asked for them, and the lead implemented, reviewed and published them from the primary checkout.

A window sets `data-win-icon` to the address of an image. The windows script draws it at 16px as `img.win-item-icon` on the taskbar button, the dock tab and icon rail, a stack's rows and the switcher's rows, and the menu bar's Window list draws it on the window's row. The glyph stands in until the picture loads and after it fails, a failed address is not requested again by any surface, and the attribute is followed live without replacing the button or taking focus. A taskbar stack keeps its group glyph. `pudlWindows.iconOf(key)` gives a host the address to draw. The feature commit is fbd49cf0bce1449d5e81ec9fa8b1799afe0b1af4.

The contract's list of readable glyph tokens now includes `--glyph-play` and `--glyph-pause`, shipped since 0.96.0, and `--glyph-working`, shipped since 0.95.1. The tokens are unchanged. The skins document's Gel section records adopter feedback about square buttons with no style change. That commit is b1b4d37.

## Validation

The new suite tests/window-icon.test.js checks the taskbar button, a shared dock tab, the switcher, the Window list, the failed-picture fallback, a picture set, changed and removed live, focus retention and the absence of page errors. It passed with the window-switcher, desktop-menubar, shared-docks, shared-docks-edges, docked, taskbar-stacks, taskbar-stacks-full, dock-tab-menu and menubar-item-icon suites in Chromium, Firefox and WebKit, 30 of 30 suite runs with one worker, at the feature commit. Light and dark captures of the taskbar and the Window list were reviewed by the lead. Generated minified copies pass the freshness check.

Under Paul's minimal-testing direction for this batch no whole-project matrix, independent second review or negative control was run for this point release. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Limits

The picture is an `img`; forced-colours mode shows it as the browser shows any image. A host that wants the picture to follow light and dark mode supplies an image that does so itself. The Window list shows the picture only for a window that has one; a glyph-only window's row is unchanged. The title bar does not draw the picture.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.96.3 CDN examples after publication.
