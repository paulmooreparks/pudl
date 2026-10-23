# Changelog

## 0.82.0

What acts on a master-detail list alone can stand at the head of the list's column. A `.md-sidebar-head`, first in `.md-sidebar`, holds the list's filter across its width, a `.md-sidebar-tools` row of filter menus and Clear all that wraps, and the `.md-chips`, which wrap and take no space when there are none. It stays at the top of the sidebar while the list scrolls under it, and goes wherever the sidebar goes: collapsed, resized, peeking, at either side and as a phone's list pane. Its parts are separate elements, so each may be a region of its own and a list swap leaves it alone. A page whose `.md-toolbar` and `.md-chips` rows above the layout held only the list's filter can move them there and drop the rows. This release implements specification 0.39.0.

## 0.81.2

A taskbar short of room no longer scrolls. The dock used to scroll sideways, with a scrollbar along the bar's foot, and its window buttons kept their full width while the tray kept its words. The bar now gives way in steps, and runs them back as it widens. First the window buttons shrink, each to 120px or its own width where that is less, their titles cut short. Then the tray's items show their glyphs and badges alone, keeping their words as their names. Then the buttons that still do not fit leave the dock, from the last, for a "N more" button after it, whose menu lists them; the button of the window in front never leaves. The bar carries `data-win-bar-compact` while its tray is short, and a button that has left carries `data-win-tab-over`. The More button's words come from `data-win-text-more-windows` and its name from `data-win-text-more-windows-name` on the layer. This release implements specification 0.38.1.

## 0.81.1

Two fixes to menus opened against an element. The specification is unchanged at 0.38.0.

- **A row's actions button works in a table.** The button in a table row's cell never showed, because the stylesheet only looked for it directly in the row, and the cell holding it was taken for the row, so its menu was asked of the cell and the cell was marked. The row is now the `tr`, the button shows as the pointer moves over any of the row's cells, and the row is marked while its menu is open.
- **A menu opened against a low element no longer covers it.** A menu opened against an element in the lower half of the window, such as a row's actions button or anything a `pudl:contextmenu` handler passed to `detail.anchor()`, was placed from the element's top edge but could then open downward from there, over the element, when there was room below; a second press on a row's actions button then landed on the menu. The menu now knows both of the element's edges and opens below it or above it, whichever has the room.

## 0.81.0

A row can show that it has a menu without a column of buttons down the list, and a long press opens a context menu on every touch screen. This release implements specification 0.38.0.

- **A row's actions button.** A `button` marked `data-row-actions`, the last thing in a row of a list, a tree or a table, opens the row's context menu: it fires `pudl:contextmenu` on the row, so the rows are the ones a right-click gets, and the menu opens against the button with the row marked. A second press closes it. It shows only on the row under the pointer, the selected or current row, a row with focus in it and a row whose menu is open, drawn pressed in while that menu is open, and keeps its place empty elsewhere, so nothing moves. Left empty it shows the new `more` glyph. The keyboard reaches the same menu with Shift+F10 or the Menu key, so PUDL sets the button out of the Tab order and hides it from assistive technology. In a tree it goes after the node's branch, as the node's last child, and stands at the end of the node's own line. A page with a "…" button of its own on every row can move to it and drop its rule.
- **A long press opens a context menu.** On a touch screen, holding a finger still for half a second opens the context menu wherever a right-click would. Android already gave a context menu event for a long press and iOS Safari did not; now both open one menu, and lifting the finger afterwards follows nothing.
- **Glyphs.** `more`.

## 0.80.1

An applet's toolbars can give way to the ribbon. A toolbar described by `toolbars()` with `ribbon: 'hide'` is drawn with `data-toolbar-ribbon="hide"`, so it hides while the menu bar shows as a ribbon, as a toolbar a page writes itself already could in 0.80.0. A page that hid its applets' toolbars with a rule of its own can drop it. The specification is unchanged at 0.37.0.

## 0.80.0

The 0.79.0 previews are stable: the taskbar, a menu bar that unfolds into a ribbon, title glyphs, the topbar's fold order and captioned groups. Their markup and calls are unchanged, so a page that adopted them changes nothing; from here on a change to them comes with a migration note. Resident applets stay a preview. This release implements specification 0.37.0.

Fixes:

