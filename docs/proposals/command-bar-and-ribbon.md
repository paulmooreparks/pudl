# Proposal: the command bar and the single-line ribbon

Status: decided 2026-10-22. Every option below was chosen from the live mockup at `samples/command-bar-mockup.html`, which stays uncommitted as a working sketch. This proposal builds on [toolbars that fold](toolbar-commands.md), whose folding stages it keeps.

## The idea

PUDL's folding toolbar already behaves like a ribbon. As room runs out, each group drops its words, then folds into one menu button holding its commands, then into More. A menu is a group that is always folded, so one bar can hold menus and tools together, and a ribbon is a set of tool rows of which one shows at a time. Both shapes below come from that one observation, and PUDL offers both. The command bar suits an application whose commands live mostly in menus, and the ribbon suits a long toolbar such as an editor's.

## Decisions

| Question | Decision |
|---|---|
| Default shape | The command bar (A): menus first, tools after, in one row |
| Long toolbars | The single-line ribbon (B), an opt-in |
| Ribbon selector | PUDL's own tabs |
| Collapsing the ribbon | Show as ribbon, a toggle, folds the ribbon into a menu bar |
| Words on tools | Smart |
| Group captions | None or Start, chosen by the toolbar's author |
| A folded group's fields | Menu rows |
| Menus inside a folded group | Submenus |

## The command bar

A command bar is a folding toolbar whose first group holds a menu bar. The menu bar is drawn as PUDL's menu bar always is, one raised surface with the `menu` glyph at its start, flat titles, and the open title pressed in. The tool groups follow it in the same row and fold as any folding toolbar's do. The menu group has the highest priority, so it folds last, into one menu button showing the `menu` glyph alone.

Every tool's command also lives in a menu, so a reader who never uses the tools still has every command. A tool group therefore folds into a menu button of its own and never merges into the menu it came from, since a merged group would leave the reader no sign that its commands had moved.

## The single-line ribbon

A ribbon is opted into for a long toolbar, such as an editor's. It is PUDL's tab list along the top, the same raised tabs as tabs within a page, with the chosen tab joined to one row of its tools beneath, in the style of Word's simplified ribbon. The row folds as a command bar's tool groups do. The chosen tab is momentary chrome, like an open menu, so it is not part of the address.

Show as ribbon stands at the end of the tab list. It is a toggle, pressed in while the ribbon shows, and it carries a new `ribbon` glyph, a window with its tab line and a row of tools beneath. Releasing it folds the ribbon into a menu bar, since a tab is a tool row folded once more. Each tab becomes a menu that holds the tab's groups, each under a heading with the group's name and separated from the next, in the same rows a folded group has. Show as ribbon then stands at the end of the menu bar, released, and pressing it brings the tabs back. No tab is ever left standing without its row, because tabs over nothing read as tabs for the page beneath. Whether the ribbon shows is the reader's preference and is remembered for the application.

## Words and captions

A command keeps its words until folding takes them, unless its glyph is one nearly every reader already knows. Bold, italic, underline, the lists, copy, the arrows and refresh are such glyphs. A command marked that way shows its glyph alone, its name as a tooltip and as its accessible name. A field shows its value, such as the font's name, and no label of its own. The author marks the commands, since only the author knows which glyphs their readers know; PUDL's documentation gives the list above as the guide.

A group's name is its fold button's words, its accessible name and its tooltip. Whether it also stands before the group as a caption is the toolbar author's choice, made once for the toolbar. Captions above the groups were tried and dropped, because they make the row two lines tall and put the text at the small end of what reads comfortably.

## What folding does to fields

When a group folds, everything it holds reaches its menu as menu rows, so nothing is lost by folding. PUDL today makes rows of a group's keys and drops its fields.

- A select becomes a row whose submenu holds its options as radio rows, with the current choice ticked and shown as the row's second line.
- A segmented control becomes radio rows under a heading with its name, as today.
- A stepper's keys become rows that keep the menu open, so a value can be stepped more than once.
- A key that switches something becomes a row with a tick that keeps the menu open, so several can be set in turn.
- A text field, a search field or a combo box becomes a row that opens the field in a popover against the fold button, since a field typed into cannot be a menu row.

## What folding does to menus

When the menu group folds, its menu holds one row for each menu, and each row opens that menu beside it as a submenu, with its own headings and separators. Flattening every menu into one column was tried and dropped, because it threw away the structure each menu's author chose. On a window 640px wide or less, where a submenu cannot stand beside its row, a row shows its menu in the panel's place with a Back row first, as PUDL's menu bar already does when it folds.

## Fixes to plain menu panels

The mockup turned up two places where a plain menu panel, such as a fold menu, falls behind the menu bar's panels and context menus.

- A plain panel draws its ticks from `aria-pressed`, which is not the right state for a menu row. It should honour `aria-checked` on `menuitemcheckbox` and `menuitemradio` rows, as the other panels do, and keep `aria-pressed` working for the pages that use it.
- A plain panel should line up glyphs, ticks and warnings in one column, as the menu bar's panels do from 0.77.0, so a folded group's rows start their words in one line.

The menu that opened upward in the mockup is already fixed in 0.77.1: a long panel now stays below its button and scrolls.

## Delivery

This is one release, PUDL 0.78.0 with specification 0.35.0. It adds the command bar's menu group, the ribbon, Show as ribbon and the `ribbon` glyph, marks for glyph-only commands and for captions, the folding of fields and of menus described above, and the two fixes to plain panels. The specification gains a section on ribbons and the rules above in the toolbar and menu sections. Tests cover each folding stage in both shapes, every kind of field in a fold menu, submenus and their narrow form, Show as ribbon in both directions, and the keyboard throughout. Desktop moves to 0.78.0 after it.

## Choices not yet ruled on

These choices were made while writing this proposal, and no decision has confirmed them yet.

- The chosen ribbon tab is not part of the address, and whether the ribbon shows is remembered per application.
- A text field folds into a popover, since the mockup had no text field in a folding group.
- Captions default to Start, which is what folding toolbars show today, so existing toolbars do not change unasked.
