# PUDL 0.98.0

Start is now a first-class PUDL control. Load `pudl-start.js` after `pudl-split.js`, alongside `pudl.css`, and render a `.menu-panel.start-menu[data-start]` with search, category and item lists. Catalog rows can hold destination links or command buttons. Categories can appear on either side of the native resizable divider.

The control owns filtering, category counts, keyboard navigation, opening focus and explicit dismissal. Its public lifecycle supports initialization, refresh, state restoration and disposal; independent roots keep their own state. Hosts own routing, storage and command dismissal policy through `pudl:start-change` and `setState`. The examples include a small URL/history adapter. See [the complete contract](proposals/start-control.md), [right-category example](../samples/start.html) and [left-category example](../samples/start-left.html).

General menu handlers now leave Start filtering, placement and dismissal to the Start control, in either script load order. Existing host menus require no changes. The earlier mockups remain available as design history. The specification snapshot is unchanged.

## Validation

Focused checks cover search, category history, real links and command buttons, hidden and disabled items, live insertion and text updates, unchanged refresh with zero DOM mutations, independent instances, destroy/reinitialization, native/API opener focus, outside dismissal, both script load orders, pointer and keyboard resizing, light/dark themes, narrow RTL layouts and enlarged text. The component inventory, existing menus and splitter suites are checked in Chromium, Firefox and WebKit against readable and minified assets. All four focused suites passed in all three engines against readable and minified assets across the final runs. Reference-page Start interaction and page-error checks passed in light and dark themes. Generated minified copies passed freshness verification.

The earlier broad menu run retained two assertion errors: the inventory test originally looked for the search group's inset shadow on its transparent input, and a navigation assertion incorrectly skipped a row the test had just revealed. A later assertion assumed every engine focuses a button on an outside pointer press; the corrected check preserves native body-or-button focus without returning to Start. Their outputs remain under tests/output. One additional Firefox applet-start run timed out waiting five seconds for idle startup, after that suite had passed in earlier runs; it is retained as an unattributed timing failure. The minified run also observed idle jobs before the suite's early snapshot; the same ordering failure reproduced with the v0.97.12 stylesheet and all other fixture assets unchanged, establishing that failure on the release baseline. No whole-project matrix or screen-reader session is claimed.

## Publication

The immutable tag is v0.98.0. Public archive/checksum and versioned CDN verification are recorded after publication.

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.98.0. Its immutable commit is fab3df963e149bdfe0981971671d31f0ab3fa286 and annotated tag object is a6ffe33ec219f8a231c2cc94deb3657816d2eaad. The reproducible archive contains 456 files including all 190 distribution files, occupies 6996190 bytes, and has SHA-256 b75dd776a57b26e2d6e7e5dc70822d82532c53ab7a52547080413f2c2fbfe0a6. Public archive and checksum verification passed against every tagged blob. All 101 versioned CDN CSS and JavaScript files match the tag. Main carries 25 CDN examples with verified integrity hashes. Package closure found no missing dependencies. GitHub CI remains follow-up evidence.
