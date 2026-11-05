# PUDL 0.97.12

This release publishes two interactive Start menu design studies, with categories on the right or left. Both use existing PUDL lists, a filtering field, popover and split-pane handle. The divider resizes with pointer or keyboard input. The title is Start, the whole-catalog category is All, and the Clear button pairs its glyph with its label. Search and result wording refer to items so the catalog can include other destinations.

The studies have working sample links, category and keyword filtering, an empty state, addressable query/category state and focus return on dismissal. They do not introduce a reusable Start control API or change host integration requirements. See [the design record](proposals/start-launcher-research.md).

## Validation

Both layouts passed the existing focused interaction harness in Chromium, Firefox and WebKit. It checks filtering, category history, keyboard navigation, dismissal, pointer and keyboard resizing, narrow-screen bounds and native component appearance, with no page errors. Light and dark reference pages passed page-error and section-geometry checks against the previous release. Generated minified files passed freshness verification. This release does not claim a production accessibility audit of a new control.

## Publication

The immutable tag is v0.97.12. The release archive includes the studies and their local dependencies. Public archive and checksum verification and versioned CDN byte checks are recorded after publication.
