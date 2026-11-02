# PUDL 0.97.0: reorderable lists, a folding status area and a rich list box

The three pieces of this release ship together as the release after 0.96.9. This document is the design. Its decisions bind the implementation; what it leaves open is marked. No code exists yet.

The three pieces share a rule, which is why they are one release: each replaces something a host had to build against generated markup or a native control that could not hold what it needed. Each is a new script with its own contract rows, loaded only by a page that wants it, so a page that loads none of them is unchanged.

## 1. Reorderable lists, `pudl-reorder.js`

A host opts a list into reordering by marking the list `data-reorder`. The list is any element whose direct children are the items, such as a `ul` of `li` or a `div` of rows. An item that must not move, such as a pinned first item, is marked `data-reorder-fixed`. The host turns reorder mode on and off with `data-reorder="on"` and `data-reorder="off"`, or with `pudlReorder.on(list)` and `pudlReorder.off(list)`, which set the same attribute. The attribute is the state; a host that renders the page with it set starts in reorder mode.

While reordering is on, each movable item gains a grip at its start, a `button.reorder-grip` drawn with the grip glyph, named "Move" and the item's name, where the name is the item's `data-reorder-label` or else its words. The grip is the only pointer handle. A fixed item gains no grip and no drop can land before it, so a pinned first item stays first. The list gains `aria-roledescription="reorderable list"` and each movable item `aria-roledescription="movable item"`, so a screen reader says what the keys do.

Dragging uses the Pointer Events API, never native HTML drag and drop, which cannot be styled the same in every engine and cannot be started from a grip alone. A press on a grip captures the pointer; movement past 4px starts a drag; the dragged item takes `.dragging` and is translated along the list's axis to follow the pointer, while PUDL's documented drop marks show where it will land: the item it will land before, or the list itself when it will land last, takes `data-drop-target`. Release moves the item there; Escape during a drag puts it back. Touch works the same way, with the grip set to `touch-action: none` so the press is not taken for a scroll. A grip may stand inside an element of the item marked `data-reorder-grip`, so a host puts it where the item's own leading control stands and hides that control under `data-reorder-active`.

Keyboard: with a grip focused, Up and Down (Left and Right in a horizontal list, mirrored for right-to-left) move the item one place; Home and End move it to the ends. Fixed items keep their places, and the movable items move among the places they leave. After each move a polite live region says "{name} moved to position {position} of {count}", localised by `data-reorder-text-moved` on the list. Focus stays on the grip of the moved item: PUDL moves the items around it rather than the item, since moving a focused element takes its focus. Nothing else on the page scrolls or moves.

Reorder mode may collapse the items for its duration. PUDL cannot know what collapsed means for an arbitrary item, so collapse is the host's: while the attribute is `on` the list carries `data-reorder-active`, and a host styles its items' bodies away under it. PUDL restores nothing because it hid nothing. A list may carry `data-reorder-done="<id>"` giving the id of a control that ends the mode, such as a Done button the host draws; PUDL also ends it on Escape with a grip focused, and moves that focus to the first focusable thing in the item, else the list. The list fires bubbling `pudl:reorder-mode` with `detail.on` as the mode starts and ends, so a host can show and hide its Done control.

Before each move, drag or key, the list fires one cancelable, bubbling `pudl:reorder` with `detail.order`, the items' `data-reorder-id` values, or for an item with none its former position counting from 0, in the new order, and `detail.item`, the element moved. `pudlReorder.order(list)` gives the current order the same way. The host saves the order itself. PUDL moves the elements in the page, so a server-rendered list needs no redraw; a host that redraws from its model may cancel the event, and PUDL then leaves the elements where they were and waits for the host's redraw.

The taskbar's own ordering stays as it is. It moves windows, not elements, and has its own contract.

Out of scope for 0.97.0: dragging between two lists, and nesting.

## 2. A status area that folds, in `pudl-windows.js`

A taskbar's `.status-area` keeps its items side by side today, and when the bar runs out of room its items drop their words but never their number, so a host with many tray items had to measure the bar itself. A status area marked `data-status-fold` folds its items into one trailing Status item when the bar cannot hold them, and unfolds them as room returns. An item marked `data-status-keep`, such as the account, never folds. The fold runs inside the taskbar's existing fit pass, before the dock's More appears, so the dock's buttons keep their room first.

