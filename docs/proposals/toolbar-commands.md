# Proposal: toolbars that fold, built from an applet's commands

Status: proposed 2026-10-20, awaiting the maintainer's decisions on the questions at the end. the maintainer asked for toolbars in a ribbon's direction: labelled while there is room, folding predictably as room runs out, so that an application's Comments toolbar might become a "Comments" menu button and then only a glyph. He also asked whether applets should register their commands with PUDL in a standard way, and whether toolbars should use that registry by themselves. an application's proposal `docs/proposals/pudl-toolbar-labels.md` asks for the labels and the folding, and this proposal takes it in.

## What happens today

PUDL's toolbar is a row of groups of raised controls. When the row is too narrow, whole groups wrap onto further lines, so an application's Editor, at its usual window size, spends three rows on its view strip, its formatting and its comments, and a narrow window spends more. A button is named only by its tooltip and its accessible name. The specification already lists folding into a menu as a question it must settle.

Each applet that has a toolbar builds it by hand. an application's Editor keeps one table of its commands, with an id, a label, a shortcut and the menu each belongs to, and its Edit, Insert, Format, Comments and Review menus, its keys and Help's list of keys are all drawn from that table. Its toolbar then builds every button separately in `editor-toolbar.js` and `drawCommentsBar`, looking each one up in the table by id and wiring its click, its disabled state and its pressed state again. PUDL's applet contract has nothing to look the ids up in: `commands()` returns rows with a label and a function, and `menus()` returns titles of the same rows, none of which has an id.

## The proposal in short

1. An applet declares its commands once, each with an id, in a **command table** that PUDL can read.
2. A toolbar's controls, and a menu's rows, refer to commands **by id**, so a button, its menu row and its key are one command, with one label, one glyph and one state.
3. A toolbar's groups carry a **name, a glyph and a priority**, and the toolbar **folds** them through fixed stages as room runs out, instead of wrapping.

Each of the three is useful without the others: a page can fold a hand-written toolbar, and an applet can use the command table for its menus alone. Together they let an applet describe its toolbar as a short list of ids and get the folding, the states and the keyboard for nothing.

## The command table

An applet's instance may offer `commandTable()`, which returns its commands. Each command is an object; any field but `id` may be a function, which PUDL calls each time it draws the command, as an application's own registry does.

| Field | Meaning |
|---|---|
| `id` | A name unique within the applet, such as `bold` or `next-comment` |
| `label` | What the command does, in the application's words, such as "Next Comment" |
| `glyph` | The name of a PUDL glyph, or of one the application adds, such as `arrow-down` |
| `shortcut` | Its key, in the menu bar's spelling, such as `Mod+B` |
| `run(value)` | What it does; a choice passes the value chosen |
| `disabled`, `reason` | Whether it can run now, and why not |
| `checked` | For a command that switches something on and off, whether it is on |
| `choice`, `value` | For one of a set, such as Off, Open and All: the set's id, and this command's value in it |
| `items` | Commands, or ids, under it, which make it a menu |
| `danger` | Whether it destroys something, which draws it with the warning glyph |
| `badge` | A short count or state shown on its control, such as the number of open comments |
| `hidden` | Whether it is left out entirely just now, rather than shown disabled, such as a table's commands where a document can hold no table |
| `action` | The action in its applet package's published actions that does the same work, such as `example.editor/request-change@1`, for an agent without the page |
| `current` | For a command with items, the words its menu button shows for the item in effect, such as "Heading 2" on the paragraph style while the cursor is in a heading |

A command's state comes from these fields, and every one but `id` may be a function. I chose functions over a language of conditions, such as "enabled while the selection is not empty", because PUDL cannot see an applet's selection, document or connection, and the applet can answer the question directly. A command that is `hidden` leaves its toolbar control and its menu row out, and a group whose commands are all hidden leaves the toolbar, so the folding measures only what is shown. A disabled command stays visible and keeps its `reason`, which a menu row shows as its second line and a toolbar control as its tooltip.

The instance tells PUDL that a command's state has changed by calling `opts.commandsChanged()`, which the host gives `init` as it gives `opts.changed`. PUDL draws again what shows the commands, once per frame however often it is called. It also asks again whenever a menu is about to open, so a menu is never stale.

The table replaces nothing. `commands()` and `menus()` work as they do today, and a row in either may now be the id of a command in the table instead of an object, so a menu is written as `['undo', 'redo', '-', 'find', 'replace']`. The menu bar takes each command's shortcut from the table, so a command that appears only in a toolbar still answers its key, and the menu bar's list of shortcuts includes it.

