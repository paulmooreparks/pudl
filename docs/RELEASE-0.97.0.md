# PUDL 0.97.0

This minor release adds three components and one window attribute. The design is in docs/proposals/release-0.97.0.md; what follows is what shipped.

**Reorderable lists.** The optional `pudl-reorder.js` takes any element marked `data-reorder` whose child elements are its items. While `data-reorder="on"`, or after `pudlReorder.on(list)`, each movable item gains a flat `button.reorder-grip`, at its start or in an element of the item marked `data-reorder-grip`, named "Move" and the item's `data-reorder-label` or else its visible words, leaving out hidden text and the words of its buttons and fields. The grip drags by Pointer Events, with a line where the item will land, and with a grip focused the arrow keys move the item one place, mirrored in a right-to-left row, Home and End to the ends. Each move is announced and focus stays on the grip, because the items around it are moved rather than it. An item marked `data-reorder-fixed` keeps its place. While the mode is on the list carries `data-reorder-active`, its axis, under which the page hides what it wants hidden; Escape on a grip, or the control in `data-reorder-done`, ends it. A cancelable `pudl:reorder` gives the new order before each move and `pudl:reorder-mode` marks the mode's start and end.

**Rich list boxes.** `pudl-listbox.js` now also takes a `div.listbox[data-listbox]` of rows the page writes, each with a title, a second line and a badge, under group headings it wraps in sections. Both kinds of list share one core for the keys, presses and choosing. A row or section the page hides is out of every key and keeps its choice, and a section whose rows are all hidden hides. `pudl:listbox-change`, `pudlListbox.value()` and `data-listbox-for` give the choice to the page or a form. In both kinds of list a key that moves or chooses now ends a run of typed letters, so a Space after it chooses rather than types; before, a Space within 600 milliseconds of a typed letter was taken as part of the search.

**A folding status area.** A taskbar's `.status-area` marked `data-status-fold` folds its items into one Status item when the bar runs short, `"all"` at once or else as few as will do from the first, never one marked `data-status-keep`. Every decision is made on reserved widths: a badge's `data-status-reserve` is the text it is measured as, shown or not, so a count that grows never folds or unfolds anything. The Status item's glyph takes the most urgent tone of the folded badges in that tone's colour, its badge their total, its name lists them, and its menu shows each with its badge as a second line. A folded item's popover is placed against the Status item, and focus returns there when it closes. `pudl:status-fold` fires when the folded set changes.

**A stack row's group detail.** A window's `data-win-group-detail` gives the text its stack row's detail may repeat; inside a stack such a detail is not drawn, and the row's name and tooltip keep it.

## Validation

New suites cover each piece: tests/reorder.test.js (grips, names, keys, pointer drag and its marks, Escape during a drag, fixed items, the cancelable event, a right-to-left row, Escape and a Done control ending the mode), tests/listbox-rich.test.js (roles, groups, layout, presses, keys, type-ahead, hidden rows and sections, Ctrl+A and ranges over what shows, the value, the form field, a single list, rows added later), and tests/status-fold.test.js (all-at-once and as-needed folding, the Status item's tone, count and name, counts changing at the fold's edge folding nothing, the menu, a folded item's popover and focus, unfolding, and `data-win-group-detail`). These passed in Chromium, Firefox and WebKit, with the existing list box, taskbar, status area, stack, menu, popover, toolbar and context menu suites. Light and dark captures of samples/lists-and-trays.html and the reference's new demos were reviewed before the tag. Generated minified copies pass the freshness check.

No whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Limits

A reorderable list does not scroll itself while an item is dragged near its edge, and items do not move between two lists or within nested lists. A rich list box's form field gets an input's value as the values joined by commas, so a value that contains a comma needs a select. The status area folds only in a taskbar, where the fit pass runs; a status area in a topbar is unchanged.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.97.0 CDN examples after publication.
