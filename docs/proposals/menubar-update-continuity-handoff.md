# Dropdown continuity: implementation notes

This file records the audit and the implementation decisions for the dropdown continuity work on branch fix/menubar-survives-updates. The contract itself is in docs/proposals/menubar-update-continuity.md; this file does not restate or amend it.

## Commits

The branch is based on main d0a61cb.

| Commit | What it holds |
| --- | --- |
| 50db4f4 | First menu bar version, reviewed and sent back for revision. Superseded by f5f7365. |
| c2b42a8 | Generated minified copy of 50db4f4. Superseded by 0e0b4e7. |
| b9ccf42 | dist/pudl-menu.js: a menu redrawn in place keeps its scroll. |
| f5f7365 | dist/pudl-menubar.js and tests/menubar-update-continuity.test.js: menus, submenus and ribbon dropdowns updated in place. |
| e705f09 | dist/pudl-commands.js, tests/command-menu-update-continuity.test.js and its fixture: open command menus kept current. |
| 0e0b4e7 | Generated: dist/min copies and maps of the three changed scripts, from build/minify.js, for local PUDL_MIN runs only. Superseded by 9a77efc. |
| e790173 | dist/pudl-combo.js, tests/combo-update-continuity.test.js and its fixture: an open combo list follows its options, and a gone or disabled option is never chosen. |
| a50e668 | dist/pudl-commands.js, tests/command-menu-update-continuity.test.js and its fixture: rows matched by id, panels kept while rows around them update, removal fallbacks, visible fallback focus, and rows in fold menus kept current. |
| ed9ea11 | dist/pudl-menubar.js: a fallback row is brought into sight after the scroll is put back. |
| 9a77efc | Generated: dist/min copies and maps of the combo, commands and menu bar scripts, for local PUDL_MIN runs only. |

## Audit

Each family was opened, then put through the update paths that reach it in practice: command redraws (pudlCommands.changed), menu bar refreshes, window retitles and window state changes. The host-application runs used that application's bundled copy of PUDL 0.96.1 with its real background updates; the PUDL runs used fixtures in this branch.

| Family | Update path tried | Finding | Action |
| --- | --- | --- | --- |
| Menu bar menu and submenu | Command redraw, refresh, retitle | Stayed open but was refilled, focus jumped to the first row on a retitle, and an in-place submenu lost its level | Fixed in f5f7365 |
| Ribbon dropdown | Command redraw, refresh, retitle | Closed on every update, even one that changed nothing | Fixed in f5f7365 |
| Command menu (pudl-commands) | Command redraw | Stayed open with stale ticks and disabled rows; after e705f09, review found rows matched by position, menus with a panel left stale, and removal fallbacks missing | Fixed in e705f09 and a50e668 |
| Command rows in a fold menu (pudl-toolbar draws, pudl-commands rows) | Command redraw with the fold menu open | Stayed open with stale rows | Fixed in a50e668, inside pudl-commands.js |
| Command choice (data-command-choice) | Command redraw | A segmented control, not a dropdown; buttons rebuilt only when the set of commands changes | No action |
| Combo box (pudl-combo) | Options added, removed, disabled and renamed while the list was open; the supported update is changing the select's or datalist's option elements, as the module documents no other | Stayed open, but offered disabled options and kept stale rows, one of which could choose a removed option and leave the select with no valid value | Fixed in e790173 |
| Listbox (pudl-listbox) | None | An inline list with no popup | Out of scope |
| Window status popover (pudl-windows) | Window state changes in a host application | Stayed open, focus kept | No defect |
| Taskbar stack list (pudl-windows) | Window state changes and retitles in a host application, pointer and keyboard | Stayed open, focus kept | No defect |
| Title bar context menu (pudl-windows) | Window state changes in a host application | Stayed open, focus kept | No defect |
| Toolbar fold menus (pudl-toolbar) | Window state changes in a host application | Stayed open, focus kept | No defect |

## Decisions

