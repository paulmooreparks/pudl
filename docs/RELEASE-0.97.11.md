# PUDL 0.97.11

This release reduces redundant list, tree and toolbar work, adds glyphs to generated segmented choices, supplies static TrueType font faces, and corrects dock-peek visibility notifications. Existing pages need no markup change for the fixes. The optional compact-first status policy preserves individual tray actions.

## Changes

Row-list tab stops and tree accessibility attributes are written only when their values change. Dynamic tree enhancement still discovers new nodes and changed toggle names. In an isolated Edge 156.0.4314.42 probe, replacing one unchanged label across two 500-row lists fell from 1,000 induced attribute mutations to zero; repeated enhancement of a 500-node tree fell from 1,502 mutations to zero. Keyboard movement between tree items changes two tab stops instead of rewriting the whole tree. Traversal remains, and these measurements do not establish a cure for intermittent live stalls.

Toolbar observation ignores identical text-only replacement and unchanged observed attributes. Actual text, element or state changes still invalidate fitting. Explicit fitting, width changes and font arrival keep their existing behavior. Seven isolated unchanged-label samples fell from 17 layouts each to zero. Explicit fits retain their measurement work. The designs and limitations are in [the list/tree record](proposals/list-tree-write-efficiency.md) and [the toolbar record](proposals/toolbar-and-open-issues-build.md).

Command-generated segmented choices show command glyphs and labels, retain accessible names and mutually exclusive selection, and hide words as the toolbar folds. Wider toolbars restore their labels. This fixes issue #32.

Static Inter Regular, Italic, SemiBold and Bold faces are included as `dist/fonts/ttf/Inter-Regular.ttf`, `Inter-Italic.ttf`, `Inter-SemiBold.ttf` and `Inter-Bold.ttf`. They preserve the source fonts' full character coverage at weights 400, 400 italic, 600 and 700, with the default optical size. The existing font license covers them. Web stylesheets request no additional files. `build/fonts-static.py` builds or checks reproducible static TrueType files from the committed variable fonts. This addresses issue #31.

Dock peeks opened through focus or closed through Escape or an outside press now announce `pudl:windows-change` after applying visibility. Peek-only changes still write no history, and delayed outside-click dismissal retains its ordering. This fixes issue #29.

A `.status-area` may set `data-status-compact-priority="first"` to compact its labels before natural-width taskbar tabs shrink or stack. This opt-in keeps individual status actions available and does not enable aggregate Status folding.

## Validation

The earlier list/tree candidate passed 30 focused runs across Chromium, Firefox and WebKit, split equally between readable and minified assets. The final toolbar/window candidate passed 72 runs across the same engines and asset forms. These cover generated choice glyphs, dynamic labels and selection, radio-menu rows, wide and narrow controls, toolbar fields and folding, shared and split docks, peek notifications, status folding, compact-first individual tray actions and window menus. Wide and narrow choice captures were inspected. Both reference-page themes retained all nine sections' content and geometry, with no page errors. Generated minified assets pass the freshness check.

Static fonts passed reproducible regeneration, serialized static-outline/table checks, source character coverage and weight/italic checks, and parsing with the freetype dependency named in the issue. No application-specific D2 render was performed.

Earlier fixture failures were corrected and their output retained; the completed final runs pass. No whole-project matrix or independent source review was performed. CI on the push is follow-up evidence.

## Publication

Publication checks compare the archive, public downloads and versioned CDN assets to the immutable tag. Verified CDN examples are updated on main after publication.