Nothing may move on a live change of state, so the decision to fold is made on reserved widths, never on what the items show at the moment. A badge may carry `data-status-reserve`, the widest text it will show, such as `99+`, and the fit measures each item as if its badge read that; an item whose badge has none is measured as it is. A count climbing from 9 to 10 therefore never folds or unfolds anything. `data-status-fold="all"` folds every foldable item at once; `data-status-fold` alone, or `"items"`, folds them one at a time from the first, each on the same reserved widths.

The Status item summarises what it holds. Its badge shows the sum of the folded items' numeric badges, hidden when that is zero or none has a number, and takes the most urgent tone among them: a badge's `data-state` ranks stuck, waiting, working, idle, and its status class ranks danger, warn, accent, positive, with stuck and danger the most urgent; its glyph is that tone's glyph. Its name is "Status" and the folded items' names, so a screen reader hears what is inside. The folded items are listed in a menu panel under the Status item, each row drawn from the item: its glyph or picture, its words from its `aria-label` or text, and its badge as the row's second line. Choosing a row presses the item. An item that opens a popover has that popover placed against the Status item while folded, and focus returns to the Status item when it closes.

The area fires bubbling `pudl:status-fold` on itself whenever the set of folded items changes, with `detail.folded`, the folded items, and `detail.count`. `data-win-text-status` on the layer gives the Status item its word. Without `data-status-fold` nothing changes.

## 3. A rich list box, `pudl-listbox.js`

The existing list box enhances a native `select[data-listbox]`, which can hold a row of one line. A rich list box is written as rows: a `div.listbox[data-listbox]` holding `.listbox-row` elements, each with a `data-value`, and optionally `.listbox-group` headings between them. A row holds a `.listbox-title`, an optional `.listbox-detail` second line, and an optional `.badge`, which may be an execution-state badge. The list is `multiple` or single by the attribute `data-listbox="multiple"` or `"single"`; a row with `aria-selected="true"` starts chosen, and `data-disabled` makes a row unchoosable. A hidden `select` or `input` the host names in `data-listbox-for` receives the choice as the form's value, so a form posts it as it would post the native list box; without one, the host reads `pudlListbox.value(list)`.

The script gives the list `role="listbox"`, each row `role="option"`, each heading `role="presentation"` with the rows after it in a `role="group"` labelled by it, and the same keys and pointer behaviour as the native-backed list box: a press or Space switches one row, Shift extends a range, Ctrl+A chooses all, type-ahead moves by the title's letters, and in a single list the choice follows the keyboard. Each row draws the same check box or radio mark as the native-backed rows do. A row or heading a host hides with `hidden`, as a find field filtering the list does, is out of the list for every key: the arrow keys, Home and End, type-ahead, Shift ranges and Ctrl+A skip it, and a heading whose rows are all hidden hides with them. A hidden row keeps its choice. The list fires bubbling `pudl:listbox-change` with `detail.values` after a change. `pudlListbox.enhance(root)` and `pudlListbox.refresh(list)` take in rows added later and show a choice a script has set, as today. The native-backed form stays and is unchanged.

## 4. A stack row's detail that repeats its group

`data-win-group-detail` on a window gives the text its stack row's detail may repeat, such as the workspace a stack's label already says in its own form. Inside a stack, a row whose `data-win-detail` equals it draws no detail, and the row's name and tooltip keep it. This is the host-stated form of the 0.96.10 rule, which compares with the stack's label and stays.

## Order of work and verification

The reorderable list is built first, since it was asked for first and has no dependency on the others; then the rich list box, which shares the list box script; then the status area, which is the smallest. Each gets a fixture, a focused suite in the three engines covering pointer, keyboard, screen-reader names, right-to-left, fixed items and the events, a sample page, a reference section with light and dark captures reviewed before the tag, and its contract rows. Testing is focused: suites per piece and the affected family at the end, no whole-project matrix.

## Open questions

Whether the grip should also appear outside reorder mode on a list the host marks always-reorderable is left open; the first release has the mode only. Whether the rich list box should accept rows drawn from a command table, as menus do, is left open.
