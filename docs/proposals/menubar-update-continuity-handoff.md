# Dropdown continuity: Front End's handoff

This is Dinah Front End's record of the audit and the implementation decisions for the dropdown continuity work on branch fix/menubar-survives-updates. The contract itself is in the primary checkout's docs/proposals/menubar-update-continuity.md, which the PUDL lead maintains; this file does not restate or amend it.

## Commits

The branch is based on main d0a61cb.

| Commit | What it holds |
| --- | --- |
| 50db4f4 | First menu bar version, reviewed and sent back for revision. Superseded by f5f7365. |
| c2b42a8 | Generated minified copy of 50db4f4. Superseded by 0e0b4e7. |
| b9ccf42 | dist/pudl-menu.js: a menu redrawn in place keeps its scroll. |
| f5f7365 | dist/pudl-menubar.js and tests/menubar-update-continuity.test.js: menus, submenus and ribbon dropdowns updated in place. |
| e705f09 | dist/pudl-commands.js, tests/command-menu-update-continuity.test.js and its fixture: open command menus kept current. |
| 0e0b4e7 | Generated: dist/min copies and maps of the three changed scripts, from build/minify.js, for local PUDL_MIN runs only. |

## Audit

Each family was opened, then put through the update paths that reach it in practice: command redraws (pudlCommands.changed), menu bar refreshes, window retitles and window state changes. The Dinah runs used Dinah's bundled PUDL 0.96.1 with real chat updates; the PUDL runs used fixtures in this branch.

| Family | Update path tried | Finding | Action |
| --- | --- | --- | --- |
| Menu bar menu and submenu | Command redraw, refresh, retitle | Stayed open but was refilled, focus jumped to the first row on a retitle, and an in-place submenu lost its level | Fixed in f5f7365 |
| Ribbon dropdown | Command redraw, refresh, retitle | Closed on every update, even one that changed nothing | Fixed in f5f7365 |
| Command menu (pudl-commands) | Command redraw | Stayed open with stale ticks and disabled rows | Fixed in e705f09 |
| Command choice (data-command-choice) | Command redraw | A segmented control, not a dropdown; buttons rebuilt only when the set of commands changes | No action |
| Combo box (pudl-combo) | Options added and replaced while the list was open | Stayed open; text, caret and active option kept | No defect. Its rows do not refresh until the reader types again, which is noted below |
| Listbox (pudl-listbox) | None | An inline list with no popup | Out of scope |
| Window status popover (pudl-windows) | Chat state changes in Dinah | Stayed open, focus kept | No defect |
| Taskbar stack list (pudl-windows) | Chat state changes and retitles in Dinah, pointer and keyboard | Stayed open, focus kept | No defect |
| Title bar context menu (pudl-windows) | Chat state changes in Dinah | Stayed open, focus kept | No defect |
| Toolbar fold menus (pudl-toolbar) | Chat state changes in Dinah | Stayed open, focus kept | No defect |

## Decisions

Identity is the menu bar's existing one: a contributed command by its source and command path, otherwise its id, otherwise its label. Command menus use the command's id. Two rows with the same label and no id are matched in order.

A row is never moved while it has focus, because moving an element takes focus from it; the rows around it move instead. A ribbon control holding an open dropdown is likewise never moved.

A rebuilt bar does not close an open panel. The panel goes on under the title that takes its title's place, which is the same search the old reopen used.

A dropdown button's disabled state follows its command, and only a change in the command's own state is written, so pudl-toolbar.js can still disable a menu button whose rows are all disabled.

The fallback order follows the clarified contract: first enabled row of the menu the focus was in; when that menu's own command is gone or disabled, its enabled row in the menu around it, else that menu's first enabled row, else the title or tab. A command menu's last resort is its button, or another enabled control in its toolbar. Back rows are never a fallback target.

## Evidence

Raw output is under the Dinah worktree at .diagnostics/fix8. Each run used a fresh PUDL_RUN_OUTPUT, one job and a 300 second suite timeout.

- run-23: both new suites pass in Chromium, Firefox and WebKit. That covers 41 menu bar checks and 14 command menu checks per engine.
- run-24-min: the same with PUDL_MIN=1 after build/minify.js; `node build/minify.js --check` agrees.
- run-19-family: 87 of 87 suite runs pass across the three engines for the menubar, ribbon, menu, command, toolbar, context-menu, combo and applet suites.
- run-20-unfixed: with the three scripts taken back to d0a61cb, 16 of the new checks fail in Chromium.
- menu-probe.js and pudl-dropdown-probe.js are the original reproductions; ribbon-focus-trace.js, command-menu-trace.js, zz-dbg3.js and zz-dbg4.js are the traces used while debugging.

The suites read state in the same task as each update and again after it settles, and record every popup close and every focus loss from a menu row in between; a redundant or state-only update must produce none. They cover renames and reorders under stable ids, a scrolled long submenu and a scrolled long dropdown, the pointer resting on a row during an update, a submenu in the panel's place at 600 pixels (a sheet under the File title) and at 420 pixels (the collapsed bar's single menu, two levels down) with Back after updates, the focused command and the submenu or dropdown command being disabled or removed, and Escape or a press outside followed at once by an update.

## Limitations

- A combo box's open list is not refreshed when its options change; it refreshes as the reader types. This predates the branch and changes no focus or popup state, so it is left for a decision.
- A ribbon control folded out of sight by pudl-toolbar.js is not specially handled. An update does not move it, but no run has opened a dropdown from inside a fold menu during an update.
- Two rows with the same label and no id are matched in order rather than rejected as ambiguous.
- Dinah's own dropdowns, such as the chat list's group actions and the group chat member menus, are Dinah code and are not part of this branch.
