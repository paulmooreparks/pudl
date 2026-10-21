# Proposal: closing the gap to a complete UI library

Status: proposed 2026-10-21, at PUDL 0.73.0, from the maintainer's question of what PUDL still lacks to be a complete UI library.

## How this was measured

PUDL's 46 components and 8 structures (`dist/pudl-components.json`) were set against the controls that the desktop toolkits and the large web libraries all offer: WinUI 3, GTK 4, Material 3, IBM Carbon and the ARIA Authoring Practices' patterns. A control counts as missing when an ordinary business application, such as an application or the expense tracker, would otherwise build it for itself, as an application built its flow controls and example.com its go palette before PUDL had them. The lists below leave out what PUDL already covers under another name, and say so.

## Already covered under another name

An accordion is the disclosure card. Breadcrumbs are the path bar, which the reference page prefers to breadcrumbs on purpose. A dropdown button is a menu button. A toggle button group is the segmented control. A command palette is a menu summoned by a key (0.17.0). A drawer or side sheet is a docked window, and a navigation pane is the master-detail sidebar or a shared dock. A tab view is document tabs, a description list the key/value table, a spinner and its words the loading state, an info bar a notice, a toast a toast. An editable grid is the row editor, and a search field the master-detail filter.

## Missing, and needed for "complete"

These are controls an application reaches for every week. Each has a native element or an ARIA pattern to build on, so each starts from markup that works without a script, as the combo box did.

| Control | What it is | Builds on |
|---|---|---|
| Context menu | A menu opened at the pointer or the caret by a right-click, Shift+F10 or the Menu key, with the rows the menu bar takes. an application asked for it (`pudl-context-menu.md`) and is waiting. | The menu panel and its placement |
| Progress bar | A determinate bar with its value in words, and an indeterminate one, for an upload, an export or a long agent turn. The specification mentions progress and defines none. | `<progress>` |
| Meter | A level within a known range, such as quota used or context consumed, with optional low, high and optimum bands drawn with a glyph as well as a colour. | `<meter>` |
| Slider | A value in a range, by pointer and arrow keys, with its value shown. The reference page already uses an unstyled one. | `<input type="range">` |
| Number field | A number with step buttons, a raised pair joined to the sunken field, and Up and Down to step, since each browser draws its own spin buttons or none. | `<input type="number">` |
| Date and time fields | A date, a time or both, typed or chosen from a calendar PUDL draws, the opener joined to the field as a combo box's is, since every browser's own picker looks different and some cannot be styled at all. The calendar grid follows the ARIA date picker pattern. | `<input type="date">`, `time`, `datetime-local` |
| List box | A list in a form from which the reader chooses one item or several, with the keyboard model of a list box, where a select is too small and check boxes too many. | `<select multiple>` or `size` |
| Token field | Several values in one field, each a chip with its own remove button, typed or chosen as in a combo box, such as recipients or tags. | The combo box and the chip |
| Split button | A button that does its usual thing, joined to a menu button with the alternatives, such as Save beside Save As. | The button and the menu button |
| Popover | A panel of any content anchored to the control that opened it, such as a small form, a help text or a filter, that is not a menu and not modal. | The popover attribute, as menus use |
| Image and figure | A picture with its caption, fitted to its space by contain or cover, with its alternative text required, and a placeholder while it loads or when it fails. | `<figure>`, `<img>` |
| Avatar | A person's or an agent's picture, or their initials on a colour drawn from their name, in the sizes a list row, a title and a comment need, with an optional status mark. | `<img>`, or text |
| Password field | A password with a raised button joined to its end that shows and hides it. | `<input type="password">` |
| Stepper | The steps of a task that takes several pages, such as setting up a configuration: each step's name and state, done, current or to come, by glyph as well as colour, each done step a link back. | An ordered list |

## Worth having, but not needed for "complete"

These are real, and an application can do without them for now. Each should wait until something needs it, as the searchable select did not need to.