A page that is not an applet, or a host's own chrome, registers commands with `pudlCommands.register(scope, table)`, where the scope is the element the commands belong to, such as the page's body or a window. A toolbar finds a command by id in the nearest scope around it that has one: the applet it sits in, then the window, then the page.

## Toolbars from the table

A toolbar refers to commands by id, in markup or as data.

In markup, which a server renders and which works before any script, a control carries `data-command`:

```html
<div class="toolbar" role="toolbar" aria-label="Comments" data-toolbar-fold>
  <div class="toolbar-group" data-toolbar-group="Comments" data-toolbar-glyph="comments" data-toolbar-priority="2">
    <div class="seg sm" data-command-choice="comments-shown"></div>
    <button type="button" data-command="new-comment"></button>
    <button type="button" data-command="previous-comment"></button>
    <button type="button" data-command="next-comment"></button>
  </div>
</div>
```

PUDL fills each control from its command: the glyph, the label, the tooltip with its shortcut, disabled, pressed, the badge, the danger glyph, and the click. A control that already has content keeps it, so a server can render the words for a page without script. `data-command-choice` fills a segmented control with every command in that choice.

As data, an applet's instance may offer `toolbars()`, returning the same structure, and the host draws it where the applet asks, above its content unless the applet places it with a `data-toolbar-slot` in its own markup:

```js
toolbars: function () {
  return [{ label: 'Comments', groups: [
    { label: 'Comments', glyph: 'comments', priority: 2,
      items: [{ choice: 'comments-shown' }, 'open-comments', 'resolved-comments', 'new-comment', 'previous-comment', 'next-comment'] }
  ] }];
}
```

an application's formatting toolbar would become a list of six groups of ids, and `editor-toolbar.js` would no longer be needed.

## How a toolbar folds

A toolbar marked `data-toolbar-fold` keeps to one row. Each group passes through five stages, and the toolbar moves groups one stage at a time until its row fits:

| Stage | What the group shows |
|---|---|
| 1. Named | Its name, flat and muted, then each control with its glyph and its label beside it |
| 2. Glyphs | Its name, then each control as its glyph alone; a control without a glyph keeps its label |
| 3. Menu | One menu button with the group's glyph and name and a caret; its menu lists the group's commands |
| 4. Glyph menu | The same menu button with the glyph alone, if the group has one; a group without a glyph stays at stage 3 |
| 5. More | The group leaves the row, and a More menu button at the end holds it as a submenu named for the group |

The order is deterministic, so a reader learns where things go. As the row narrows, PUDL takes the group with the lowest `priority` that can still fold, the one furthest along the row when two are equal, and moves it one stage on; then it measures again. It folds every group to stage 2 before it folds any to stage 3, because the glyphs alone save the most room for the least lost meaning, then the lowest priorities first through stages 3 and 4, and only then into More. As the row widens, the same steps run backwards. The Comments group in the screenshot would go from "Comments ┃ Off Open All ┃ 💬 0 ▾ ✓ 0 ▾ ┃ + New Comment ↑ Previous ↓ Next" to the glyphs, then to a "💬 Comments ▾" menu button, and at its narrowest to "💬 ▾".

In a folded group's menu, each command is a row with its glyph, its label and its shortcut. A command that switches is a row with a tick, a choice is a set of radio rows under a heading, a command with items is a submenu, and a badge becomes the row's second line. Nothing a group can do is lost by folding.

A toolbar measures itself with a `ResizeObserver` and the widths its groups have at each stage, which it measures once and again only when a group's commands change, so folding never makes the row jump while a reader works. A group may be marked `data-toolbar-end`, which keeps it at the row's end, as Save As and Sync are in the Editor's view strip, and folds it last.

A field in a toolbar, such as a search field, takes input and cannot be a menu row. It stays on the row through the first four stages, and at stage 5 becomes a glyph button that opens it in a popover.

The keyboard is unchanged: the toolbar is one tab stop, and the arrow keys move along whatever controls are showing, a folded group's menu button being one stop.

## Commands for agents

PUDL is meant to be used by agents as well as people (chapter 1 of the specification, "Agents"), and folding works against an agent that reads the screen: a folded group's commands are in a closed menu, which is neither on the screen nor in the accessibility tree until something opens it. The command table is what lets an agent ignore the folding altogether. An agent reaches a command at one of three levels, and the one that applies depends on what the command does.