- **A folded command keeps its name.** A command a folding toolbar shows as its glyph alone, at a group's second stage, had its words hidden and nothing in their place, so a screen reader met an unnamed button and a pointer no tooltip. Its words are now its `aria-label` and its `data-tooltip` while they are hidden. A name the control has of its own, such as a choice's state, is kept, and only what folding gave is taken back when the group opens out. This covers every folding toolbar, the ribbon's row included.
- **Toasts stand above the taskbar.** Toasts sat 16px from the window's foot, over a taskbar's tray and buttons, where one could swallow a press. `pudl-windows.js` now keeps the room a taskbar along the foot takes as `--win-bar-clear` on the root, and the toast region stands that much higher. A page that raised its toasts itself can drop its rule.
- **Restoring windows no longer throws when a change races it.** A window the address named was taken out again by a change made meanwhile from the arrangement before, such as one a `pudl:window-open` listener makes, and the restore then threw from `setPlacement`. The restore now puts back the windows it loaded, and a window the arrangement names without an element is fetched again and placed when it arrives.
- **A press outside the windows lands while a docked window peeks** (issue #25). Pressing a menu bar title while a window peeked from a shared dock's rail hid the peek on the press, and the menu bar, drawn again for the new front window, lost the press before its click. A press outside the window layer now finishes before the peek hides.
- **A link to a place in the page keeps its address** (issue #24). `pudl-regions.js` rewrote every same-page link under `data-region-link` into a full address, a `#heading` link included, so a page menu's row stopped moving within its window and changed the address. A link whose `href` starts with `#` is now left as written.
- **A disclosure button's chevron shows in high contrast.** The chevron is a mask over its own background, which forced colours replaced; it now takes `ButtonText`.

New:

- **A token field's values for a script.** `pudlCombo.tokens(input)` gives `values()`, `set(list)`, `add(value)` and `remove(value)`. Each change is checked as a reader's is and redraws the chips, but fires no change event, as setting a native input's value fires none, so two fields kept in step do not echo each other. `pudl:token-check` fires before every value is added, however it comes, with `refuse(message)` and `replace(value)`: a refused value the reader gave stays in the field, marked invalid, with the message under it as a form error until the text changes, and a replaced one is added in its place, repeats found after the replacement. `pudl:token-refused` reports what was refused and whether the reader or a script gave it.
- **A toolbar can give way to the ribbon.** While the menu bar shows as a ribbon the root carries `data-menubar-ribbon-on`, and a toolbar marked `data-toolbar-ribbon="hide"`, such as a window's own that repeats the ribbon's commands, is hidden.
- **Long front titles are cut short.** A front menu's title past 12em, or `--menubar-title-max`, ends in an ellipsis rather than widening the bar, with its whole words as its tooltip. A page that capped them itself can drop its rule.

## 0.79.1

Two fixes. The specification is unchanged at 0.36.0.

- **A folding toolbar keeps its parts when a page draws a group again.** A page that redraws a group's contents with `replaceChildren` or `innerHTML`, as a list of pins is redrawn, also removed the parts folding adds to the group: its caption and its fold menu. The group then had nothing to fold into, its smallest width came out as the toolbar's padding, and beside a menu bar in the topbar it was squeezed out of sight, More button and all. Folding now puts its parts back, and takes in any group added later, whenever what the toolbar holds changes.
- **`glyphOnly` reaches the ribbon from a command table.** A command marked `glyphOnly` in an applet's command table kept the mark when the applet's own `menus()` listed it, but lost it when `menus()` listed the command by id, so the ribbon showed its words. `pudlCommands.menuRows` now carries the mark.

## 0.79.0

Window buttons become glyph buttons, a maximised window keeps its room, and a taskbar button has a right-click menu. Several larger pieces arrive as previews, which a page opts into and whose markup may still change: the taskbar, a menu bar that unfolds into a ribbon, title glyphs and topbar fold order, and resident applets. This release implements specification 0.36.0.

What changes for every page with windows:

- **Window buttons are glyph buttons.** Each `.win-btn` is a raised square with corners of `radius-sm`, twice the title's text across (28px floating, 26px docked), with its glyph as large as the text. The window menu button shows the new `window` glyph followed by a small caret, and is wider than the others. The title bar is padded 4px all round. A page that set `--win-button-size` or `--win-glyph-size` keeps what it set. A page that replaced the menu button's `::before` glyph should also hide its `::after` caret, and should not give it a fixed width.
- **A maximised window has a docked window's title bar**, 30px tall with its title at `text-sm`, so the content keeps the room. It keeps its colours, its buttons and every gesture.
- **A taskbar button has a right-click menu**, its window's menu: the window's commands, Snap and Dock, what its content adds, then Close. The menu opens against the button and the button wears an accent ring while it is open. `data-win-tab-menu="off"` on the layer or the dock turns it off, and a page that adds rows for the tab through `pudl:contextmenu` replaces it.
- **Context menus.** The `pudl:contextmenu` event is now cancelable, and its detail gains `count()`, the rows added so far, so a handler further out can give way to one nearer the target, and `anchor(element)`, which opens the menu against that element rather than at the pointer.
- **Every menu group shows the menu glyph**, the pins group included, whose Pins title now carries the `pin` glyph instead.
- **A title with a picture folds to it first.** When a menu bar runs short of room, a title with both a picture and words shows the picture alone before the pins give way, its words kept as its accessible name and its tooltip. Words written as text beside a brand's picture are now wrapped in a `span.menubar-words`.
- **Folding toolbars** stop at a single group's menu button instead of folding it into More, fold again once the page's fonts have loaded, and report `--toolbar-most` and `--toolbar-least`, the widths they need unfolded and folded as far as they go.
- **Tooltips** shown on keyboard focus no longer fail when focus arrives while a menu is opening.
- **Glyphs.** `window`, `minimize-all`, `restore-all` and `close-all`.

Previews:

- **The taskbar.** A `.win-bar` holding a `[data-win-dock]` is a taskbar along the foot of the window area, or its head with `data-win-bar-edge="top"`. The dock takes the room left and scrolls; the page's own buttons stand on either side of it in markup order; a `.status-area` in it is its tray. `a.icon-btn[data-win-back]` and `[data-win-restore]` share one place, and the new `[data-win-close-all]` closes every window the reader may close, each as its own Close would, so one that refuses through `pudl:window-closing` stays; `pudlWindows.closeAll()` does the same. An icon button with no picture takes the `minimize-all`, `restore-all` or `close-all` glyph, and one with a `.glyph`, `svg` or `img` keeps it, at 16px. A press in the bar's padding or between its controls goes to the nearest control. A right-click away from a tab opens the bar's menu of Minimize all, Restore all and Close all windows; `data-win-bar-menu="off"` turns it off.
- **A menu bar that unfolds into a ribbon.** `data-menubar-ribbon` on the menu bar adds Show as ribbon at the topbar's end, or in `[data-menubar-ribbon-slot]`. Unfolded, every title but Pins becomes a tab and one row of tools under the topbar holds the chosen tab's commands, built from its rows: headings and separators start groups, switches are toggles, radio rows a segmented control, submenus menu buttons, `glyphOnly` commands their glyph alone, and `danger` commands danger buttons. A group holding a choice shows its heading as a caption. Each applet keeps the tab chosen in it. `data-menubar-ribbon-captions` sets the row's captions, `data-menubar-ribbon-words` keeps the toggle's words, and `pudlMenubar.ribbon(on)` sets or reads the choice, which is kept for the site.
- **Title glyphs.** `data-menu-glyph` on a title's `<li>` in the menu source, or `glyph` on an applet's title in `menus()`, puts a glyph before the title's words, and such titles fold to their glyphs first.
- **Topbar fold order.** When the topbar holds a folding toolbar or Show as ribbon beside the menu bar, they share its room in order, each folding as far as it goes before the next starts: Show as ribbon first (100), then folding toolbars (200), then the menu bar (300). `data-fold-order` on a topbar child sets its place, lower first, or `none` so it never folds; Show as ribbon takes its order from `data-menubar-ribbon-fold-order` on the bar.
- **Resident applets.** An applet whose root has `data-applet-resident` has its menus in the bar all the time, after the site's menus and whatever is in front, and its shortcuts work anywhere. `pudlApplets.residentSources()` lists them. A command bar of pins at the topbar's right, with a resident applet for the Pins menu, is the shape the demo shows.
- **Captioned groups.** `data-toolbar-captioned` on a toolbar group shows its caption when the toolbar has `data-toolbar-captions="none"`.

The new sample `samples/menu-ribbon.html` puts all of these together.

## 0.78.0

Folding toolbars are released, with two shapes built on them, the command bar and the single-line ribbon, as `docs/proposals/command-bar-and-ribbon.md` sets out. This release implements specification 0.35.0.

- **Folding toolbars.** `data-toolbar-fold` is no longer a preview. A folded group's menu now holds everything the group holds: a `select` as a row whose submenu lists its options, the current one ticked and shown as the row's second line; a field typed into as a row that opens the field itself in a popover against the fold button and puts it back when the popover closes; keys that step a value as rows that keep the menu open; a switching key as a ticked row that keeps the menu open; and a menu button as a row that opens its menu beside it with its headings and separators. On a window 640px wide or less a submenu shows in the menu's place with a Back row first. Right opens a submenu, Left closes it, and the pointer resting on its row opens it.
- **Glyph-only commands and captions.** `data-toolbar-glyph-only` on a control shows its glyph alone at every stage, its `.toolbar-words` becoming its accessible name and tooltip. `data-toolbar-captions="none"` on a toolbar hides the group names before its groups.
- **Command bars.** A folding toolbar whose first group is marked `data-toolbar-menus` and holds a `.menubar-menu` of `.menubar-title.menu-btn` titles is a command bar: menus and tools in one row. The menu group folds last, into the `menu` glyph alone, and its menus become submenus. Left and Right in an open menu, and the pointer moving onto another title, move between its menus.
- **Ribbons.** A `.ribbon` of a `.tablist` and the folding toolbars its tabs control shows one row at a time. `pudl-toolbar.js` adds Show as ribbon beside the tabs, with the new `ribbon` glyph, which folds the ribbon into a menu bar of the same names, each menu holding its tab's groups under their names, and back. The choice is kept in `localStorage` under the ribbon's `id`, `pudl:ribbon-fold` says when it changes, and the tab band and the menu bar are one height, 44px, so nothing on the bar moves.
- **Menu rows line up everywhere.** Every menu panel, a menu button's or a fold menu's as well as the menu bar's and context menus, puts glyphs, ticks and the warning in one column wherever any row has a glyph, and mutes the glyphs. A `menuitemcheckbox` or `menuitemradio` row is ticked by `aria-checked`; `aria-pressed` on a row still works. A switching row that also has a glyph, such as Pin this story with the pin glyph, shows its glyph while it is off and the tick while it is on, so its words line up with the rest; until now it stood one step to the right.

## 0.77.1

A menu's panel, or a popover, now drops below its button and opens above only when it does not fit below and either fits whole above or has less than 240px below, with more room above. A long panel with plenty of room below used to flip up over the page because there was more room above; now it stays below, shortened, and scrolls, as desktop menus do. Context menus, which open at the pointer, are unchanged.

PUDL's code, comments, documentation, proposals, tests and changelog no longer refer to any application or site that uses PUDL, nor say who asked for a change. Three test files and two proposals have new names that say what they cover: `page-patterns.test.js`, `window-region-runtime.test.js`, `desktop-menubar.test.js`, `first-adoption-gaps.md` and `menu-bar-keys-and-toolbar.md`. Sample markup uses neutral names. Nothing a page uses changes. This release implements specification 0.34.2.

## 0.77.0

A menu bar's panel now lines up its commands as a context menu does. Wherever any command in a panel has a glyph or a picture, glyphs, pictures, ticks and the warning on a dangerous command share one 16px column, and a command with none leaves the column empty, so every command's words start in one line. A command's glyph is 14px in `text-muted`, as in a context menu, and a picture such as an applet's icon keeps 16px. Until now a command without a glyph started at the panel's edge while those with one were pushed in, so a menu bar's panel looked ragged beside a tidy context menu. The `.menubar-icon` no longer has a margin of its own, since the row's gap spaces it. This release implements specification 0.34.0.

## 0.76.0

A context menu now shows which element it acts on. The `pudl:contextmenu` event's detail gains `mark(element)`, and `pudlMenu.openAt` gains a `for` option; the marked element has `data-menu-for`, set to the menu's id, while the menu is open, and loses it when the menu closes, however it closes. Only one element is marked at a time. The stylesheet gives `:where([data-menu-for])` the background of a row under the pointer, and a data table's row its own hover look, so the row a reader right-clicked stays lit after the pointer moves into the menu; in high-contrast mode it is outlined in the highlight colour. A menu opened by Shift+F10 or the Menu key is marked the same way, since focus has left the row there too. Where the page marks nothing, nothing changes. Before, a tree row or table row lost its highlight as the pointer moved into the menu, and a page that marked the row itself with an attribute of its own can drop that rule. This release implements specification 0.33.0.

## 0.75.0

Every field with a key in it is now one sunken field whose border runs round everything, with each key a raised strip inside that border behind a hairline. Until now each key was joined to the field from outside, sharing its border, so the field's border stopped where the key began, which looked dated. The field's focus ring, danger border and dimming go round the whole control, keys included, and a key shows its keyboard focus as a ring inside its strip. This covers the combo box and searchable select (`.combo-open`), the token field's combo, the number field (`.number-step`), the password field with its Show key or eye (`.password-toggle`), the date and time fields, the year in the calendar's chooser (`.date-step`) and a master-detail toolbar's filter with its apply button (`.md-filter-group`). The markup is unchanged. A page that restyled one of these keys with negative margins or end radii should drop those rules. This release implements specification 0.32.0.

## 0.74.1

Every small raised key is 28px tall, a glyph button's height: a `.btn-sm`, whatever it holds, which was 25px with words and 26px with a glyph, and a `.seg.sm`'s keys, which were 21px. A small segmented control now stands as tall as the small buttons and glyph buttons beside it in a toolbar. This release implements specification 0.31.1. A project that stretched its small segmented control to match its buttons can drop that rule.

## 0.74.0

This release closes PUDL's gap to a complete UI library (`docs/proposals/completeness.md`). Every control is built from the grammar, sunken where it takes input, raised where it is pressed, pressed in where it is chosen, glyph and colour together; follows the page's language and culture; and answers the complaints made most often about it elsewhere. This release implements specification 0.31.0.

- **Context menus.** A right-click, Shift+F10 or the Menu key fires `pudl:contextmenu`; rows a page adds with `detail.add` open a menu at the pointer or the focused element, with the menu bar's rows, glyphs in one column with ticks and warnings, keys shown, submenus, letters to jump, and focus returned. Where nothing answers, and always with Shift, the browser's own menu opens. `pudlMenu.openAt` opens one from a script.
- **Split buttons** (`.split-btn`), a main key joined to a caret key whose menu lines up under the whole button.
- **Popovers** (`.popover`), a non-modal panel anchored to its control, placed as a menu is, focus taken in and given back, with `.pointer` and a `.popover-head` as variants, head and actions pinned.
- **Progress bars and meters** on the native elements: 16px flat bars with words; a busy bar that stands still for less motion; meters banded by their own `low`, `high` and `optimum` in either direction, with the band's colour and glyph, or `.meter.marks`.
- **Sliders, number fields and password fields** (`pudl-fields.js`): a sunken 16px track with a raised 24px thumb and its value in words; a number field read and written in the page's language with joined minus and plus keys; a password field with a Show key, or the eye with `data-password-toggle="glyph"`, and a Caps Lock line.
- **List boxes** (`pudl-listbox.js`), a select marked `data-listbox` drawn as a sunken list whose rows carry check boxes or radio buttons, choosing several without Ctrl.
- **Token fields**, a combo box marked `data-combo-tokens`, chips below the field, the separator of `data-combo-separator`, pasting split, chips edited by Backspace or a press.
- **Date and time fields** (`pudl-date.js`), native inputs marked `data-date`, typed in every form a reader is likely to use, echoed in words under the field, shown in the page's language and calendar, Japanese, Thai, Hijri, Hebrew and Persian included, or in ISO 8601 where there is none, with PUDL's calendar, a chooser of months and years, Today and Clear, and a time list at `data-time-list` minutes. The value sent is always ISO 8601 Gregorian.
- **Figures and avatars**: a frame that keeps its picture's proportion and shows a failed picture's words; neutral avatars in four sizes, `.tint` by name, status marks with shapes.
- **Steppers** (`ol.stepper`), across or `.vertical`, done steps links back, only the current step's name on a narrow screen.
- **Two rules everywhere.** A tick reports a state and a check box asks the reader to set one. The wheel changes a field only while it has focus and the pointer is over it.
- **Dialogs** keep their head and actions pinned by default; `data-dialog-pin="none"` turns it off.
- **Segmented controls** are 30px tall, a menu bar's groups' height.
- **Fixed:** a combo box's list could run past the bottom of a short window; it is now held to the room there. A `button.filter-chip-x` squeezed its glyph.
- **Glyphs** `forward`, `eye` and `eye-off`.
- New tests: `context-menu`, `popover`, `stepper`, `date`, `fields`, `listbox`, `token-field`.

## 0.73.0

The minified copies move to `dist/min/`, under the same names as their sources: `min/pudl.css`, `min/pudl-windows.js` and so on. From 0.70.0 to 0.72.0 they sat beside their sources as `name.min.js` and `name.min.css`. jsDelivr documents that it minifies a `.min.js` or `.min.css` file itself when the file does not exist, and for a release it had only just seen it did so for files that did exist, and then kept serving its own copies: one in 0.70.1 and eight in 0.72.0. Those are the same code, but their integrity hashes do not match the tag's. A name without `.min` is never minified by jsDelivr, so the move rests on what it documents rather than on how quickly it reads a new tag. The specification is unchanged at 0.30.1.

- A project loading the minified files changes `dist/name.min.js` to `dist/min/name.js` and `dist/name.min.css` to `dist/min/name.css`, and keeps `min/` beside `fonts/` and `vendor/` when copying. A minified stylesheet finds the fonts one folder up, and a minified script loads the scripts it loads from its own folder.
- Copies of 0.70.0 to 0.72.0 taken from a release's files, rather than from jsDelivr, were always right.

## 0.72.0

This release adds combo boxes and searchable selects, and draws segmented controls as keys. It release implements specification 0.30.1.

- **A combo box** is a native input with a `datalist`, in a `.combo`, so it works without a script. The new `pudl-combo.js` draws PUDL's list in place of the browser's: a raised opener joined to the field's end, and a list drawn as a menu, with each suggestion's text on a second line and the field's own value ticked. Typing filters the list; Down, Up, Alt+Down, Alt+Up, Enter, Escape and Tab follow the ARIA pattern for an editable combo box; choosing fires `input` and `change` on the field, once. Inline completion is off unless the field asks for it with `data-combo-complete`.
- **Keys that are not the value.** An option's `data-combo-keys`, separated by commas, are words it is found by but not shown, so a list of currency signs is searched by code, name and country, and PHP typed exactly becomes ₱ when the reader leaves the field or presses Enter. Only a key that one option alone has looks it up; text several share stays as typed. The sample and the reference page show the code in each option's text as well, so the reader sees why a row was found.
- **A searchable select** is a select marked `data-combo`, which becomes a combo box that keeps the select's value, so its value is always one of its options and the form sends what it always sent. `pudlCombo.refresh(select)` shows a value a script has set.
- **Options from the server.** `data-combo-src` asks an address on the page's own origin as the reader types, after a pause, and takes only the value, text and keys of the `option` elements it returns.
- **Segmented controls are keys.** Every choice that can be pressed is a raised key, joined in a row, and the chosen one is pressed in, as a pressed button is. Before, the choices lay flat on a sunken track and the chosen one stood raised, which drew what can be pressed as display. The markup is unchanged.
- `data-toolbar-skip` keeps a control out of a toolbar's arrow order; a combo box's opener carries it.
- `samples/combo.html` shows every case, and the reference page's Forms section gains a combo box and a searchable select. `docs/proposals/combo-box.md` records the design and the decisions.
- A new test, `combo`.

## 0.71.0

Tabs in a dialog or a window keep one size, so a tabbed dialog no longer jumps as its tabs are chosen. This release implements specification 0.29.0.

- **Tabs in a dialog** keep the size of their largest panel. Every panel is laid in the same place and the ones not chosen are kept out of sight rather than out of the layout, so choosing a tab never resizes or moves the dialog; a panel out of sight still cannot be seen, focused, found in the page or reached by assistive technology. A `.tabs` straight inside the `dialog`, or inside a `form` that is, reaches the dialog's sides, its bar running from edge to edge under the title, and its panels take the dialog's colour and padding.
- **Tabs that are a window's whole body** fill it. The body gives up its padding, the bar runs from edge to edge under the title bar, and the chosen panel takes the rest of the window and scrolls on its own, so the bar stays in view. A window that sizes to its content takes the size of its largest panel.
- `data-tabs-size="largest"` asks for the same sizing anywhere else, and `data-tabs-size="each"` lets a dialog's or a window's tabs follow each panel's size.
- **Building screens** (`docs/BUILDING-SCREENS.md`), a guide to putting components together, written for agents first: page, window or dialog; a tabbed settings window; a tabbed dialog; a long dialog; actions; toolbars and commands; status and colour; and a checklist. The reference page's Dialogs section gains a tabbed dialog and links to it.
- The specification's windows chapter now describes the window menu as 0.70.2 and 0.70.3 draw it.
- A new test, `tabbed-surfaces`.

## 0.70.3

The window menu reads as blocks. Reset size and position (Reset position on a window that sizes to its content) is one of the window's own commands, so it now ends them, after Maximize, instead of following the Dock list as though it were part of it; a menu bar's Window menu has the same order. A line sets the Snap and Dock lists apart as well as their headings, so the window's own commands above them stand as a block of their own. The specification is unchanged at 0.28.0.

## 0.70.2

The window menu's layout picker stands under the heading Snap, as the Dock list stands under Dock, so the two are told apart: snapping places a floating window in a zone of the layer, and docking fastens it to an edge. A page sets its own word with `data-win-text-snap-menu` on the layer. The specification is unchanged at 0.28.0.

## 0.70.1

A field in a toolbar keeps its own keys. The specification is unchanged at 0.28.0; it does not describe a toolbar's keys.

- A field the reader types in, a text area or an input other than a box, a button, a file or a colour, keeps Left, Right, Home and End for itself. Before, Left in a field moved to the button before it instead of moving the caret.
- Left with the caret at a field's start moves to the control before it, and Right at its end to the control after, so the arrow keys still cross a toolbar with a search field in the middle. A field that does not report its caret, such as a number or a date field, keeps its arrow keys always and is left with Tab. Arriving by an arrow key, the caret starts at the edge the reader came in by.
- Every field is a Tab stop of its own, so Tab and Shift+Tab move from field to field as in a form, and the toolbar's one stop is on its buttons and links alone. Focusing a field no longer moves that stop.
- A key a page's own handler has already called `preventDefault()` on is left alone.
- A site that worked around this keeps working and can drop the workaround.
- A new test, `toolbar-fields`.

## 0.70.0

Smaller downloads. A typical English page now downloads about 140 KB of PUDL, compressed, where 0.69.3 needed about 235 KB, and a project that wants it can go lower or keep everything as it was. The specification is unchanged at 0.28.0.

- **A leaner Inter by default.** The font subsets `pudl.css` declares keep the weights from 400 to 900, the optical size of text, and the OpenType features CSS asks for by name, tabular numerals among them. An English page's Latin upright file falls from 162,188 bytes to 71,284, and italic from 179,156 to 75,824; every other script's file shrinks by about as much. Every character is still covered. Headings are drawn at the optical size of text, so they are a little looser than before. Every glyph keeps the whole font's advance at every weight, which `build/fonts.py` now proves at 400, 600 and 700, along with outlines that differ by under half a font unit.
- **`pudl-fonts-full.css`** keeps PUDL's text the way it was. Loaded after `pudl.css` and before a theme, it sets text in the whole of Inter, every weight, the optical-size axis and every feature, as the family "Inter Full", in `fonts/Inter-Full-*.woff2`, which are byte for byte the subsets 0.69.3 shipped. A theme that asks for Inter's character variants or stylistic sets with `font-feature-settings` needs it.
- **`pudl-fonts-system.css`** sets text in the platform's own interface face, Segoe UI, San Francisco, Roboto or the Linux desktop's, and downloads no font at all.
- **Minified copies.** Every script and stylesheet in `dist/` comes minified as well, `pudl-windows.min.js`, `pudl.min.css` and so on, each with a source map that points at its readable source. Compressed, they are about half the size: all of PUDL falls from about 203 KB to 109 KB, and `pudl.css` from 37 KB to 18 KB. The readable files stay the source and what the documentation describes. `pudl-actions.js` loads the minified copies of the scripts it loads when it is minified itself. CI runs the whole suite against the minified copies in Chromium, and fails if any copy no longer matches its source.
- `build/minify.js` writes the copies, with esbuild pinned as a maintainer's dependency; a project still builds nothing. `build/fonts.py` writes both font sets and `pudl-fonts-full.css`. `RELEASING.md` gains the step.
- A project upgrading copies the whole of `dist/`, `fonts/` included, as before. A host that preloads `fonts/Inter-latin.woff2` keeps the right file. One that loads `pudl-fonts-full.css` should preload `fonts/Inter-Full-latin.woff2` instead.

## 0.69.3

Performance. Applications built on PUDL had been getting slower with each release, most of all at startup and on a hard refresh with windows open. The cause was not one thing but a pattern that grew with every component: scripts that watched the whole page and answered any change in it by searching the whole page, measuring it, or drawing something again whether or not it had changed, which, while an application was still building its content, made the browser lay the page out over and over. The specification is unchanged at 0.28.0.

Measured with an application restoring seven windows, cold, against the same application on 0.69.0, layouts fell from 139 to 96 and style passes from 272 to 213, and the layouts PUDL forced while the page was being built fell from about 225 to about 75. On the reference page, streaming 300 paragraphs in now costs PUDL 8 ms of script, against 112 ms in 0.69.1 and 12 ms in 0.59.0, and lighting rows with classes 2 ms against 24.

- **Watching the page.** The master-detail script, the menu bar, the toolbar, disclosure cards and zoom act only on changes to what they look after, and do it once a task however many changes it made; before, a class or a style changed anywhere sent some of them over every layout in the page.
- **Opening windows.** Grids, trees, tabs and splits set up only a window that opens, not the whole page again, and splits are measured in the next frame, together.
- **Drawing only what changed.** Commands, the window buttons, the dock of open windows, a list's window rows, the shared docks and the splitters set an attribute, a style or text only when it differs, and the dock and the rows keep their elements rather than making them again on every layout. Setting a value to the value it has still tells every observer of the page it changed.
- **Measuring only when needed.** A folding toolbar folds again only when what it holds or its width has changed, at most once a frame, and checks its tab stop from its stages without measuring; the menu bar is built again only when its menus, titles or pins read differently, measures itself only after being built again, a change of size or the fonts arriving, and `pudlMenubar.refresh()` builds it again only when something it shows has changed; the shared docks place their tabs' menu buttons in the next frame.
- **Lookups.** Commands are found through an index of each scope's table, built once a task, instead of asking the application for its table and searching it once a control; `pudlCommands.list` gathers the page's command controls once. The splitters' least sizes are worked out again only when the inner area, the snapped windows or their limits change, and their limits for assistive technology are worked out when a drag ends rather than on each frame of it.
- **Scrolling** with no menu open no longer searches the page for menus to place.
- **A test** (`perf-churn`) counts what PUDL does while a page changes in ways that are none of its business, and requires none of it: no page-wide search, measurement or computed style. 0.69.1 made 1,120 page-wide searches and 3,333 measurements there.
- `pudl:commands-change` now carries `detail.changed`, whether the drawing changed the page.
- Update every script but the theme's, and `pudl.css` for its version.

## 0.69.2

The tests have failed on GitHub since the commands preview, in WebKit on Linux alone, which the releases were not tested on. Headless WebKit there runs animation frames slowly, and the commands and the folding waited for one. The specification is unchanged at 0.28.0.

- **Commands are drawn again once the current task is done**, not in the next animation frame. A browser runs none in a hidden tab and few in a headless one, so a script or an agent reading a control's state just after running a command could find the old state.
- **A folding toolbar refolds as soon as its commands are drawn**, and says when it has folded with `pudl:toolbar-fit` on the toolbar, so a host or a test waiting on a new width knows when the folding is done.
- **The tests** wait for the folding to report, and for focus to reach a menu's first row, instead of fixed times, and pass in all three engines in Playwright's Linux image as well as on Windows.
- Update `pudl-commands.js` and `pudl-toolbar.js`.

## 0.69.1

This release closes the gap in the commands preview that 0.69.0 left open. The specification is unchanged at 0.28.0.

- **A choice in a menu bar's submenu is drawn as radio rows.** `pudlCommands.menuRows` passed a command given as an object, such as an item of another command, through as it was, so the menu bar never saw its choice and drew a check row. Any object with an `id` is now turned into a row as one named by its id is, with its choice as a radio, its state read when the menu opens, and its `run`. A plain row without an `id` passes through as before.
- Update `pudl-commands.js`.

## 0.69.0

This release makes six additions to the commands preview. The specification is unchanged at 0.28.0.

- **A command may draw its own menu.** `panel(container)` draws into the menu as it opens, such as a grid of swatches or a searchable list, in the command's own menu and, under its name, in a folded group's menu or More.
- **A group may stay on the row.** `data-toolbar-keep` on a group, such as one holding a field, keeps it as it is and never folds it; the other groups fold around it.
- **The badge is in the name.** A control's accessible name carries its badge, so a screen reader hears "Open Comments, 3".
- **`tone`**, `danger`, `warn` or `positive`, colours a command's control and menu row with no other meaning. A toned command without a glyph takes the status's glyph, stop, warning or check, so colour is never the only signal, and a toned control's badge takes the tone.
- **`detail`** is a line saying what a command does, under its words in a menu row and in its control's tooltip. A disabled command's reason still takes that line first.
- **`bind: false`** shows a command's `shortcut` in its tooltip and menu rows and leaves the key to whatever binds it; the menu bar honours it for rows it is given.
- **Scopes.** `pudlCommands.list` describes a command by its own scope's controls only, so two windows with a command of one id do not answer for each other. `pudlCommands.run(id, value, el)` with an element runs only a command in that element's scopes; without one it looks where focus is and then everywhere. This is the one change existing callers may notice: a script that named an element and relied on the fallback must name the right one.
- **The sample.** The note editor's Insert group gains Insert Symbol, a grid drawn by its command; its Insert rows have details; and Tools gains Checks, which counts lines ending in spaces and shows it by tone.
- Update `pudl-commands.js`, `pudl-toolbar.js`, `pudl-applets.js`, `pudl-menubar.js` and `pudl.css`.

## 0.68.1

This release makes two fixes to the commands preview. Both were promised by `docs/proposals/toolbar-commands.md` and missing from 0.68.0. The specification is unchanged at 0.28.0.

- **Menus name commands by id.** A row in an applet's `menus()` or `commands()` may be a command's id. It becomes the row, with the command's words, glyph, key, tick or radio, danger, and disabled state with its reason, read when the menu opens; a hidden command leaves no row, and a separator left at an end or doubled goes; a command with items is a submenu; an unknown id is reported once in the console and left out. `pudlCommands.menuRows(list, scope)` does the same for any list.
- **A toolbar group with nothing to show leaves the row.** A group of commands whose controls are all hidden is hidden too, and comes back when one shows, so the folding measures only what is there. A hidden command's menu wrapper and an empty choice go with them. A hand-written group with no commands is left alone. A page that hid empty groups itself from a listener on `pudl:commands-change` can drop it.
- **The sample.** In Preview, the note editor's Style, Text, Lists and Insert groups leave its toolbar.
- Update `pudl-commands.js` and `pudl-applets.js`.

## 0.68.0

This release implements PUDL specification 0.28.0. PUDL is now AI-native, and it takes in applet actions (`docs/proposals/applet-actions.md`).

- **Applet actions** (`pudl-actions.js`, `pudl-actions-core.js`, `vendor/cfworker-json-schema-4.1.1/`). An applet's `define()` names a manifest of actions with `actions`, and a script, the page, a command or an agent calls them by reference, with input and output checked against JSON Schemas, through `pudlApplets.run`, `invoke`, `catalog` and the rest. Replay is pure, once or human. Capabilities are a closed list a project extends with `pudlApplets.capability`; a caller holds its grant, `artifact.create` alone by default, and `pudlApplets.confirm` lets the reader allow more. Live actions are answered by the open applet through `pudlApplets.attach`. Request verbs are published as actions, and an action never navigates the page that called it. `pudlApplets.definitions()` and the `pudl:applet-define` event let the broker read `define()`.
- **Upgrading.** A site with its own applet-actions scripts replaces them with PUDL's and drops any wrapper it put around `define()`. It adds capabilities of its own, such as `files.read` and `files.write`, with `pudlApplets.capability`, publishes its page's actions with `pudlApplets.publish`, and gives each calling applet its grant, since a caller with none now holds only `artifact.create`, or sets `pudlApplets.confirm`. `pudlActions` keeps working, deprecated, until 1.0, and the event is `pudl:applet-invocation`.
- **Agents in the README's principles.** "Agents are readers too."

The following are previews, which this release carries so that the pilots can try them; they may change before their proposal is settled (`docs/proposals/toolbar-commands.md`).

- **Declared commands** (`dist/pudl-commands.js`, `docs/proposals/toolbar-commands.md`). `pudlCommands.register(scope, table)` declares commands once, each with an id, words, glyph, key and state; a control with `data-command` and a segmented control with `data-command-choice` are filled from them and kept current; a command with items is a menu; the keys work while focus is in the scope; and `pudlCommands.list(el)` and `pudlCommands.run(id)` give an agent every command as data and run one by id, refusing a disabled one with its reason. An applet offers `commandTable()` and `toolbars()`, and gets `opts.commandsChanged()`. A command with `action` and no `run` runs that action, with every capability when a person presses it and only its caller's grant when a script runs it.
- **Toolbars that fold** (`pudl-toolbar.js`, `pudl.css`). A toolbar marked `data-toolbar-fold` keeps to one row, and its named groups fold through five stages, from names and words, to glyphs, to a menu button with the group's name, to its glyph alone, to the More menu, by priority. A folded group's menu holds every command, ticked or chosen as it is.
- **Samples.** `samples/commands.html`, a note editor built this way, with a width slider, a panel showing the commands as an agent sees them, and a panel that runs its five actions as an agent with no grant would; and a folding toolbar on the reference page.

## 0.67.0

This release implements PUDL specification 0.27.0, which adds splitters between windows side by side (`docs/proposals/zone-splitters.md`).

- **Splitters between snapped windows.** Where two snapped windows meet, a splitter on their shared grid line moves the whole line, so two halves can be 40% and 60%, a half beside two quarters keeps all three edges together, and thirds move one boundary at a time. Each window keeps its cells of the grid, so its placement and the layout picker are unchanged. Where two splitters cross, as in the four quarters, a handle moves both. The splitter is a focusable separator: arrows move its line 1%, Shift a sixth, Home and End to its limits, and Enter or a double-click returns it to the grid. Lines stop at each window's least size, never cross, give way when the workspace shrinks, and are forgotten once no two snapped windows meet across them.
- **The address.** Moved lines are kept as `grid=x3:0.4,y3:0.35`, absent while nothing has moved, so every existing address is unchanged. `pudlWindows.grid(axis, line, share)` moves a line from script, and `state().grid` lists them.
- **Stacking.** A window's `z-index` is now twice what it was, two apart from the next, so a splitter can lie between them; a project that compares windows' `z-index` values with its own should check them.
- Update `pudl-windows.js` and `pudl-windows.css`.

## 0.66.0

This release implements PUDL specification 0.26.0.

- **Danger controls carry the warning glyph.** `.btn-danger` and `.menu-action.danger` lead with the warning glyph, which PUDL now draws, so their danger never rests on colour; a menu row's is 12px and takes the tick's column, so labels stay in line. A control that holds a picture of its own (a `.glyph`, an image or a decoration hidden from readers) keeps it, so markup that already wrote a ⚠ gets no second one. A danger row that switches on and off keeps its tick. PUDL's own menu bar's Close all windows gets it too. Projects that followed the README's old advice to put the `stop` glyph on destructive menu rows keep it; drop it to get the warning glyph.
- **An applet may start when its window is seen.** `start` in `define()` or `register()`, or `data-applet-start` on the mount, is `"open"` (the default), `"seen"` or `"idle"`. A restored layout starts only the applets of the windows that can be seen: in front, shown in a dock, or in a zone nothing covers. `"idle"` applets fill in behind, one at a time, each once everything before it is ready. Until its applet starts, a window shows a loading line and is `aria-busy`, which dims the applet; an instance's `ready` promise keeps it busy until it can be used. A window closed unseen never starts its applet. New: `pudl:applet-start` with `detail.reason`, `pudlApplets.started(key)` and `pudlApplets.start(key)`, and in `pudl-windows.js`, `pudlWindows.shown(key)`, `pudlWindows.seen(key)` and `pudl:window-seen`. Window titles are not saved: the markup that creates a window gives its title.
- Update `pudl.css`, `pudl-windows.js` and `pudl-applets.js`. A project can delete its own danger glyph rule, declare `start: "idle"` for applets that can wait, and remove any deferral and loading line of its own.

## 0.65.0

This release implements PUDL specification 0.25.0.

- **A dialog's title and actions stay in view.** When a dialog's content is taller than the window, the title and `.dialog-actions` stick to the top and bottom of the panel, filled with its colour and reaching its sides, and only the content between them scrolls. No markup changes; the actions may be the dialog's own or in a form that wraps the fields or the whole dialog. A new `.dialog-head` holds the title with a control that goes with it, such as a filter.
- **A line only when there is more.** A line in `--border` separates the head or the actions from the content only while content is hidden beneath it, so a dialog that fits looks as it did. `pudl-dialog.js` now does this in every browser, not only those lacking the command buttons, and sets the dialog's scroll padding to the bands' heights so Tab never leaves a field hidden behind one. Without the script the bands still stay in view, with no lines.
- **Space above the actions.** `.dialog-actions` keeps `--space-5` from whatever comes before it, a list or a table as well as `.dialog-body`.
- Update `pudl.css` and `pudl-dialog.js`. A project can delete its own sticky footer and actions margin from its dialogs, once they use `.dialog-actions`.

## 0.64.0

This release implements PUDL specification 0.24.3.

- **A menu command may carry its own picture.** A command in a host's or an applet's menu markup that holds an `<img>` or a glyph span before its words shows it as the row's icon, as a pin in the bar already did, so an applet's registered icon appears beside its name in the launch menu. The words of the command stay what a reader hears; the picture is decoration. Update `pudl-menubar.js`; nothing a project does changes.

## 0.63.0

This release implements PUDL specification 0.24.2. Update `pudl.css`.

- **The controls on a bar with a menu bar look uniform in both themes.** `--menubar-group-bg` defaults to `--raise-grad`, so with its `--raise-border` and `--raise-shadow` a menu group at rest looks like a neutral `.btn`, and in the dark theme a topbar holding a menu bar sets `--tb-chip` and `--tb-chip-shadow` to the same surface, as the light theme already did, so its pills and status area match too. The three `--menubar-group-*` hooks still override the menus, and a project that set them to these values can delete that rule. A topbar without a menu bar is unchanged.

## 0.62.1

- A persistent sidebar's divider clips its grip. Since 0.54.0 the divider is 12px wide, or 20px for a coarse pointer, while the grip stays drawn at 16px, so it reached 2px past each side; at a phone's width, where the divider stands at the layout's end edge, that widened the page and made it scroll sideways, as measured at 390px on 0.62.0. The divider now shows the grip's middle column and clips the rest, which is what the stylesheet's own comment intended. Update `pudl.css`; a project can delete any `overflow: hidden` stopgap of its own.

## 0.62.0

This release implements PUDL specification 0.23.0. Update `pudl.css`, `pudl-windows.js` and `pudl-menubar.js`. Nothing changes for a layer without `data-win-switcher`, beyond `state().recent`.

- **A window switcher.** `pudlWindows.state().recent` lists the open windows in the order they were last in front. A layer marked `data-win-switcher` takes Ctrl+Tab and Ctrl+Shift+Tab: a quick press flips between the two windows used last, Ctrl held walks the order with a list of the windows, the arrow keys move the pick, Enter switches, and Escape, lost focus or a press outside the list let go. Docked windows are left out, minimised ones restored when picked, a text field never sees the keys, and a modal dialog keeps them. `pudlWindows.switcherKeys()` gives the two keys, which `pudlMenubar.shortcuts()` lists. Text: `data-win-text-switcher`, `-switch-last` and `-switch-back`.
- **Long text in a notice.** A notice and a toast keep their content inside the card: an unbroken path or identifier breaks at the edge, prose as before, a `pre` scrolls sideways, and a long button in the actions ends in an ellipsis; give such a button its whole label as `title`.
- **Disabled rows faded.** A disabled menu row, in a panel or the menu bar, is at half opacity as well as muted, as a disabled button is. Placeholders are not faded, because the specification keeps a placeholder at full opacity so that it reaches 4.5:1, and a test guards it.
- **Two glyphs**: `--glyph-image` and `--glyph-clip`.

## 0.61.1

- A menu bar's titles were drawn with a gap around their letter, "G o", because the span that carries the underline split the words into three children of a flex row. The words are one child again. Update `pudl-menubar.js`.

## 0.61.0

This release implements PUDL specification 0.22.0 and makes nine additions. Update `pudl.css`, `pudl-menubar.js`, `pudl-windows.js`, `pudl-windows.css` and `pudl-md.js`, and add `pudl-toolbar.js` where a toolbar is used. One behaviour changes for every menu bar: a letter typed in an open panel now runs the row that has it rather than moving to the next row that starts with it, as desktop menus do.

- **Letters in the menu bar.** Every title and row has a letter, declared with `data-mnemonic` or `mnemonic` or assigned by a rule, underlined while it can be typed and announced with `aria-keyshortcuts`. A letter opens its title from the bar and runs its row in a panel, cycling among rows that share it, on every platform.
- **A desktop host.** `data-menubar-host="desktop"` lets commands claim `Mod+N`, `Mod+T` and `Mod+W`, and gives the bar Alt alone and F10 to reach it and the platform's access-key modifier with a letter, Alt or Ctrl+Option on a Mac, to open a title from anywhere. macOS, Linux and Windows are served alike; only F10 is withheld on a Mac, where the system keeps it.
- **Function keys from a field.** F1 to F12, alone or with Shift, are dispatched from a text field as chords are, unless the field keeps the key.
- **More of a markup row.** `data-menu-danger`, `data-menu-glyph`, `data-menu-detail` and `data-menu-reason`, and `data-menu-radio` on a list; applets' items take `glyph`, `detail` and `reason` too.
- **A listing of keys.** `pudlMenubar.shortcuts()`, and a warning for a key bound to two rows of one source.
- **Toolbars.** `.toolbar` and `.toolbar-group`, the pressed look for `.icon-btn[aria-pressed="true"]`, and `pudl-toolbar.js` for the tab stop and the arrow keys.
- **A window's detail.** `data-win-detail` and `retitle(key, title, detail)`, drawn after the title in the title bar, the tabs and the window lists, giving way before the title; `pudlWindows.detailOf(key)` and `pudlWindows.openMenu(key)`.
- **Sixteen glyphs**: `board`, `ticket`, `pencil-off`, `new-window`, `bold`, `italic`, `underline`, `strike`, `code`, `list`, `list-numbered`, `quote`, `table`, `panel`, `colour` and `paragraph`.
- **Menu readiness.** The menu bar check in the patterns suite now waits for the bar to name the window in front rather than sleeping, which is what a loaded runner can outrun; six WebKit runs alone found no fault in the script. A close whose toggle event arrives after the panel was reopened by a key no longer undoes the reopening.

## 0.60.0

This release implements PUDL specification 0.21.0 (`docs/proposals/flow-ui-controls.md`). Update `pudl.css`, `pudl-windows.css` and `pudl-md.js`, and add `pudl-disclose.js`, `pudl-zoom.js` and `pudl-rows.js` where their components are used. Window buttons change size with no change of markup; a page that set `--win-button-size` or `--win-glyph-size` keeps what it set.

- **Disclosure cards.** `.card.disclosure` opens and closes by a raised `.card-toggle` at the start of its head, drawn as a tree's toggle, the only pressable part of a flat head; a `.card-summary` shows while closed, the `.card-body` and `.card-actions` while open. `pudl-disclose.js` reads `aria-expanded` and fires `pudl:disclose`.
- **Zoom.** `.zoom` is Zoom Out, the scale, Zoom In and Fit above a `.zoom-viewport`; `pudl-zoom.js` scales the picture, keeps the middle in place, holds the limits, answers Ctrl with Plus, Minus, 0 and the wheel in the viewport, and fires `pudl:zoom`.
- **Row editors.** `table.row-editor` with flat headings, a remove glyph button at each row's end, a spanning second line and an Add button, stacking at 480px of its own width; `pudl-rows.js` moves focus after Add and Remove and fires `pudl:row-remove` and `pudl:row-add`.
- **A command on a label's line.** `.form-label-row` with a `.form-label-end` slot for small raised controls, wrapping under the label when narrow.
- **Row lists.** `ul.row-list` of master-detail rows standing on their own, each a link; `pudl-md.js` gives every list of rows, the sidebar's included, one tab stop and Up, Down, Home and End.
- **Window buttons sized to the title.** Buttons are 1.7 times the title's text and glyphs 0.85 times, 24px and 12px at the default size, 22px and 11px docked, growing with the text; the menu button's caret is drawn in a 1.2 times box so that it stands as tall as the title's letters rather than as a speck.
- **Four glyphs**: `--glyph-plus`, `--glyph-minus`, `--glyph-arrow-up` and `--glyph-arrow-down`.
- **Badge contrast.** A badge's words are drawn at 50% of their status colour toward the text colour, where 62% left a badge on a current row's `surface-alt` at 4.42:1 in the light theme; every ground a badge sits on now passes 4.5:1.

## 0.59.0

This release implements PUDL specification 0.20.1. Update `pudl-windows.js`. Nothing changes for a window without the new attribute.

- **Room to ask for (#16).** A window marked `data-win-room` with a CSS length, such as `61rem`, has that much width while it is in front: automatic shared side docks that would leave it less show as rails, the widest first, without changing the address or the docks' modes. A dock the reader pinned open stays open. This finishes issue #16, whose other parts came in 0.58.0, and replaces the host script that measured the window and pinned a dock to a rail, which left the rail in the address after the window closed.

## 0.58.0

This release implements PUDL specification 0.19.1 and answers issues #12 to #21. Update `pudl.css`, `pudl-windows.js` and `pudl-windows.css`. Nothing changes for a page that uses none of the new attributes, except that shared dock addresses are shorter; addresses written before read the same.

- **Sending a form inside its window (#17).** A POST form marked `data-win-submit` in a window is sent with `fetch` and the header `X-PUDL-Window: <key>`. An answer holding the window, at any status, gives it its new body, title and status marks, keeps its place, keeps focus on the same field and announces a notice. A redirect elsewhere is followed; any other answer loads the page again; only a request that could not be sent falls back to an ordinary submission. `pudlWindows.reload(key)` and `pudlWindows.update(key, markup)` change a window from script, and `pudl:window-update` fires after each change.
- **Where windows open (#16).** `data-win-place="own"` makes a window open where its markup puts it rather than where its opener is. `data-win-opens="<zone>"` sends the windows a window opens to that zone. `data-win-undock="<zone>"` sends a window to that zone when it leaves its dock. `pudl:window-place` now has the followed link in `detail.link`. Temporarily collapsing a dock to give a wide window room (`data-win-room`) is not in this release.
- **Open beside (#21).** A link marked `data-win-beside` opens its target beside its window, in the zone it names or the half the opener's middle is not in, and a maximised opener takes the other half. On a layer marked `data-win-beside-modifier`, Ctrl or Cmd with a click on a `data-win-replace` link does the same. Ctrl and Cmd are not taken over by default, since they open a browser tab.
- **A strip the server draws (#14).** The script adopts a `.win-dock-group` it finds in the layer, with link tabs that select by address without script, and adds the toggle and menu buttons. Without a strip, a window marked `data-win-dock-shared` keeps its title bar and the whole dock, so there is no empty band. `docs/SHARED-DOCKS.md` has the markup.
- **Shorter dock addresses (#13).** `d.<edge>` writes only what the default would not give back: a selection other than the window in front or the first tab, a size only for an empty dock, and nothing at all for an automatic dock with nothing to say.
- **A narrow policy for every window (#20).** `data-win-narrow="maximized"` may sit on the layer for all its windows, and `data-win-narrow="keep"` on a window opts out, as a bottom strip should. The 0.41.0 rule that a window taking part gives up its dock at narrow widths is unchanged.
- **The attention count's contrast (#19).** A window's attention badge on the taskbar and the dock tabs is drawn further toward the text colour and keeps 4.5:1 on every ground it sits on, pressed tabs included, in both themes. It measured as low as 3.98:1 in the light theme.
- **Five glyphs (#12, #15).** `--glyph-reload`, `--glyph-flag`, `--glyph-inbox`, `--glyph-shield` and `--glyph-terminal`. A host may also define its own `--glyph-*` token and name it in `data-win-glyph`.
- A new test suite covers all of this in the three engines.

## 0.57.0

This release implements PUDL specification 0.18.0, which adds shared docks on every edge and tabs that move. Update `pudl-windows.js`, `pudl-windows.css` and `pudl-regions.js`. A layer with the bare `data-win-dock-tabs` attribute sees no change in its top and bottom docks; set `data-win-dock-tabs="all"` to share them.

- **Shared top and bottom docks.** With `data-win-dock-tabs="all"`, the windows docked at the top or bottom share the edge under one full-width strip on the dock's inner side: above the content of a bottom dock, and below the content of a top dock with its tabs hanging from the strip. Tabs, status marks, menu buttons, required windows and keys are as at the sides, and every window in the dock shares one height. `pudlWindows.dockMode()` takes `top` and `bottom`, and the state and address gain `docks.top` and `docks.bottom`, `d.top=` and `d.bottom=`.
- **A collapsed strip.** A collapsed top or bottom dock keeps its strip of text tabs alone, and a tab slides its window out over the central area with the rail slideout's rules. `auto` collapses it when the layer is at or below `data-win-dock-collapse-height`, 600 CSS pixels by default.
- **Tabs that move.** On every shared dock a tab can be dragged along its strip or rail, with an accent mark where it will go and Escape to cancel, or moved one place with Alt+Shift and the arrow keys. Required windows keep the first places. The order is `docks[edge].order` in the state and `pudl:windows-change`, and a fourth field of the address, written only while it differs from the default.
- A dock with no window and no preference is no longer written to the address. Reading such an address gives the same state as before.
- The shared docks sample opts in to all four edges and has Output and Problems windows in its bottom dock. A new test suite covers the top and bottom docks, the height threshold and tab order in the three engines.

## 0.56.0

This release implements PUDL specification 0.17.0. Update the complete distribution to adopt the shared-dock refinements, consistent menu typography and visible splitter boundaries.

- Rail buttons match Pin in size, omit dropdown buttons and stay depressed while their slideouts are visible.

- The host menu title uses the same font as other menu titles. Splitters have a visible 1px boundary rule at rest.

- Shared dock labels use compact badge typography. Collapse and Pin remain at the same outer top corner, with rail tabs below Pin.
- Required windows no longer offer Close in their window or front menus. Empty front menus are omitted, and Close-only menus have no leading separator.

- Shared side docks retain one width across their tabs and restore it from the address. Pinned docks use connected tabs with window menus and hide their window title bars.
- `data-win-dock-only` keeps a panel in a side dock and removes its floating-window controls and title bar, including in rail slideouts.
- `data-win-dock-omit-docked` lets a taskbar omit docked windows. Existing taskbars retain their entries by default.

## 0.55.0

This release implements PUDL specification 0.16.0. Update `pudl-windows.js`, `pudl-windows.css` and `pudl-regions.js`. Existing layers retain their previous dock behavior; add `data-win-dock-tabs` to use shared side docks.

- Shared side docks opt into full-width tab strips and responsive icon rails through `data-win-dock-tabs`. Each dock restores its selected window and automatic, open or rail mode. Slideouts retain mounted content and retract when work moves elsewhere. See [the contract](docs/SHARED-DOCKS.md).
- `data-win-required` keeps application furniture available through closing, replacement and address restoration. Required windows precede other dock tabs and have no close affordance.
- Window glyphs, attention counts, running marks and percentage progress can appear in side tabs, rails and the taskbar. Existing layers keep their previous placement behavior.

## 0.54.0

This release implements PUDL specification 0.15.0. Update `pudl.css`.

- **Menu groups are raised.** A menu bar's groups, and the status area beside a menu bar, are now filled with `--tb-chip`, as the specification has always said, where they were filled with `--recess-bg` and drew darker than the buttons around them. In the light theme beside a menu bar `--tb-chip` is `--raise-grad`, an ordinary button's fill; in the dark theme it is the top bar's chip fill. `--menubar-group-bg` still overrides it. A project that set `--menubar-group-bg: var(--raise-grad)` to get this can delete that line; one that wants the old look sets `--menubar-group-bg: var(--recess-bg)`.
- **A narrower sidebar divider.** A persistent master-detail divider is 12px wide where the pointer is fine, half its old 24px, and 20px where it is coarse, so a finger can still take it. `--md-target-size` still sets it; a project that wants the old width sets it to 24px.
- **A pencil glyph.** `--glyph-pencil`, for editing or renaming something in place, in the same 16px grid and stroke as the other glyphs.

## 0.53.0

This release implements PUDL specification 0.14.0, which adds layout. Update `pudl.css`. Nothing changes for a page that does not use the new classes.

- **Layout.** `.vstack` places components one above another; `.hstack` places them side by side and wraps them rather than widening its space, with `.align-center`, `.align-end` or `.align-baseline`, and `.push-end` to push its last component to the end; `.auto-grid` places them in as many equal columns as fit at `--grid-min`, 224px, one column below it, with `.span-all` for a component that spans its line. Each keeps document order, puts `--space-3` between its components unless `.gap-0` to `.gap-6` chooses another step, and adds nothing around them. A `.form-group` inside one drops its own bottom margin, so the gap alone separates fields.
- The component list has them as `stack`, `row` and `column-grid`, and the reference page shows them under Cards. A new test checks order, gaps, wrapping and columns, and that nothing widens a 320px page.

## 0.52.0

This release implements PUDL specification 0.13.0. Update `pudl.css` and `pudl-md.js`. Nothing changes for a layout without the new attributes.

- **The sidebar's side.** `data-md-side="end"` puts a master-detail sidebar at the end edge of the writing direction, mirrored, with dragging and the arrow keys following it as in a right-to-left page. The document order is unchanged, and changing the attribute moves the sidebar at once with its width and collapsed state.
- **Peeking at a collapsed sidebar.** On a persistent layout with `data-md-peek`, resting the pointer on the collapsed sidebar's handle for 200ms, or focusing it from the keyboard, draws the sidebar over the detail pane from its edge, at its width, above the windows, with the handle at its side; nothing behind it moves. It closes 300ms after the pointer leaves, when focus leaves, on Escape and when a link in it is chosen, and stays while one of its popovers is open or a drag in it goes on. Down on the handle moves into the list. A peek never changes the collapsed state or the width; pressing the handle, Enter on it or an expand command expands the sidebar for good where the peek stood. `pudl:md-peek` fires with `detail.open`. A peek needs a pointer that can hover and a wide layout.

## 0.51.0

This release implements PUDL specification 0.12.0. It takes in five patterns that sites had been building for themselves, so a site can delete its own copies. Update `pudl.css`, `pudl-menu.js`, `pudl-menubar.js` and `pudl-toast.js`.

- **A filter menu.** A `label.check.menu-check` is a checkbox row in a menu panel, which the arrow keys reach. With `data-filter-menu` on a panel that has an id, changing a box sends its form, and after the region swap that causes, the panel opens again with focus on the same box.
- **A settings panel.** `.settings-panel` is a column of `.card`s, 12px apart and at most 720px wide, each with a `.settings-actions` row and an optional `.settings-status` line that takes no room while empty.
- **A disclosure button.** `.btn.disclosure` with `aria-expanded` carries the new `--glyph-chevron` after its words, pointing down while its content is hidden and up while shown, turning without motion under reduced motion.
- **Toasts in content loaded later.** A `.toast`, usually `hidden`, in a window's content or in regions swapped in moves into the toast region, shown and announced, so a server renders one the same way for a page and a window.
- **A window's default identity menu.** A window whose content offers no menu gets an identity menu under its own title, with Open as a page, Copy link to this content and Close window, so a host needs no stub applet for it.

## 0.50.0

This release implements PUDL specification 0.11.0. It takes in four runtime features that sites had been patching into their copies of PUDL, and two other additions. Update `pudl.css`, `pudl-windows.js` and `pudl-regions.js`; a site with patched copies can replace them with these.

- **Window-scoped address parameters.** `data-win-params="r"` on the window layer makes `r.<key>` belong to window `<key>`: it travels with the windows through region swaps and Back and Forward, moves with the window when it is re-keyed, and is dropped when the window closes. `p` stays PUDL's.
- **`pudlRegions.reload()`** fetches the current address again, past any cache, and swaps its regions in place with no new history entry. It resolves `true`, or `false` when a navigation superseded it, and rejects without navigating when the request fails or the page has other regions.
- **A collapsed segmented control's choices swap regions**, as its segments do, instead of loading the whole page and every window with it.
- **`pudlWindows.rekey(oldKey, key, push)`** gives an open window a new key and keeps its element, placement, place in the stack, focus and running content, moving every record PUDL keeps by key, the window's own panels and its window-scoped parameters with it. `pudl:window-rekey` fires with both keys. The stacking order, the reset placement and the window menu's panels move to the new key too, and the maximise button's layout picker reads the current key rather than one it had captured.
- **The status area matches the menu bar's groups.** Beside a menu bar, the status area now has the groups' surface, border, shadow and 30px height, and its items the titles' colours and states; on a topbar with no menu bar it keeps the topbar's own colours. Items are 26px tall either way. 0.48.0 drew it lighter, 2px taller and greyer than the groups beside it.
- **The account glyph.** `--glyph-account` is the head-and-shoulders placeholder for an account with no picture, drawn at a picture's 24px in a status item as `.glyph.status-picture`.

## 0.49.0

This release implements PUDL specification 0.10.0. Update `pudl-menubar.js`. An article in front loses its File menu; a host that wants Print offered marks its page menu, once its printed article is worth having.

- **An article has no File menu of PUDL's.** Its only command was Print, and in a page of windows `window.print()` prints the whole desktop, so the command did not do what it said. An article's own menu offers Open as a page, Copy link to this content and, in a window, Close window, as before.
- **Print is the host's to offer.** A `nav[data-page-menu]` with `data-page-print` puts Print in the article's own menu, after Copy link and before Close window. A host that wants a File menu for an article adds one to its page menu list, which the menu bar already reads.
- The `file` word override, `data-menubar-text-file`, is no longer used. The README, the reference page, the contract and the menu-bar conventions, adoption guide and migration guide say so.

## 0.48.0

This release implements PUDL specification 0.9.0. Update `pudl.css` and `pudl-windows.js`.

- **A status area in the topbar.** `nav.status-area`, last in `.topbar-chrome`, is one raised group in the topbar's own colours, holding `.status-item` links or buttons that are flat, highlight under the pointer and press in, as a menu bar's titles do. An item holds a glyph or a 24px picture, which may be round since the group is what is raised, and optionally a `.badge`. A badge that is empty or `hidden` is not shown, and a badge on the topbar mixes its status colour with the topbar's text colour, so its count reads on a dark bar and on one a menu bar has lightened. No script is needed: the host sets the badge and the item's `aria-label`, and the stylesheet follows.
- **A new glyph, `--glyph-comments`**, for comments and messages.
- **The window menu docks at every edge.** Dock at the bottom becomes a Dock list of Top, Bottom, Left and Right, ticking the edge the window is docked at, and on a docked window ending with Undock. In a window's own menu it stands under a Dock heading, as the layout picker stands in it; in a menu bar's Window menu it is a submenu. The title bar's dock button still docks at the bottom. New words are `data-win-text-dock-menu` and `-dock-top`, `-dock-bottom`, `-dock-left` and `-dock-right`.
- **A change for a script that reads `pudlWindows.menuCommands()`:** `dock` is now a submenu with `dock:top`, `dock:bottom`, `dock:left` and `dock:right` children, and `undock` is its last child on a docked window, where before both were leaves. The migration guide lists the IDs.

A window sized by its content still does not dock with its natural height or width as its strip. This release follows the specification's rule that such a window cannot be docked.

## 0.47.0

This release implements PUDL specification 0.8.0, which settles that a select's opener is PUDL's. Update `pudl.css`, and put each `.form-select` in a `span.form-select-wrap`. A select left without the wrap looks as it did before.

- A select in a `.form-select-wrap` is drawn by PUDL. The browser's own drawing is turned off, and the wrap draws the opener, the caret glyph in the select's text colour, 11px in from the end edge, which is the left in a right-to-left page; the select's text stops short of it. WebKit drew a select itself, raised and lit, which broke the rule that a field is sunken, and clipped its text; with the wrap a select is sunken and 36px tall in every engine. A disabled select's opener dims with it, a select showing several rows has no opener, and in high-contrast mode the opener takes the system's text colour.
- The reference page, the expense tracker sample, the README and the component list use the wrap, and the web contract lists it. The component list's test has no known gaps left, and a new test checks the opener's glyph, colour and place in both themes and both directions.

## 0.46.0

This release implements PUDL specification 0.7.0. Nothing changes for a page; the new file is for tools.

- `dist/pudl-components.json` describes every component in the web contract for tools: each one's template, the grammar category of each of its parts, its variants, its states, the attributes a tool should offer and where other components may be placed in it. `docs/COMPONENTS.md` explains its fields. A component's category comes from the specification's grammar chapter, which has more than the three elevations: lists of places, handles, links, tabs and layout as well.
- A new test renders every template in both themes and three engines and measures each part against its category: a gradient and a shadow for raised, an inner shadow alone for sunken, neither for the flat categories. It also checks that every component in the contract's table is in the list, that every variant's class is in `pudl.css` and that every file a component needs is in `dist/`.
- The measurement found that WebKit draws a select itself, with a gradient and without the inner shadow, so a select reads as raised there and its text is clipped. The documented fix needs a decision about how PUDL draws a select's caret, so this release records it as a known gap in `docs/COMPONENTS.md` instead of changing selects.
- `docs/COMPONENTS.md` also lists what a development tool needs that PUDL lacks: layout for forms and panes, a slider, a progress bar, a combo box, a list box and an image.

## 0.45.0

This release implements PUDL specification 0.7.0, which adds the pins group and the `pin` glyph. Update `pudl.css` and `pudl-menubar.js`. Nothing changes for a site that does not add a pins list.

- The menu bar can have a pins group. A host adds a hidden `ul[data-menubar-pins]` beside its menu's source list. The group stands between the site group and the applet group, so it stays put as the front applet changes. Its first control is the Pins menu, marked by the new `--glyph-pin`, holding the host's pinning commands; `pudl:pins-menu` is sent as it opens so the host can set them for what is in front. After it comes a button for each pin, a link with the pin's icon and title. A plain press presses the host's link, so the host can open the item its own way; a modified press opens a new tab.
- When the pins' buttons do not fit, they give way together to one Items menu before the bar itself collapses, and the collapsed bar's menu has a Pins section with the commands and then the pins. The arrow keys reach the pins between the menus, and Space or Enter opens one. With nothing pinned, the Pins menu stands alone. The bar redraws when the host changes its list.
- The README, the web contract and the menu-bar conventions describe the group, and a new test covers its order, presses, keyboard, both narrowing steps, a host's changes and the empty group.

The group reads the same nested-list markup as the site menu, with no attributes of its own for commands, icons or glyphs. The Pins menu is a title with its list, and a pin's icon is the content of its link, as a site identity's logo is.

## 0.44.2

This release implements PUDL specification 0.6.0. Update `pudl.css`.

- Code blocks, code surfaces and monospace paths now turn the monospace face's ligatures off. On Windows `--mono` resolves to Cascadia Code, which joins characters by default, so a Markdown table's `|---|` was drawn as one line and `!=` as a single sign. Text that is read character for character now shows each character as written, and an editor inside a code surface inherits the setting.
- The reference page says so under Document tabs and code, and a new test checks the setting on each of the three, and on text inside a code surface.

## 0.44.1

This release implements PUDL specification 0.6.0. Update `pudl.css`. A project that carries its own stopgap rule for disabled buttons can delete it.

- A disabled button of any kind now looks like a disabled plain button. The disabled rules set no text colour or border, so a disabled `.btn-primary` kept its accent text on the neutral face, white on light grey in the light theme and dark on dark in the dark theme, faded to almost nothing; a disabled `.btn-danger` kept its danger text and border. They now set the ordinary text colour and border, and come after the button kinds, so no kind's own rules, hovered, pressed or latched, show through.
- A button disabled by its `<fieldset disabled>` now looks disabled. The rules matched only the `disabled` attribute, so such a button was drawn enabled and did nothing when pressed; they now match `:disabled`.
- The reference page says, under Buttons, that a disabled button of any kind looks like a disabled plain button. A new test compares disabled primary, danger, latched, fieldset-disabled, `.is-disabled` and `aria-disabled` link buttons with a disabled plain button in both themes.

## 0.44.0

This release implements PUDL specification 0.6.0. Update `pudl.css` and copy the complete `fonts/` directory together. Remove preloads of the original whole fonts to obtain the saving.

- Inter now loads by script through Unicode-range font faces. English text downloads 162,188 bytes upright and 179,156 bytes italic, about 54% less than the corresponding whole fonts. The Latin subset includes footnote arrows. Both variable axes, OpenType features, and the original character coverage are retained. This addresses issue #11.
- The committed subsets have a reproducible fontTools build and verification check. Browser regressions cover demand loading for every subset and text metrics against the whole fonts. The whole files remain available for existing direct links.
- Issue #10 remains addressed by the crafted sharing URLs shipped in 0.39.0. The sharing regressions verify that copying an article link preserves the full workspace URL; no history-only address mode is introduced.

## 0.43.0

This release implements PUDL specification 0.6.0. Update `pudl.css` and `pudl-md.js` together. The [persistent sidebar guide](docs/PERSISTENT-SIDEBAR.md) documents opt-in behavior and host adoption.

- Master-detail layouts can retain an operable handle after collapse and in narrow presentation. Desktop width, collapse, and narrow pane selection remain separate, and hidden content stays mounted.
- Host-handled pane requests support refusal and stale asynchronous completion checks. The article-reader example keeps navigation in the URL and supports Back and Forward.
- Persistent handles provide RTL gestures, keyboard commands, focus transfer, configurable sizing, and click/tap command hooks. Container changes and pointer cancellation restore the starting requested state without saving a change.
- Legacy sidebar pointer cancellation now rolls back instead of committing the preview width. Existing layouts and generic splitters otherwise retain their behavior.

## 0.42.0

This release implements PUDL specification 0.6.0. Update `pudl.css` to adopt the menu styling. Existing site overrides continue to take precedence.

- Each menu group now forms one subtly raised surface, using a raised fill, raised border, and shadow in both themes. Menu-bar topbars use the surface background in the light theme, with readable menu and toolbar text. Existing menu-group tokens remain available for customization.

## 0.41.0

This release implements PUDL specification 0.6.0. The [responsive workspace guide](docs/RESPONSIVE-WORKSPACES.md) documents the new contracts and adoption steps. Update `pudl.css`, `pudl-menu.js`, `pudl-menubar.js`, `pudl-windows.css`, `pudl-windows.js`, and `pudl-split.js` together.

- Windows can opt into maximized-only narrow presentation while retaining their requested URL placement. Restrictions cover menus, keyboard controls, gestures, script calls, and stale callbacks. Widening restores saved floating or docked placement without remounting content.
- Menus use the available visible viewport height, follow visual viewport changes, and show independent overflow arrows in reserved gutters. Replaced submenu content starts at its first row.
- Splitter targets and visible rules have independent sizing tokens. Tracks now occupy layout space, including the default six-pixel track. Mounted single-pane presentation preserves the split value, and pointer cancellation restores the pre-drag value.
- Compact window chrome retains the title and menu. Target and glyph sizes can be set independently, including in docked title bars.
- Menu groups expose background, border, and shadow tokens while retaining existing defaults. The guide documents workspace-level taskbars and keeps independent list/detail navigation outside this release.

## 0.40.0

This release implements PUDL specification 0.6.0. The [menu-bar migration guide](docs/MENU-BAR-MIGRATION.md) documents changes for hosts and applets.

- Menu titles have stable IDs independent of translated labels. Standard menus are ordered consistently, empty declared slots appear when populated, and applet contributions are limited to Go, View, and Help. Exact-label routing remains supported for migration.
- Contributed applet shortcuts retain their original scope, including nested commands. Open menus close when their active source changes or disappears, and stale command invocation is rejected.
- `pudlWindows.menuCommands()` provides shared, capability-based window commands. A Window menu can opt into generated management commands and an open-window list with `data-menubar-windows`.
- Legacy applet commands remain available in an Actions menu beside their identity menu. Generated articles place Print under File and use explicit content-link and window-close labels. Explicit applet menu definitions remain under their author's control.

## 0.39.2

- Clicking a menu group's hamburger glyph again closes its first menu. The glyph is now a native button associated with the popup, and an explicit menu anchor keeps the panel aligned with its title when there are multiple invokers. Regression tests cover repeated clicks in both layouts and repeated touch taps in the collapsed mobile layout. Projects should update `pudl-menubar.js`, `pudl-menu.js`, and `pudl.css`.

## 0.39.1

- Clicking an open menu-bar title closes its menu, including a menu opened by hovering from another title and the collapsed menu button. The active title now targets its native popover, preventing light dismiss from closing it before the click handler runs. Existing keyboard navigation and outside-click dismissal are preserved. Projects need only update `pudl-menubar.js`.

## 0.39.0

This release implements PUDL specification 0.6.0.

- Clicking a menu group's hamburger glyph consistently opens its first menu. Opening now happens on click, after the pointer gesture, so the browser no longer dismisses the panel immediately after it opens. The glyph also preserves focus for returning to the previous control when a command finishes.

- Windows can supply a crafted share URL through `data-win-href`. Copy the link is available in the window menu and uses the same address in an article's menu bar. The title bar's page link is the fallback. `pudlWindows.shareURL()` and `copyLink()` expose the behavior to hosts, with a manual-copy prompt when clipboard access fails and a `pudl:window-link-copy` result event. Sharing preserves the current workspace URL and introduces no history-only state. This addresses article sharing from issue #10; copying the address bar continues to share the full workspace.

## 0.38.0

This release adds the menu bar. It implements PUDL specification 0.6.0.

- The new optional `pudl-menubar.js` builds an application's menu bar in its topbar from a `nav[data-menubar]`. The host menu is the site's own, rendered as a hidden nested list in the bar, whose links and buttons are its commands, so it shows content before any script and a command does what a reader's click on its link or button would. The front menu, to its right, belongs to what is in front: the applet in the front window, through `menus()` or `commands()`, or its article, through a hidden `nav[data-page-menu]` of links; with no window in front, the page's own.
- Each menu is one raised surface in the topbar's chip colours with the new menu glyph, `--glyph-menu`, and flat titles; the open title is pressed in. Panels hold commands, separators, headings, submenus, ticks and shortcuts.
- A front menu may not use the host's titles and may add to them only below its name, never changing the host's commands; what breaks a rule, or claims a reserved key, is left out with a console warning naming it.
- Shortcuts are written `Mod+S`, Ctrl or ⌘ by platform, shown in each platform's form and announced. A front menu's work while focus is in what it belongs to.
- The bar is one tab stop and follows the WAI-ARIA menu bar pattern, with `accesskey="m"` on its first title. When it does not fit it becomes one menu button opening one level at a time.
- With a menu bar on the page, an applet's commands live in its front menu: the window menu keeps the window's own commands, and the Commands row above an applet on its page does not appear.
- `pudlApplets.menuSourceIn()` and `pudlMenu.place()` are new, for the menu bar.
- The bar is a script of its own, the host menu comes from markup rather than a script's object, shortcuts use `Mod` for the platform's command key, and a bar that does not fit collapses straight to one button, without a middle step.

## 0.37.3

- In the dark theme a menu row under the pointer, or with focus, shows again. The panel is `--dialog-bg`, which the dark theme sets to `--surface-alt`, and a hovered row was filled with `--surface-alt` too. The row now takes a shade of the panel's own colour, `--menu-row-hover`, in both themes.

## 0.37.2

- With reduced motion asked for, a menu opened from the keyboard takes focus into its first row again. The reduced-motion rule set every transition to a hundredth of a millisecond, the usual trick, and since the default transition property is `all`, that switched on a transition of every property on every element, visibility included. A menu panel, hidden while it is placed, was still hidden for that moment when focus tried to move into it, so focus stayed on the button. Transitions now take no time at all under reduced motion. A project that listens for `transitionend` will not hear it then, which is what no transition means.

## 0.37.1

This release implements PUDL specification 0.5.1.

- Pressing a window's title bar now gives it the keyboard. The press is cancelled so that a drag selects no text, which also stopped the browser moving focus, so keys still went to the window behind. A window the reader brings forward, by its title bar, frame, dock tab, a list row or its window menu, now gets focus back on whatever last had it inside, or the first time on an element marked `autofocus` in its body, or else on its title bar. A window that already holds focus keeps it, and a fetched window still takes focus only if the reader has not moved on.

## 0.37.0

This release implements PUDL specification 0.5.0.

- **Tabs in the topbar.** A `nav.topbar-tabs` of links between the brand and the chrome holds a site's main sections as tabs, as a browser puts its tabs in its title bar. The row stands on the topbar's bottom edge; the tabs are raised in the topbar's chip colours, and the one marked `aria-current` stands flat and taller, covers the topbar's bottom border and takes the colour below it, `--bg` unless `--section-current-bg` on the row says otherwise, so it opens into the page. On a phone the tabs take the topbar's last row and scroll sideways.
- The topbar's vertical padding is now `--tb-pad-y`, which the tabs read to reach its edge.

## 0.36.0

This release implements PUDL specification 0.4.0.

- A segmented control marked `data-seg-menu` becomes a pop-up button on a phone, for switchers that take too much of a topbar. `pudl-menu.js` builds a menu button beside the segments, labelled with the current choice and named with the control's `aria-label` and that choice, whose menu lists every choice with a tick on the current one. At 640px or narrower the segments hide and the button shows; wider, nothing changes, and without script the segments stay. A link choice stays a link to the same address, and a button choice presses its segment, so the page's handlers run as before. `pudlMenu.refresh()` takes in controls added by script.

## 0.35.1

This release implements PUDL specification 0.3.2.

- A window sized by its content has a frame of a single hairline, without the 5px frame band, since the band reads as a border to drag and this window cannot be resized. Its title bar and body sit flush inside the hairline.
- A docked window's free edge carries the grip glyph at rest, just outside the window at the middle of the edge, so the reader can see that the dock resizes. Before, nothing showed it until the pointer found the edge.

## 0.35.0

This release adds windows sized by their content. It implements PUDL specification 0.3.0.

- A window marked `data-win-size="content"` takes its content's width and height and follows them as they change, larger and smaller, from a fixed top-left corner, so an applet whose settings add fields resizes its window by doing so, with nothing to call. It stops at the right and bottom of the workspace, where its body scrolls. It cannot be resized, maximised, snapped or docked: its resize edges and its maximise and dock buttons go, its window menu offers Reset position, and an address or script asking otherwise leaves it floating. Its address keeps an ordinary floating placement, whose size it ignores.
- An applet in such a window is told `fit: "flow"`.
- A window the reader sizes may carry `data-win-min="w,h"` and `data-win-max="w,h"` in pixels, which dragging, the keyboard and an address all respect.
- The layout picker's zones no longer spill out of their thumbnails in a window menu that holds a command with a tick. The indent that lines up the words of the other commands reached the zones too, which are commands with no words.
- The mode is declared on the window's markup only, not also in `pudlApplets.define()`: PUDL never builds a window for an applet, and the runtime would learn the mode only after the window was placed. And a window sized by its content does not dock, since it has no size to give a dock's strip.

## 0.34.1

This release implements PUDL specification 0.2.1.

- **Segmented controls are drawn as they were before 0.34.0.** The chosen segment is raised in the trough and the others lie flat, because with two choices a pressed-in segment beside a raised one was hard to read. The specification now defines a segmented control as a switch with more than two positions, whose chosen segment is the thumb, as macOS and iOS draw it. The segment corners of `--radius-xs` and the dimming of a disabled segment from 0.34.0 stay.
- A segmented control of links on the topbar keeps its own text colour. The topbar's rule for plain links outweighed it, so since 0.34.0 an unchosen segment's words came out in the bar's pale colour on a light segment. The rule now carries no weight from the bar, so any component on the bar keeps its own colours.

## 0.34.0

This release implements PUDL specification 0.2.0. Writing the specification's component sections found places where this implementation broke the grammar; the grammar was settled on 2026-10-01, and this release brings the web into line. Several changes are visible.

- **Segmented controls.** The chosen segment is now pressed in and the others stand raised, ready to be pressed. Before, the chosen one was raised and the rest flat, the reverse of what elevation means.
- **Fields.** A field's border is the new `--input-border`, which reaches 3:1 against every surface it sits on in both themes, as WCAG asks of a control's bounds; it was about 1.4:1. Placeholder text is `--text-muted` at full strength, about 5.5:1; it was faded to about 2:1. A disabled select keeps its sunken look and is dimmed, as every disabled field is; before, it was drawn flat. A select that is only for display should be rendered as text.
- **Switches.** The track's border is `--input-border` too, for the same reason.
- **Tabs and topbar pills** are pressed in while pressed, as every raised control is.
- **Handles.** The splitter handle and the master-detail divider carry the new `grip` glyph at rest, so they can be found without hovering.
- **Pressed and disabled states.** Glyph buttons, the notice and toast dismiss buttons, the document tab's close button, the tree toggle, the filter chip's remove button, page links, the file field's button, the switch's thumb and the layout picker's zones are pressed in while pressed. Glyph buttons, switches and segments dim when disabled and take no presses.
- **Drawn glyphs.** The filter chip's remove button draws the close glyph, and the topbar's `.theme-toggle` draws the new `theme` glyph, so both are left empty with an `aria-label`. A character a page still puts in them is hidden. The reference page and samples no longer type glyph characters anywhere.
- **The layout picker** marks the zone the window fills by drawing it pressed in as well as filling it with the accent, so it no longer rests on colour.
- **Toasts over a dialog.** A toast raised while a modal dialog is open appears inside the dialog, above its backdrop, where it can be read and dismissed, and moves back to the page's toasts when the dialog closes. Before, it sat under the backdrop and could not be reached.
- **Tokens.** New: `--input-border`, `--shadow-dialog` and `--backdrop`, which bring the theme's lighting to the dialog's shadow and backdrop, `--radius-xs` (4px) for small parts inside another control, and the glyphs `--glyph-grip` and `--glyph-theme`. Segments, the tree toggle, tooltips and the layout picker's zones take `--radius-xs` in place of radii that were off the scale.

## 0.33.1

- The window menu's "Open as a page" follows the title bar's page link itself, so a link with `target="_blank"` opens the page in a new tab from the menu as it does from the button, instead of navigating away from the windows.

This release implements PUDL specification 0.1.0. The language now has a specification of its own, in [pudl-spec](https://github.com/paulmooreparks/pudl-spec), and this repository is its web implementation, as `docs/proposals/spec-and-implementations.md` proposed and as was decided on 2026-09-30. Nothing a project sees has changed.

- The token block of `dist/pudl.css`, the palette, the scales, the glyphs and the derived tokens, is generated by `build/tokens.js` from the specification's token files, vendored in `vendor/pudl-spec/` at specification 0.1.0. Every token computes exactly as before in both themes; the only differences in the text are comments, the order of the glyphs, and quotes around named font families.
- A new test fails if the token block and the vendored tokens disagree.
- The web implementation's 1.0 waits for the specification's 1.0.

## 0.33.0

This release adds snap zones.

- A window can be snapped to a zone, a rectangle of the area the docks leave on a grid of sixths: the halves, quarters, thirds, and two thirds beside one third. It is the new mode `zone`, drawn flush like a half.
- A drag that ends at a corner snaps to that quarter. The sides, the top and the foot behave as before, except that the bottom corners are quarters rather than the dock.
- The window menu holds a layout picker, a thumbnail of each layout whose zones are buttons, each named in words, so the keyboard reaches every zone through the menu. On a window with the window menu, a mouse resting on the maximise button opens the same picker. Shift with the arrow keys still resizes, and right-click does nothing new.
- `pudlWindows.snap(key, zone)` takes a zone's name or a rectangle, moved to the nearest sixths, and null floats the window again.
- In the address a zone adds its rectangle after the floating geometry, `p.term=zone:0.06,0.05,0.55,0.75,0,0,0.5,0.5`. The four floating numbers stay, because they are always where the window returns when restored, and the rectangle follows them as a dock's size does. A zone that is a half or the whole is written and read as `left`, `right` or `maximized`, so existing addresses are unchanged.
- `pudl-menu.js` places a panel against the element its `data-menu-anchor` names, for a panel a script opens from a link.

## 0.32.0

This release adds the window menu.

- A layer carrying `data-win-menu` gives every window a menu button at the left of its title bar, and a window can carry the button itself, `data-win-action="menu"`, without the layer's attribute. The menu holds the window's own commands first (Open as a page, Minimize or Collapse, Maximize or Restore, Dock at the bottom or Undock, and Reset size and position), then the commands of what the window holds, then Close, last and after a separator.
- An applet offers commands with an optional `commands()` on its instance, returning `[{ label, run, checked, disabled }]`, asked afresh each time the menu opens. Other content adds commands when `pudl:window-menu` fires on the window, through `detail.add(label, run, { checked, disabled })`. A command with `checked` carries `aria-pressed` and shows a tick while it is on. Content cannot take over the window's own commands; `pudl:window-closing` remains the way to stop a close.
- On an applet's page, outside any window, the runtime puts a Commands menu button above an applet that has `commands()`, and removes it with the applet. `pudlApplets.commandsIn(scope)` returns the commands of the applets in a scope.
- The context-menu key or Shift+F10 on a focused title bar opens the menu, so every window command has a keyboard route.
- Reset returns a window to the placement its markup gave it.
- Two glyphs, `--glyph-gear` and `--glyph-tick`. A disabled `.menu-action` is dimmed.
- The reference page and the Files sample turn the window menu on.

## 0.31.0

This release adds splitters.

- A `.split` holds two `.split-pane`s and a `.split-handle` between them, which resizes the first. The first pane's size is a custom property on the split, `--split-a` by default, so a server renders a stored size and the stylesheet does the layout. `.stacked` puts the panes one above the other, so that an editor above a terminal needs no second component.
- The new optional `dist/pudl-split.js` makes the handle a focusable separator in the ARIA window-splitter pattern, moved by pointer, by the arrow keys along its axis, Shift for a larger step, Home and End to its limits, and returned to the stylesheet's size by Enter or a double-click. Its limits, `data-split-min` in pixels and `data-split-max` in pixels or a percentage, follow the split's own size as a window resizes it. PUDL keeps no state: `pudl:split` fires with `detail.size`, or null after a reset, for the project to store. The field is `size` rather than a width because a stacked split's is a height.
- The handle is drawn as the master-detail divider is. The divider keeps its own script, so each stands alone.
- The reference page gains a section for splitters.

## 0.30.1

- A menu panel whose rows fit no longer shows a scrollbar. `pudl-menu.js` measured the panel's natural height with `scrollHeight`, which leaves out the border and rounds down, so a panel came out two pixels, or a fraction of one, short of its content. It now measures the panel's whole rectangle and rounds up. A new suite checks the reference page's menus at display scales of 1, 1.25 and 1.92.

## 0.30.0

This release adds docked windows, specified in `docs/proposals/docked-windows.md`.

- A window's mode may be `dock-top`, `dock-bottom`, `dock-left` or `dock-right`. A docked window holds that edge of the workspace and takes the strip from every other window, which lays itself out in what remains, so nothing covers it: a maximised window ends where the dock begins, and a floating one cannot be dragged into it.
- A docked window is flush, with a hairline facing the workspace and a thin title bar. Its minimise button collapses it to that bar and expands it again. It resizes along its free edge, by pointer or with Shift and the arrow keys. Dragging a window to the foot of the workspace docks it there; dragging a docked one away, Enter or a double-click on its title bar undocks it; a `data-win-action="dock"` button does either; `pudlWindows.dock(key, edge)` docks at any edge from script.
- An edge shows one docked window at a time, the others waiting behind it and coming forward from the dock of open windows. A tabbed dock for an edge with several is specified but not yet built. A side dock shows at the bottom of a layer 640px wide or less.
- In the address a docked placement adds its strip's size, `p.site=dock-bottom:0.06,0.05,0.55,0.75,0.22`. Every window's fractions are now of the inner area the docks leave, which is the whole layer when nothing is docked, so existing addresses are unchanged.
- Loading an address no longer rewrites a window's size to fit the room at that moment. It keeps the size the address gives, and only brings a window back inside the layer if it hangs off an edge.
- Two glyphs, `--glyph-dock` and `--glyph-undock`.

## 0.29.2

This release fills gaps that sites built on PUDL had been working around in their own stylesheets.

- A narrow master-detail layout no longer forces its detail pane to `display: block`. PUDL hides only the pane it is not showing, so a detail pane a project lays out as a flex column stays one.
- A topbar pill for the page the reader is on, marked `aria-current`, is pressed in, as the current tab of a dock or a segmented control is, with the system's highlight in forced colours.
- A menu button on the topbar may hold its words in a `.menu-btn-label`, which a phone cuts short with an ellipsis.
- `pudl-code.js` gives a code block it enhances `tabindex="0"` when it has none, so a block that scrolls can be scrolled from the keyboard.
- The README calls `.form-help` a field's hint as well as its help text, so it can be found by either name.

## 0.29.1

- The topbar no longer widens the page on a phone (#9). It and its chrome wrap, the chrome moving to a line of its own at the end when the brand and it do not fit on one, with less padding on a phone. A pill may carry a glyph and a `.topbar-pill-label`, and on a phone it then shows only the glyph, its words still heard.
- A new suite loads every sample and the reference page at 320 and 390 pixels wide and fails if any scrolls sideways, so a page that outgrows a phone is caught.

## 0.29.0

This release adds Copy and Download to code blocks.

- The new optional `dist/pudl-code.js` gives a `pre` marked `data-code-actions` a strip above the code that names its language and holds raised Copy and Download buttons. Copy takes the code's text without its highlighting, confirms with a check and a live region, and where the clipboard is unavailable or refused selects the code and says how to copy it. Download names the file from `data-code-filename`, else by the language's extension, else `code.txt`. `pudlCode.names`, `.extensions` and `.words` are a project's to extend, `pudlCode.enhance()` takes in blocks added later or a bare `pre` from Markdown, and `pudl:code-copy` and `pudl:code-download` fire after each action.
- The header strip is opt-in and knows about thirty languages. The fallback message names both Ctrl+C and Command+C rather than guessing the platform from `navigator.platform`, which browsers are withdrawing, and a second copy restarts the confirmation rather than stacking timers.
- Two glyphs, `--glyph-copy` and `--glyph-download`, and `.visually-hidden`, for words meant for assistive technology alone. The document tab's unsaved mark keeps its own way of hiding its words, because the dot and the words are one element.
- The reference page's code block and the Files sample's Markdown preview carry the actions.

## 0.28.0

A third sample, and what building it asked of PUDL.

- **Files**, `samples/files.html`: a file browser and editor with a folder tree, a path bar, the folder's contents as a grid, files dropped on it to add them, and an editor with document tabs and a Markdown preview in windows. The editor and the preview are applets that answer requests, so the browser opens a file without naming either.- The article reader's listings are highlighted code blocks, its toolbar has minimise-all and restore-all, and its rows carry descriptions that wrap. The expense tracker takes a receipt dropped on its attach form.
- `pudl:window-closing` fires before a close by button, Escape or script, on the window and each child closing with it, and can be cancelled, so an editor with unsaved changes can keep its window while it asks. A close by the address cannot be refused.
- `pudlWindows.retitle(key, title)` changes a window's title, and the title bar's spoken name, the dock tab and the list row follow.
- `data-win-pane="off"` on a window layer leaves a master-detail layout's `data-md-pane` to the server, for a layout whose detail pane holds a record of its own with windows over it. Before, the script set it to `list` whenever no window showed, so on a phone that record could not be reached.
- Requests to an applet made while its script is still loading queue up and all arrive, in order. Before, each overwrote the last.
- Region links keep their own parameters as written, so `?path=/notes` no longer becomes `?path=%2Fnotes`, and `pudlRegions.refresh()` lets a page that renders region links by script bring them up to date with the windows.
- `pre.code` shows a focus ring, for a block that scrolls and so carries `tabindex="0"`, and tree rows grow into touch targets in a narrow master-detail sidebar.

## 0.27.0

This release adds requests between applets.

- An applet declares in `define()` the requests it serves, `handles: { verb: { param, kinds, extra, reuse } }`, and how many windows of it may be open, `instances`, up to nine. A caller asks with `pudlApplets.request(verb, { path, kind, … }, from)` and never names an applet, and `pudlApplets.can(verb, kind)` says whether anything would answer. The verbs and kinds are the project's own words.
- On a page with windows, a request goes to the applet's newest open instance through its `setState()`, bringing its window forward, or opens a new instance, `name`, `name-2` and so on, which starts with the request's state ahead of the host's; with `reuse: false` it opens a new one each time until the limit, when the newest takes it. On a page without windows it goes to the applet's page, in a new tab when that is the caller's page.
- A request for a fresh instance is written `reuse: false`. An applet's instances are found by the mounts in the open windows, not by a pattern of keys, so an unrelated window keyed like `terminal-2` is passed over rather than taken for a terminal. And routing depends on whether the page has windows, not on whether the caller sits in one, so a request from a desktop's toolbar no longer leaves the desktop.
- `opts.instance` and `pudl:applet-state`'s `detail.instance` carry the key an instance goes by, so a host can keep each instance's state apart.
- A window whose markup comes from a template, keyed `name-2` to `name-9` with no template of its own, takes `name`'s template with the number added to its title.
- The windows script keeps the page's own query parameters exactly as written when it writes the address. It used to re-encode them, turning a readable `?path=/notes` into `?path=%2Fnotes`.

## 0.26.0

This release adds the editor's components: document tabs, syntax colours and code surfaces.

- Document tabs. A `.tablist.doc-tabs` holds tabs that come and go, one per open document, and looks like every other tab. A `.doc-tab-dirty` mark is a drawn dot whose words are heard and not seen, rather than a typed "●"; a `.doc-tab-close` is a small raised button inside the tab, hidden from assistive technology because a tab list may hold only tabs. `pudl-tabs.js` makes the list one stop in the Tab order, moves focus with the arrow keys, Home and End, and turns the close button and the Delete key into `pudl:tab-close`, for the host to decide.
- Syntax colours. Ten `--syntax-` tokens, set for both themes and for print, each reaching 4.5:1 on every surface code sits on, so highlighters take their colours from the theme. The new optional `dist/pudl-hljs.css` maps highlight.js onto them, and the README has the CodeMirror 6 recipe. The dark theme's error colour is its own, because `--danger` falls short of 4.5:1 on an editor's surface.
- Code surfaces. `pre.code` is a flat panel for code to read, and `.code-surface` a sunken one for an editor, since sunken means input, and a single sunken surface would have made a code block look editable.
- The reference page gains a section for document tabs and code, which the axe suite checks for contrast in both themes.

## 0.25.0

This release adds trees, path bars, grids, file glyphs and drop targets; document tabs and syntax colours follow in 0.26.0.

- Trees. A `ul.tree` of nested lists of links is a hierarchy of places, an indented list without script. The new optional `dist/pudl-tree.js` makes it the ARIA tree pattern, after the WAI-ARIA navigation tree: one tab stop, arrow keys that move, open and close, mirrored right to left, Home and End, type-ahead, and a small raised toggle on each node with children. `pudl:tree-toggle` says when a node opens or closes. The link is the tree item, and the toggle is an element of its own.
- Path bars. `nav.path` shows where the reader is inside a hierarchy they are browsing, with drawn separators that assistive technology does not hear. It is never a site's breadcrumb trail, which PUDL still does not have; the README says so.
- Grids. A `.data-table` with `role="grid"` is a table whose rows are choices, each row's first link its address. The new optional `dist/pudl-grid.js` makes it one tab stop, moves the selection with the arrow keys, Home, End, Page Up and Page Down, and opens a row with Enter or a double-click by following its link, or with `pudl:row-open` when it has none; `pudl:row-select` says when the selection moves. ARIA allows `aria-selected` on a row only in a grid, which the README now says.
- Glyphs for files and documents, `--glyph-folder`, `--glyph-file`, `--glyph-document`, `--glyph-app`, `--glyph-script`, `--glyph-link` and `--glyph-home`, and `.glyph`, which draws any glyph token as an element at the size of the text around it. The glyphs carry no colours of their own, since the shape says the kind.
- Drop targets. A host sets `data-drop-over` on a `.drop-zone`, or `data-drop-target` on an item, while something is dragged over it, and PUDL rings it in the accent and shows the zone's `.drop-hint`.
- The reference page gains sections for trees and path bars, and for grids with glyphs and drop targets, which the axe suite checks. `RELEASING.md` now hashes whatever `dist/` holds.

## 0.24.0

This release wraps list metadata and adds restore-all.

- List metadata wraps. A row's `.md-meta` lines now wrap instead of running off the sidebar's edge uncut, while the title keeps to one line with its ellipsis. An item may hold several `.md-meta` lines, a date and then a description, and the README shows the markup.
- Restore-all. A link with `data-win-restore` restores every minimised window in one step, the reverse of `data-win-back`, and `pudlWindows.minimizeAll()` and `pudlWindows.restoreAll()` do both from script. The script keeps both links' `href`s current and marks each `aria-disabled="true"` while it would change nothing. A `.btn` marked `aria-disabled="true"` looks disabled and takes no clicks.
- The window in front survives minimise-all. `top` in the address may now name a minimised window, which it does after minimise-all: no window is then active, and restoring brings that window back in front, after a reload or from a shared link too. Older addresses are unaffected, and a server that marks the active window must not mark a minimised `top`.

## 0.23.1

This release makes two fixes.

- A primary button latched on is readable. With `aria-pressed="true"` it took the pressed background of an ordinary button and kept its own text colour, so its label nearly vanished. It now keeps its accent fill and its text and is pressed in, flat and shaded from the top, rather than darkened, since the dark theme's accent carries dark text. The reference page has one, which the axe suite checks in both themes.
- A GET form in a region leaves its empty fields out of the address, so clearing a filter no longer leaves `?q=` behind.
- The script comments of `pudl-menu.js` and `pudl-dialog.js` are corrected, and the reference page, README and contract agree with 0.23.0 throughout.

## 0.23.0

This release answers issues #7 and #8 and makes two changes from the 0.22 review. A project upgrading should read the last two items.

- Default windows (#8). The layer names windows that are part of a page's furniture, `data-win-default="site"`, and an address that names no windows opens them where their markup puts them, keeping the page's plain address plain while they stay that way. An address with `open`, even an empty `open=`, means exactly what it says, so closing the last window on such a page writes `open=`. The layer names the defaults, not the windows' own markup as the issue proposed, because a default window the address has closed is not in the page for the script to find.
- `pudl:window-close` says why a window closed, in `detail.reason`: `button`, `key`, `script`, `parent`, `replace` or `address`. A project can remember a reader's close of a default window from it (#8).
- Links inside a window can swap regions (#7). A link outside every region carrying `data-region-link`, or inside an element that does, such as a window's body, swaps regions as a link inside one does, so following a tag or category link in an article keeps the windows open. It is opt-in, and every other link is unchanged. The article reader's "Raised means pressable" shows it.
- **Only `pudlApplets.define()` names an applet's script and stylesheet.** A mount's `data-applet-src` and `data-applet-css` are no longer read, and a mount that carries them warns in the console. A page's markup can come from people other than its authors, and a mount that named a script let them choose what ran, even on the page's own origin, which may serve uploaded files. A mount's `data-applet-page` is still read, on the page's origin only. A project moves the two attributes into its `define()` call.
- **A window is a `<section class="win">`.** ARIA allows `role="dialog"` on a section but not on an article, which the documented markup used before. An `<article>` window still works, but axe reports its role; the README, the contract, the reference page and the samples use `<section>`.
- The axe suite also checks that roles are allowed where they are used, and a new suite covers default windows and links inside windows.

## 0.22.1

This release makes accessibility fixes from issues #5 and #6.

- The default theme meets WCAG 2.2 AA text contrast everywhere axe checks it, in both themes. A status badge's text is now its status colour drawn toward the text colour (62% of the status colour), since a mid-tone colour cannot reach 4.5:1 on a tint of itself; the status tokens are unchanged, so notices, glyphs and a theme's own colours are unaffected. A filter chip's kind label is no longer faded with opacity. A segmented control's choices not taken are in the full text colour, the chosen one still marked by being raised, and they hover with a light tint.
- A window's body is a tab stop, given by `pudl-windows.js`, so a window whose content has no link or field can still be scrolled from the keyboard. Its focus ring is drawn inside it. A master-detail detail pane takes `tabindex="0"` in its markup for the same reason, and has the same ring.
- A switch is `button.switch` with `role="switch"`, which is what lets it carry `aria-checked`. The contract and the reference page say so.
- A new test suite runs axe for contrast, keyboard scrolling and ARIA on the reference page and the samples in both themes, in all three engines.

## 0.22.0

A review of the whole implementation for performance, clarity and security.

**Performance**

- Dragging a window does much less work, in Firefox and Safari above all. The window now moves by transform on a layer of its own, so each step is composited instead of laid out and repainted with its shadow, and it follows the pointer once a frame however many pointer events arrive. The four placement properties are registered as non-inherited numbers, so changing them restyles the window alone rather than everything inside it, which had made moving and resizing a full window slower the more it held. With a thousand elements in a window, the main-thread work of a drag fell by about half in Firefox and by about seven times in Chromium, and one step of moving the window no longer grows with its content in any engine.
- Dragging the master-detail divider no longer forces the page to be laid out on every pointer event. It measures once at the start and follows once a frame.
- A window change no longer makes the regions script search the whole document once for every parameter of every link in every region. It finds what it needs once per pass.
- An open menu is placed again once a frame while the page scrolls, and not at all while its own rows scroll.

**Security**

- Window markup and swapped regions must be `text/html` from the page's own origin. Both fetches refuse another origin, a redirect to one included, so an open redirect on a site can no longer bring another site's markup into its pages. Regions fall back to an ordinary navigation, and windows to the link's own page.
- An applet mount's `data-applet-src` and `data-applet-css` must name the page's own origin. A site that shows markup from its readers, with a sanitiser that lets data attributes through as DOMPurify does by default, could otherwise have had a reader's comment load a script from anywhere. `define()` may still name any origin. A mount that names another origin fails and loads nothing.
- `pudlToast()` takes only the kinds it knows as a class.
- The expense tracker sample refuses a category, currency or account outside its lists, escapes every stored value it writes into the page, ignores sort and filter names that are not its own, and writes a CSV cell that a spreadsheet would read as a formula as text.

**Correctness**

- `--md-sidebar-min` may be written in any length, such as `12rem`; the divider's limits and the stylesheet's now agree.
- The stylesheet sizes the full-height master-detail page, dialogs and menus with `svh`, as the README advises, so on a phone they never run under the browser's bars.
- `command="request-close"` asks a dialog to close, which its cancel handler may refuse, in browsers that have `requestClose()`.
- When a browser refuses to change the address because a page has changed it too often, as Firefox and Safari do after quick clicking between windows, the windows keep working and the address is written once things are quiet.

## 0.21.0

This release follows up on applets and their hosts; `docs/proposals/applet-followups.md` records the design.

- Preset links. A link with `data-applet-preset="name"` hands its state to a running instance of that applet in the same window as the link, or like the link in none, instead of navigating: the value of the mount's `data-applet-param` if the link carries it, otherwise the link's whole query. A mount that keeps its state in the address gets it there as a new history entry, so Back undoes the preset. With no instance to take it, the link is an ordinary link.
- A host hands an applet its state. Just before `init`, `pudl:applet-state` fires on the mount, and whatever a listener puts in `detail.state` arrives as `opts.state`. With `pudl:applet-change`, that is all a window needs to keep an applet's continuity, and PUDL still keeps no state and never hands out an instance.
- The README's applet section shows how to scale content with a size of its own, such as a canvas, into a fill habitat, with the pointer mapping that goes with it, and when an article in a window wants `data-applet-fit="flow"`.
- The article reader keeps its windowed mixer's colours for the visit through the new event, in `samples/applets/continuity.js`; its colour-mixing article's mount flows; and `samples/applet-article.html` sets its mixer from preset links.

## 0.20.0

This release covers applets and their hosts; `docs/proposals/applet-hosts.md` records the design.

- A registry. `pudlApplets.define(name, { src, css, page, ver })` names an applet's files once, and a mount then needs only `data-applet="name"`. `ver` is added to the script and stylesheet as `?v=`, so a new version is one edit. A mount's own `data-applet-src`, `-css` and `-page` still work, and each wins over the registry separately. `define()` may run before or after `pudl-applets.js` has started the page's mounts.
- `opts.fit`, `"fill"` or `"flow"`, tells the applet how to size itself: fill the definite box a window or a bare page gives it, or flow with an article's column and let the page scroll. A window fills and anything else flows, unless the mount's `data-applet-fit` says otherwise, and the mount's `data-applet-fit` reads the answer for the applet's stylesheet.
- **Changed:** `opts.ownsUrl` is true only on the applet's own page, the one `data-applet-page` or the registry names. Before, any applet outside a window was told it owned the address, so one embedded in an article could rewrite the article's. A mount with no page named still counts as on its own page, as before. **A project must** name the page of any applet it embeds in another page, or the applet will still write that page's address.
- Applet state. An instance may offer `state()` and `setState(s)`, `opts.state` hands it the state its host kept, and `opts.changed(s)` fires `pudl:applet-change` on the mount. PUDL keeps no state, with one opt-in: a mount outside a window with `data-applet-param="name"` keeps its state in the page's query under that name, replaced rather than pushed, and Back and Forward hand a changed value to `setState()`.
- Fixed: an applet inside a region swapped by `pudl-regions.js` was never destroyed, and one arriving with a new region never started. The runtime now does both on every swap.
- `pudl-regions.js` carries an applet's `data-applet-param` from address to address as it carries the windows' parameters, and a change in it alone no longer fetches regions on Back or Forward.
- The README's applet section documents the fill and flow sizing patterns: the measuring wrapper for a square board, why a size container's box must come from its layout, and `svh` rather than `dvh` on phones.
- The colour mixer sample offers `state()` and `setState()`, and `samples/applet-article.html` embeds it in an article, named through `samples/applets/registry.js`, with its mix in the article's address.

## 0.19.2

Fixes found by making the expense tracker a working application. Nothing a project relies on changes.

- A one-line field is one height whatever its type. Browsers drew a `.form-select` and a date `.form-input` 2px taller than a text field, so fields side by side in a form did not line up. `.form-input` and `.form-select` are now 36px tall; a select with `multiple` or `size` keeps its own height.
- A stacked `.data-table.stack` keeps its caption across the full width. The caption was squeezed into a narrow column, a word to a line, once the table became cards.
- In a stacked table, everything in a cell's value stays together at the end, beside its label at the start. A cell holding two badges spread them across the row, and a `.data-table-check` cell was squeezed to 1% of the row's width.
- On a phone, a pagination's summary takes a line of its own, so the page links stay on one.
- The expense tracker sample works: its list sorts by any column, filters by search, trip, account and state with filter chips, pages, and submits or deletes several expenses at once; each expense moves from draft through approval to paid, takes a receipt and keeps a history; the Trips and Reports sections, unreachable before, are there, with reports downloadable as CSV; and the data can be reset. A script, `samples/expenses-app.js`, stands in for the server, since GitHub Pages has none. The archive page is now the list's Paid view, and its old address leads there.
- The tests gain a suite for the expense tracker, and `PUDL_EXECUTABLE` runs them with a browser already installed.

## 0.19.1

- The section tab bar keeps its height when no tab is current. The current tab stands 4px taller than the others, so the bar used to grow on a page inside a section and shrink on a page outside every section, and the content below jumped. The bar now always reserves that space.

## 0.19.0

- The contract. `docs/CONTRACT.md` lists everything a project may rely on: the files, the tokens a theme may set or read, the classes, data attributes, events, functions and address grammar, and what is internal. From 1.0 it changes only in a major release, and anything removed from it is deprecated first.
- The tests are in the repository. `npm test` runs fourteen suites against the samples and the reference page in Chromium, `npm run test:all` runs them in Firefox and WebKit too, and GitHub Actions runs all three engines on every push and pull request.
- A window that arrives after the reader has moved on no longer takes focus. Opening a window and pressing <kbd>/</kbd> before its content arrived left focus on the window rather than the launcher's filter, so what the reader typed went nowhere. A window now takes focus only if focus has not moved since it was asked for.
- A menu's filter is cleared every time its panel opens. When a browser merged the toggle events of a quick close and reopen, the old filter text stayed.
## 0.18.0

- Form states. A field marked `aria-invalid="true"` takes a danger border and focus ring beside its `.form-error`; a required field's label carries an asterisk drawn from its `required` attribute; and there are `.form-help`, `.form-fieldset` with its legend, `.form-options` for radio and checkbox groups, `.form-file` with a raised button, and a disabled state.
- Tabs within a page, in the ARIA tab pattern, styled like section tabs. The new optional `dist/pudl-tabs.js` shows one panel at a time, adds the arrow keys and a single tab stop, and keeps the chosen panel in the address's fragment; without it every panel shows.
- Empty and loading states: `.empty-state` with a drawn glyph, title, text and actions, and `.loading` with a `.spinner` in a status element.
- Tooltips. The new optional `dist/pudl-tooltip.js` names glyph-only controls from their `aria-label`, or any element from `data-tooltip`, on hover or keyboard focus, hoverable and dismissible with Escape.
- Pagination, with raised page links, the current page pressed in, and previous and next glyphs that mirror on right-to-left pages.
- The expense tracker sample, `samples/expenses.html` and three pages beside it, shows the components of 0.17.0 and 0.18.0 working together. It is to grow into a full demonstration application with a server for 1.0.
- The reference page gains the new form states and sections for tabs within a page, empty and loading states, and pagination, and its icon buttons carry proper names.

## 0.17.0

- Data tables. `.data-table` in a `.data-table-wrap` lists many records: a sticky header, sortable columns whose raised headers carry `aria-sort` and a direction glyph and link to the other order, `.num` columns aligned to the end, row selection by checkbox or `aria-selected` with a tint and an edge, a `.data-table-empty` row, and with `.stack`, rows as labelled cards when the table is narrow.
- Notices and toasts. A `.notice` stays until dealt with; a `.toast` confirms and leaves. Both come in information, `.positive`, `.warn` and `.danger`, each with its own drawn glyph and a coloured edge. The new optional `dist/pudl-toast.js` provides `pudlToast()`, timing that pauses while the reader is on a toast, dismiss buttons, and the re-insertion that makes a server's toast heard by screen readers.
- Menus summoned by a key. A `.menu-panel` with `data-menu-key` opens on that key outside editable fields, with focus in its filter; a panel with no button opens as a palette near the top of the window; and Enter with no match left submits the filter's form. This is PUDL's go palette, recorded in `docs/proposals/go-palette.md`.
- New glyphs for sorting and for the kinds of notice.
- The reference page gains sections for data tables and for notices and toasts, and its launcher opens with <kbd>/</kbd>, as do the article reader's.

## 0.16.0

The consistency pass from `docs/proposals/road-to-1.0.md`. Every old name keeps working; the README's "Names that changed" lists them.

- Section tabs are a notebook. The bar is a recessed band, each tab the reader can go to is raised, and the tab for where they are, marked `aria-current`, is flat and opens into the content below. `aria-current="true"` marks the section a page belongs to. The current tab takes `--section-current-bg`, which a page on the page background sets to `var(--bg)`. Before, every tab was flat text, so by PUDL's own rules none of them looked pressable.
- State is marked with ARIA attributes everywhere: `aria-current` on section tabs, list rows and view links in a segmented control, and `aria-pressed` or `aria-checked` on segmented buttons. `.active` remains an alias.
- Badges, chips and filter chips look distinct. A chip is now a neutral label rather than accent-tinted; a filter chip is outlined, and its × is a small raised button.
- The switch is a raised thumb in a sunken track.
- Every chrome glyph is an SVG mask from the stylesheet: badge glyphs, the form error's warning, the menu caret, the back link, the window buttons, the dock's dots and the child-row branch. None can turn into a colour emoji, and all follow the theme. In high-contrast mode they paint in the system's colours.
- A type scale, `--text-2xs` to `--text-3xl`, which every size in PUDL now uses, and base sizes for `h1` to `h4` that any class overrides. A few sizes moved by a pixel to land on the scale.
- A spacing grid, `--space-1` to `--space-6`, used for spacing between and around components. Cards and dialogs have 16px and 24px of padding, on the grid.
- Dialogs are native `<dialog class="dialog">` elements with a 40% `::backdrop`, opened by `command="show-modal"` buttons, and the new optional `dist/pudl-dialog.js` supplies those buttons in browsers that lack them.
- Renamed: `--pr` is `--positive`, `.badge.pr` is `.badge.positive`, and `.fc-kind` is `.filter-chip-kind`.
- The reference page reads as one document, in prose throughout, with a section for section tabs and a rewritten list of invariants.

## 0.15.0

- High contrast. In Windows' high-contrast mode, which removes every shadow, focus is drawn as a real outline, controls keep visible borders, and selected and pressed states, the active window's title bar and the current dock tab take the system's highlight colours. Before, focus did not show at all in that mode.
- Reduced motion. A reader who asks their system for less motion gets no transitions or animations.
- Right to left. The stylesheet uses logical properties where the reading direction matters, and on a right-to-left page the master-detail sidebar, its divider (pointer and keys), the selected-row marker, menu placement, the back link and child-row glyphs, and the switch all mirror. Window positions stay physical, since they are coordinates in the URL.
- The words the scripts write into the page can come from the page: `data-win-text-maximize`, `-restore`, `-minimized` and `-head` on the window layer, `data-menu-empty` on a menu panel, and `data-md-valuetext` on the sidebar divider. English remains the default.
- Print. Chrome does not print, pages print black on white from either theme, a master-detail layout showing a record prints the record alone, and the window in front prints as the page's content while other windows, and what lies under them, do not.
- The form error's ⚠ and the window's ↗ ask for their text form, so they cannot render as colour emoji.
- The first release on the road to 1.0; `docs/proposals/road-to-1.0.md` sets out the rest.

## 0.14.0

- The master-detail sidebar resizes. The new optional `dist/pudl-md.js` makes the `.md-resize` divider move by pointer and by keyboard (Left and Right, Shift for a larger step, Home and End to the limits, double-click to reset), following the ARIA window-splitter pattern. It sets `--md-sidebar-w` on the layout and fires `pudl:md-resize` when a change ends; PUDL keeps no state, and the README shows how to remember the width without a jump on load.
- The stylesheet holds the sidebar between `--md-sidebar-min` (180px) and half the layout, whether the width came from a drag, a stored preference or a theme.
- Fixed: windows could rise over what surrounded their host, such as the half of a master-detail divider that overlaps the detail pane, which a maximised window then covered. `.win-host` now keeps its windows' stacking to itself.
- The reference page's master-detail demo and the article reader sample have working dividers, and the sample remembers the reader's width.

## 0.13.2

- The dark theme's active title bar no longer draws an accent rule along its foot, which read as a divider and pulled the eye. Its accent tint is a little stronger instead, so the active bar still stands apart from the others, and the active window keeps its accent frame and stronger shadow. A theme that wants the rule back can set it in `--win-active-shadow`.

## 0.13.1

- Fixed: the active section tab showed the bar's baseline under it, so the tab no longer read as joined to the content below. 0.12.0 let the section bar scroll sideways on a narrow screen, and a box that scrolls clips anything reaching past its edge, including the pixel by which the active tab covered the bar's bottom border. The bar now draws its baseline as part of its own background, and the active tab paints over it from inside the bar.

## 0.13.0

- A reader can choose to follow the operating system's theme. `pudl-theme.js` remembers light, dark or system; system is resolved before the first paint and follows the system's setting live. It adds `pudlSetTheme()`, `pudlThemePreference()`, `data-theme-pref` on the `<html>` element and a `pudl:theme-change` event, and a choice made in one tab reaches the others. `pudlToggleTheme()` is unchanged, and a reader with nothing saved still starts dark. The reference page has a working Light / Dark / System setting.
- An empty window dock is no longer removed from the layout. It still draws nothing, but a toolbar that uses it as its elastic middle keeps its shape when the last window closes.
- An empty chips row is hidden by the absence of chips rather than by `:empty`, which a template's whitespace defeated, leaving a thin empty bar.
- The README says that a region that is sometimes empty must still be rendered, since a swap needs a counterpart for every region.

## 0.12.0

- Regions. The new optional `dist/pudl-regions.js` makes a navigation that changes only part of a page replace only that part. A page marks the parts with `data-region`. A same-origin link or GET form inside a region fetches the target page, the same address a bookmark would fetch; if it has the same regions and window layer, the regions are swapped and the address pushed with the open windows, which stay as they were, scroll positions and running applets included. Otherwise the browser navigates normally. Back and Forward swap the regions when their part of the address changed. Same-page links and window fields in regions are kept current with the open windows.
- `pudl:regions-swap` fires after a swap, and the windows module marks the new list's rows on it.
- `pudl:windows-change` now bubbles, so a listener on the document hears it.
- The section bar no longer shrinks in a full-height layout, and scrolls sideways when its tabs outrun a narrow screen.
- The article reader sample gains category tabs, with a page per category, and its windows now come from `samples/windows/`, fetched as a server would answer them. It therefore needs a web server to run.
- `docs/proposals/window-workspace.md` records the design.

## 0.11.0

- A window opened by a link inside another window opens in that window's state: maximised from maximised, the same half from a snapped half, and from a floating window, floating one step down and to the right, wrapping to the top left at the edge. Opens from outside any window keep the markup's default. `pudl:window-place` gains `detail.opener`.
- A child window's buttons are now maximise, which also restores, and close. The samples' child windows carry both.
- The filter's apply button: a `form.md-filter-group` joins the `.md-filter` input to an `.icon-btn.md-filter-go` submit button, whose magnifying glass is drawn by the stylesheet. The reference page's master-detail demos use it.
- `--tb-link-hover`, a hover colour for links on the topbar, derived from the accent and the topbar's foreground. The brand used the page's link hover, which on a light theme was a dark colour on the dark bar; it now uses this token, and plain links on the topbar take the topbar's colours.
- The reference page's receipt child now opens floating, because the expense it is opened from floats.
- `docs/proposals/window-workspace.md` records the design.

## 0.10.0

- Applets. The new optional `dist/pudl-applets.js` lets interactive content run unchanged in a page of its own or inside a window. A mount names the applet's script, stylesheet and page; the script registers `init(root, opts)` returning an instance with `destroy()`; and `opts` says whether the applet is in a page or a window and so whether it owns the URL. The runtime loads assets once and starts and destroys applets as windows open and close. The README sets out the contract.
- `pudl:window-close` fires on each window just before it leaves the page, by any route.
- A link inside a window marked `data-win-replace` opens its target in place of that window, keeping its dock position and placement, as one history entry that Back undoes.
- `window.pudlWindows` gives scripts `open`, `replace`, `raise`, `minimize`, `close` and `state`, each doing what the matching link or button does.
- The article reader sample gains an article hosting an applet and "Next" links between articles, and `samples/colour-mixer.html` runs the same applet in a page of its own.

## 0.9.0

- The `hidden` attribute always hides, even on a component that sets its own `display`, such as `.btn`. `hidden="until-found"` is left to the browser. The per-component patches for the same problem in the windows and menu styles are gone.
- A `.btn` with `aria-pressed="true"` stays pressed in, for toggle buttons that latch.
- The active window's title bar comes from four new tokens, `--win-active-bg`, `--win-active-fg`, `--win-active-border` and `--win-active-shadow`, so a theme can tune it without overriding the component. The dark theme's default is now quieter: the raised gradient tinted toward the accent, normal text, and an accent rule along the foot, since a dark theme's bright accent made a glaring filled bar. The light theme keeps the filled bar.
- The active title bar's keyboard focus ring now shows. The accent bar's own styles had hidden it.

## 0.8.0

- Menus. A `.menu-btn` opens a `.menu-panel`, an HTML popover, so opening, closing on Escape or an outside click, and sitting above everything work without script. Places in a panel are master-detail rows under section labels; actions are `.menu-action` buttons below a `.menu-sep`. The button looks pressed while its panel is open. The README sets out the markup.
- A new optional `dist/pudl-menu.js` opens a panel against its button, above it when there is more room, and as a full-width sheet on a narrow window; adds Up, Down, Home and End between rows; and makes an `.md-filter` in a panel narrow its rows, with Enter following the first row left.
- A launcher is a menu button at the start of the row that holds a window dock. The reference page's windows demo and the article reader sample each have one, and the master-detail toolbar's Trip and Account buttons are now real menus.
- A master-detail toolbar marked `.md-site-tools` stays on screen when a narrow layout shows a record, so a launcher or dock in it is reachable from inside a record on a phone.
- In a menu panel, rows that open windows are marked while their window is in front, but gain no child-window rows, since a child is not a place.
- Fixed: on a narrow master-detail layout, the list's rows were meant to grow taller as touch targets from 0.5.0 on, but a later rule of equal weight kept them compact.
- The design is recorded in `docs/proposals/launcher.md`.

## 0.7.0

- Child windows. A window whose markup says `data-win-parent="<key>"` is a child of that window: it stacks above its parent, comes forward and hides with it, closes with it, has no dock tab of its own, and closes on Escape when it is in front. Focus returns to the link that opened it. The relation lives in the markup, so the URL grammar is unchanged.
- A list of master-detail rows follows the windows its links open. The row of the window in front is marked `active` with `aria-current`, and each open child gets an `.md-row-child` row beneath its parent's row, with a branch glyph, which goes when the child closes.
- A layer inside a master-detail layout makes the windows its detail pane: the script sets `data-md-pane`, so a narrow layout shows the list or the windows, and a `data-win-back` link minimises every window to return to the list.
- A window whose markup gives `data-win-mode` without a position now opens in that mode. Before, it opened floating unless its position was given too.
- `pudl:window-place` now carries `event.detail.parent`.
- The new `samples/` folder starts with `article-reader.html`, a reading site with the article list in a sidebar, articles opening maximised and listings as child windows. The reference page's window demo gains a child window, uses master-detail rows for its list, and links to the sample.

## 0.6.0

- The files a project uses now live in `dist/`: `pudl.css`, `pudl-theme.js`, `pudl-windows.css`, `pudl-windows.js` and `fonts/`, with a copy of the licence as `dist/LICENSE` so that it travels with them. The reference page, the examples and the documentation stay at the top level. Nothing inside the files changed.
- A project copying a release now copies the contents of `dist/`. A page loading PUDL from jsDelivr adds `/dist` to the path, as in `https://cdn.jsdelivr.net/gh/paulmooreparks/pudl@v0.6.0/dist/pudl.css`. Links to earlier releases keep working at their old paths.

## 0.5.0

- The master-detail layout shows one pane at a time when it is 640px wide or less: the list, or a record. The server marks the layout with `data-md-pane="detail"` when the URL names a record, and the detail pane's new `.md-back` link returns to the list with its filters kept, scrolled to the record's row. The list's toolbar and filter chips step aside while a record shows, and list rows grow taller as touch targets. The README sets out the contract.
- The layout measures its own width with a container query, so a master-detail layout in a narrow window or panel behaves as it does on a phone.
- This replaces 0.4.2's narrow-screen rule, which stacked the list above the record. A project on 0.4.2 that wants the record pane on a phone must now render `data-md-pane="detail"` and an `.md-back` link.

## 0.4.2

- The master-detail layout works on a phone. Below 640px wide the toolbar wraps, the filter takes a full row, and the sidebar sits above the detail, holding at most two fifths of the height, instead of keeping its 260px width beside it.
- A long value in a key/value table now wraps instead of pushing the table past the edge of the screen.
- The reference page fits a phone: its side margins shrink to 16px, the form sample puts each label above its field, and the invariants list stacks its labels. The topbar's Reference and version pills, which looked pressable but were labels, are now links to the repository and the changelog.

## 0.4.1

- A press on a window's title bar or resize border now raises the window at once. In 0.4.0 only a press in the window's body did, and the title bar raised the window only at the end of a drag.

## 0.4.0

- Floating windows, in the optional `pudl-windows.css` and `pudl-windows.js`. Windows drag by the title bar, resize from any edge or corner, snap to the left or right half or maximise when dragged against an edge, minimise to a dock, and move and resize from the keyboard. The URL holds the whole arrangement, the server renders the windows it names, and every window button is a real link to the state it produces. The README sets out the URL format and the markup.
- The windows fetch a window's markup alone rather than cutting it out of a full page, work without script, take focus when they open and return it when they close, and include only the snapping that works.
- The reference page demonstrates the windows live, in place of a static drawing of one. Its section headings no longer style headings inside the demos.
- The README and the reference page now say PUDL is modelled on desktop toolkits such as GTK, rather than taken from GTK, and the README says PUDL contains no GTK code, stylesheets or artwork.

## 0.3.0

- The default palette is now a neutral graphite, with cool greys, a steel-blue accent, status colours a step less saturated than before, and a dark graphite topbar in both themes. The warm parchment and leather palette that was the default up to 0.2.0 is now `examples/parchment.css`, serif headings included.
- Text is set in Inter, which ships in `fonts/` as an upright and an italic variable file under the SIL Open Font License. The platform's interface face stands in until it loads. A project copying a release must now keep `fonts/` beside `pudl.css`.
- Headings use the body face. `--font-display` defaults to `var(--font)`, and a theme may still set a display face of its own.
- The monospace stack now leads with `ui-monospace`.
- Numerals are tabular wherever numbers are data (tables, form fields, code, badges, chips, the segmented control, topbar pills and master-detail rows, plus `<time>`, `<data>`, `<output>` and the new `.num` class) instead of on the whole page. Running prose now keeps proportional figures, because Inter's tabular feature also widens the hyphen and spaced out every hyphenated word.
- `examples/slate.css` no longer sets `--font-display`, because the default now does what it did.
- On the reference page, the introductory paragraphs are no longer muted and narrowed, and the card and dialog titles no longer carry an extra 22px of space above them. Both came from styles on the reference page, not from PUDL.

## 0.2.0

- A palette is now nineteen tokens per theme: six for the page and text, seven for the accent and status colours, four for lighting and two for the topbar. The raised and sunken treatments, the input background, the shadows, the focus rings, the dialog panel and the topbar chrome are all derived from them. In 0.1.1 a theme replacing the palette had to set about forty tokens per theme, most of them hand-tuned gradients and shadows.
- Four lighting tokens are new: `--light`, `--shade`, `--lit` and `--depth`.
- `--btn-bg`, `--shadow-btn`, `--tb-chrome-bg`, `--tb-chrome-border`, `--tb-chrome-hover-bg`, `--tb-chrome-hover-border`, `--tb-trough` and `--tb-trough-shadow` are gone. Nothing in PUDL used them.
- The default palette renders as it did in 0.1.1, to within a shade.
- `examples/slate.css` shows a theme that replaces the whole palette.

## 0.1.1

- A project may now replace the whole palette, background and topbar included, and the fonts, within restrictions the README sets out. The 0.1.0 README said a project could change only the accent, which was wrong.

## 0.1.0

This is the first release.

- The tokens and component classes moved into `pudl.css`, without the styling that exists only to lay out the reference page.
- The focus rings and the primary button's shadow now derive from `--accent` and `--danger`. Before, they were fixed to a navy accent, so a project that overrode `--accent` kept navy focus rings, which contradicted the rule that recolouring the accent reaches the focus rings.
- Theme handling moved into `pudl-theme.js`, and the saved theme lives under the key `pudl-theme`.
- The reference page has sample content of its own.