- **A calendar view**, a month or a week of events, which is a layout of the date picker's grid but a component of its own, with events in its cells.
- **A colour picker** drawn by PUDL. The native `<input type="color">` is usable, and a style for its well is enough until an application needs swatches or an eyedropper.
- **A sortable list**, rows the reader drags or moves with keys to reorder, generalising what the shared docks' tabs already do.
- **A large-data table**: virtual scrolling, column resizing and reordering, frozen columns. The data table has sorting and selection.
- **The `kbd` element and a horizontal rule** in running text, which PUDL leaves to the browser and which want a line of CSS each.

## Out of scope

Some controls belong to the host's content rather than to the design language, and a host brings its own: a rich text editor (an application uses CodeMirror, which the README already themes), charts, a media player, maps and a web view. A carousel is left out on purpose, since it hides content behind a timer and serves the page more than the reader. Pull to refresh and swipe actions belong to phones, which PUDL serves as narrow windows rather than as a touch platform.

## How to close it

Each control is designed in the specification first, then built with its test, its entry in the component list and a place on the reference page, as the combo box was. the maintainer asked on 2026-10-22 for all of them in one release, PUDL 0.74.0 with specification 0.31.0, rather than four, to keep the number of deliveries down. After that, the "worth having" list is decided item by item, and the component list's section on what Studio lacks can be closed.

## What every new control must be

the maintainer set these on 2026-10-22, for the date and time fields first and for every control in this release:

- **Best in class**, designed against the loudest complaints people make about the control elsewhere, which are named in each control's section of the specification together with how PUDL answers them.
- **Every format, ISO where none is given.** A control that shows or takes a date, a time or a number follows the page's language and the reader's culture, and shows ISO 8601 where the page says nothing.
- **Global.** Every culture and its conventions, including calendars other than the Gregorian, such as the Japanese and the Thai, through the platform's own internationalisation rather than tables of PUDL's.
- **Dead-simple entry.** Typing works however the reader is likely to type, and the control says back in words what it understood, so an ambiguous entry such as 01/02 is never taken silently.
- **It looks like PUDL**, built from the grammar and the tokens that every other component uses, never a widget bolted on: sunken where it takes input, raised where it is pressed, pressed in where it is chosen, glyph and colour together.
- **Unmistakable affordances.** What can be pressed, typed in or dragged says so before the reader tries it.

## Decisions

- **One release** for the whole "needed" list (the maintainer, 2026-10-22).
- **The "needed" list as drawn above**, with a date and time picker, and **a calendar drawn by PUDL** (the maintainer, 2026-10-22).
- **The looks**, from the mockups in `samples/controls-mockup.html` (the maintainer, 2026-10-22):
  - Context menu: B, with a glyph before a row's words where the command has one.
  - Split button: A, joined.
  - Popover: A by default, with B (a pointer) and C (a title and a close key) as variants.
  - Progress bar: A's look, value in words beside the bar, at B's 16px height.
  - Meter: A by default, coloured by band with the band's glyph in the words, and B, one colour with marks, as a variant. Which end is bad, and where the bands begin, are the application's, as the meter's optimum, low and high say.
  - Slider: A, a round thumb, on a track at the progress bar's 16px height, with the larger thumb that implies.
  - Number field: A, minus and plus keys at the end.
  - Date and time: every option the live date fields show, with the time list at T1 and its interval adjustable (5, 15 or 30 minutes, or any number such as 6), a year typed first with a month name understood, the month and year key the height of the keys beside it, and the mouse wheel stepping a focused year by one and a focused time by a minute.
  - List box: B, check boxes on the rows, since choosing in a list box sets state; radio buttons where one row is chosen.
  - Token field: B, chips below the field, with the separator configurable.
  - Password field: A, a Show key, with a glyph key as an option.
  - Image and figure: A by default, with B and C as variants.
  - Avatar: A, round and neutral, with C, tinted by name, as an option.
  - Stepper: A, across and numbered, by default, with B, down the side, as a variant.
- **Ticks and check boxes mean different things** (the maintainer, 2026-10-22). A tick shows a state; a check box invites a press that sets one. A control that sets state shows a check box, and a list or a menu that reports state shows a tick. The same holds for any pair like it.
- **The mouse wheel** steps a field by its smallest increment only while the field has focus and the pointer is over it, so a page scrolling past never changes a value.
- **The segmented control** is 30 pixels tall, the height of a menu bar's groups.