Identity is the menu bar's existing one: a contributed command by its source and command path, otherwise its id, otherwise its label. Command menus use the command's id. Two rows with the same label and no id are matched in order.

A row is never moved while it has focus, because moving an element takes focus from it; the rows around it move instead. A ribbon control holding an open dropdown is likewise never moved.

A rebuilt bar does not close an open panel. The panel goes on under the title that takes its title's place, which is the same search the old reopen used.

A dropdown button's disabled state follows its command, and only a change in the command's own state is written, so pudl-toolbar.js can still disable a menu button whose rows are all disabled.

The fallback order follows the clarified contract: first enabled row of the menu the focus was in; when that menu's own command is gone or disabled, its enabled row in the menu around it, else that menu's first enabled row, else the title or tab. A command menu's last resort is its button, or another enabled control in its toolbar. Back rows are never a fallback target.

## Evidence

Raw output is kept outside this repository, under .diagnostics/fix8. Each run used a fresh PUDL_RUN_OUTPUT and a 300 second suite timeout. The historical run directories do not record the revision or the hashes of the files they served, so the files as they are now cannot prove what those runs served; the final evidence below records both.

- run-23: both new suites pass in Chromium, Firefox and WebKit with one job, at the tree that became 063fa90. That covers 41 menu bar checks and 14 command menu checks per engine.
- run-24-min: the same with PUDL_MIN=1 after build/minify.js; `node build/minify.js --check` agrees.
- run-19-family: 87 of 87 suite runs pass across the three engines for the menubar, ribbon, menu, command, toolbar, context-menu, combo and applet suites. This run used three jobs, not one, and ran before the final test-only commit, when the menu bar suite had 34 checks rather than 41.
- run-20-unfixed: with the three scripts taken back to d0a61cb, 16 checks fail in Chromium. The menu bar suite then stopped at a caught locator timeout and never reached its narrow and ribbon sections, so 16 is a floor, not a count of every check that would fail.
- Final evidence at 9a77efc, each run directory holding served.txt with the revision and SHA-256 values for selected inputs (13 in each focused manifest and four readable scripts in the family manifest): run-40 passes all three continuity suites in Chromium, Firefox and WebKit with one job (41 menu bar, 32 command menu and 11 combo checks per engine); run-41-min passes the same with PUDL_MIN=1; run-42-family passes 99 of 99 suite runs, one job, for the menubar, ribbon, menu, command, toolbar, context-menu, combo, applet, token and listbox suites. Because testing for this batch was kept minimal, no negative control was run for the combo and command follow-up; wider coverage is left for the batch-end regression.
- menu-probe.js and pudl-dropdown-probe.js are the original reproductions; ribbon-focus-trace.js, command-menu-trace.js, zz-dbg3.js and zz-dbg4.js are the traces used while debugging.

The suites read state in the same task as each update and again after it settles, and record every popup close and every focus loss from a menu row in between; a redundant or state-only update must produce none. They cover renames and reorders under stable ids, a scrolled long submenu and a scrolled long dropdown, the pointer resting on a row during an update, a submenu in the panel's place at 600 pixels (a sheet under the File title) and at 420 pixels (the collapsed bar's single menu, two levels down) with Back after updates, the focused command and the submenu or dropdown command being disabled or removed, and Escape or a press outside followed at once by an update.

## Limitations

- Two rows with the same label and no id are matched in order rather than rejected as ambiguous. Rows with ids are always matched by id.
- In a folded group's menu, or any other popup drawn with pudlCommands.rows, rows follow their commands while it is open and a row whose command goes is removed, but a command added while it is open shows only when it next opens. That popup is drawn by its owner, pudl-toolbar.js, which this branch does not edit.
- A menu whose button or whole menu is taken out of the page by its host gets its focus moved when the commands are next drawn, since that is when pudl-commands.js looks; a host that removes a command's control is expected to call pudlCommands.changed(), as for any change to its commands.
- Dropdowns that a host application draws with its own code are not part of this branch.