- **In the page, by id.** `pudlCommands.list(scope)` returns every command in a scope and the scopes around it, with its submenus, as plain data: its id, label, glyph, shortcut and every field of its state, read at that moment, and whether a toolbar is showing it, has folded it or has hidden it. `pudlCommands.run(id, value)` runs a command exactly as pressing it would, and returns a promise that settles once its `run` has, or that rejects with the command's `reason` when it is disabled or hidden. An agent driving a browser, whether in Claude's browser tools, Playwright or a desktop host's headless browser, works from ids and never from pixels, and a toolbar's folding changes nothing it sees. Commands such as Bold or Next Comment belong here and only here, since they mean something only with a document open in front of somebody.
- **Without the page, as an action.** (`applet-actions.md` brings actions into PUDL and sets out how commands, actions and requests share one vocabulary.) A command that does work worth doing without a window, such as Request a Change or Resolve a Comment, names the action it runs with `action`, a reference into the actions its applet package publishes, with their input and output schemas. An agent with no page open, such as one using an application's command line, calls the action itself; a person presses the command; both reach the same code.
- **On the server, by its forms.** A command that changes what the server holds, such as saving or publishing a document, does so by submitting a form the server's representation offers. An agent that speaks to the server, as a desktop host's MCP server lets one do, submits the same form, so the command is the person's way to the form and never the only way.

`list` and `run` are also what a command palette and a test use, so the agent's way in is exercised every day by the people's.

## Should toolbars use the table by themselves?

I recommend that a toolbar draw its commands from the table always, and that no toolbar ever appear without being asked for. Which commands deserve a toolbar, in what groups and at what priority, is a design decision about the applet, and a toolbar generated from every command in the table would be a long row of everything, which is what the menus are already for. What the table does by itself is make every command reachable everywhere it should be without being declared twice: its key works, it is in the menu bar's list of keys, a command search or palette can list it, and a toolbar or menu that names its id gets its label, glyph and state for free.

## The specification

The toolbar section gains group names and glyphs, the five stages and the order of folding, the More menu, end groups and the rule for fields, and settles its two open questions. Chapter 9 gains the command table, commands named by id in menus and toolbars, the call that says a command's state has changed, and the three ways an agent reaches a command: listing and running it by id in the page, its action, and the server's forms. The menu bar section gains shortcuts taken from the table.

## What an application would do

The Editor's key table becomes its command table, with a glyph added where its toolbar shows one. Its menus become lists of ids, its formatting, view and comments toolbars become `toolbars()` data or markup with `data-command`, and `editor-toolbar.js`, the hand-built Comments bar and `.editor-toolbar-name` go.

## As built

A preview of the command table, `data-command` controls and folding shipped in 0.68.0, with the note editor sample. Two parts of the design above were missing from it, and example.com, moving its Editor and Files over, found both on the first day; 0.68.1 adds them. A menu's rows may be command ids (`pudlCommands.menuRows`, used for `menus()` and `commands()`), and a group whose commands are all hidden leaves the row.

an application moved its toolbars next and found six gaps (`docs/proposals/pudl-commands-gaps.md` there), which 0.69.0 fills. The command table gains `panel(container)`, for a command that draws its own menu; `tone`, a status colour with no other meaning, which brings its status glyph where the command has none; `detail`, a line saying what the command does; and `bind: false`, for a key shown but bound elsewhere, chosen over an application's separate `key` field so that a command has one field for its key. A control's name carries its badge. A group marked `data-toolbar-keep` never folds, which replaces the rule above that a field becomes a glyph button at stage 5. `list` describes a command by its own scope's controls, and `run` with an element stays in that element's scopes, which is the default rather than the opt-in an application asked for, since an agent naming one window must never reach another's.

In 0.70.1, after example.com's Sight Reader put two number fields on its toolbar, a field keeps its own keys and is a Tab stop of its own, so the keyboard described above holds for the toolbar's buttons. Left at a field's start and Right at its end move on, and a field that does not report its caret, a number field among them, is left with Tab.

## Questions for the maintainer

the maintainer decided all four as recommended. On 2026-10-20 he chose that folding stays opt-in with `data-toolbar-fold` until an application has moved, that group names sit beside the controls, and that every control shows its words at stage 1. On 2026-10-21 he agreed that no toolbar appears unless the applet asks for one.

1. **Opt in, or the new default?** I recommend that folding start as `data-toolbar-fold` and become the default in the release after an application has moved, since today's toolbars wrap and a project's layout may count on it.
2. **Group names beside the controls, or beneath them as in Office's ribbon?** I recommend beside, at stages 1 and 2, because a name beneath every group adds a line of height to every toolbar, and an application's windows are often short. A ribbon-style variant could follow if a host wants it.
3. **Words on every control at stage 1?** I recommend yes, since it is what makes the toolbar learnable, and stage 2 is one step away for a reader with less room. A control can opt out with `data-command-words="never"`.
4. **No toolbar generated from the table on its own.** I recommend this, for the reason above.
