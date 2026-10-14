# an application's Second Batch: PUDL's Design

This is PUDL's design for the nine proposals an application filed between 8 and 14 October 2026 that the first two batches did not take (`pudl-docks-on-every-edge.md` became 0.57.0 and `pudl-flow-ui-controls.md` became 0.60.0). It records each decision so that the work can be judged against it. It is one release, PUDL 0.61.0 with specification 0.22.0.

the maintainer set two requirements on 14 October that shape the largest item, the mnemonics: the feature supports macOS, Linux and Windows equally, and the letters are on for every menu bar while only the accelerators that a browser owns wait for a host that declares itself a desktop application.

## 1. A desktop host (`desktop-host-host-keys.md`)

A menu bar marked `data-menubar-host="desktop"` says it belongs to an application with no browser around it. Under it the bar accepts `Mod+N`, `Mod+T` and `Mod+W`, with and without Shift, as shortcuts. `Mod+Q`, `Mod+Tab`, `Mod+A` and the clipboard keys stay reserved, since the operating system and the fields use them in a desktop host too. The same attribute turns on the mnemonics' accelerators below, so a host declares itself once.

## 2. Mnemonics (`pudl-title-mnemonics.md`, platform-neutral)

**Every title and every row has a letter.** A title declares it with `data-mnemonic` on its list item, or `mnemonic` on an applet's title; a row with `data-mnemonic` on its button or link, or `mnemonic` on an applet's item. The letter must be in the label, once per bar for titles and once per panel for rows; one that is not, or that repeats an earlier declaration, is dropped with a console warning saying which, and the first declaration wins. A title or row with no declaration is assigned one when the bar or panel is drawn: the first letter of its first word, else the first letter of a later word, else any letter of its label, the first not already taken there; a row whose label begins with a digit and a full stop gets the digit. Rows left over when the letters run out have none and keep the arrows. The window menu's generated commands take their letters from the windows script's text table, `data-win-text-<id>-mnemonic`, beside the labels. Letters are compared without case.

**The letters work on every platform, inside PUDL's own focus.** With focus on a title, a plain letter opens the title that has it, with its first row focused. In an open panel, a plain letter runs the row that has it, or opens its submenu with the first row focused; where several rows share the letter it moves focus from one to the next and Enter runs; where no row has it, nothing happens. This replaces the type-ahead that only moved focus. A disabled row's letter does nothing.

**The accelerators from outside the bar wait for a desktop host.** Under `data-menubar-host="desktop"`:
- Alt pressed and released alone moves focus to the bar's first title, on every platform, since Option alone types nothing on a Mac either. Alone means no other key between the press and the release and no loss of focus between them, so Alt+Tab does nothing on its return. Escape from a title returns focus to where it was.
- F10 does the same on Windows and Linux. macOS gives F10 to the system, and its own key for the menu bar, Ctrl+F2, reaches the native bar, not ours, so the Mac's route is Option alone.
- The platform's access-key modifier with a title's letter opens that title with its first row focused, from anywhere, a text field included: Alt on Windows and Linux, Ctrl+Option on a Mac. That is the modifier browsers document for `accesskey`, and the one the bar's existing `accesskey="m"` already rests on, so no new platform knowledge comes in. In the collapsed bar the chord opens the one menu showing that title's rows.
- A declared shortcut of the same chord as a title's letter is refused with a console warning, as a reserved key is; the title's letter wins.

Without the attribute, Alt alone, F10 and Alt with a letter stay the browser's, which uses all three.

**Underlines.** The letter is underlined in its title while the access-key modifier is held, and while focus is in the bar; in a panel's rows while the panel was opened from the keyboard, and not when it was opened with the pointer. The script wraps the letter in a span when it draws the label; a title whose content is markup rather than words, such as the host's mark, gets no underline and keeps its letter. The letters are exposed as `aria-keyshortcuts`, with the platform's chord on a title under a desktop host and the bare letter on a row.

**The bar's own access key** keeps its meaning, and a host that gives a title the letter M turns the access key off with an empty `data-menubar-key`.

## 3. Function keys from a field (`pudl-function-keys-as-chords.md`)

F1 to F12, alone or with Shift, are dispatched from a text field as chords are, since they type nothing. A field that handles one and prevents its default keeps it, as the bar already respects.

## 4. More of a markup row (`pudl-host-row-extras.md`)

A markup row reads `data-menu-danger`, `data-menu-glyph` (a glyph token's name), `data-menu-detail` (a second line in `text-muted`) and `data-menu-reason` (for a disabled row: its second line, its tooltip and its accessible description). An applet's item takes the same as `danger`, `glyph`, `detail` and `reason`. Where a row has both a detail and a reason and is disabled, the reason wins.

## 5. Markup rows that are one of several (`pudl-host-row-radio.md`)

A markup list marked `data-menu-radio` makes each of its rows with `aria-checked` a radio row of one group, exposed and drawn as an applet's radio rows are.

## 6. A listing of the keys (`pudl-shortcut-listing.md`)

`pudlMenubar.shortcuts()` returns every key bound in the bar at that moment: the key in PUDL's spelling and as shown, the row's label, its title, its source (host, pins or front) and whether it is disabled. When the bar is built, a key bound to two rows of the same source is reported in the console with both labels; a front row shadowing a host row is not, since the front-first rule means it to.

## 7. The editing toolbar (`pudl-editing-toolbar.md`)

`.toolbar[role="toolbar"]` holds `.toolbar-group[role="group"]`s of glyph buttons, menu buttons and small buttons, set apart by a 1px rule in `border`, wrapping with groups whole when the container is narrow. A button in the state the cursor is in carries `aria-pressed="true"` and the pressed look. `pudl-toolbar.js` makes the toolbar one tab stop: Left and Right move along its enabled buttons, Home and End to its ends, and the stop is kept on the last button used. A menu button whose every row is disabled is disabled with them; the script watches the rows.

Twelve glyphs: `bold`, `italic`, `underline`, `strike`, `code`, `list`, `list-numbered`, `quote`, `table`, `panel`, `colour` and `paragraph`, from an application's drawings, redrawn where their stroke differs from the set's.

## 8. Glyphs (`pudl-project-and-issue-glyphs.md`, `pudl-read-only-mark.md`)

`board` (a project, board or backlog), `ticket` (an issue, task or request), `pencil-off` (a place that cannot be written to) and `new-window` (open in a window of its own, where `open` means go to a page).

## 9. A second part of a window's title (`pudl-window-title-detail.md`)

A window may carry a detail beside its title: `data-win-detail` on the window, or `pudlWindows.retitle(key, title, detail)`. It is drawn after the title in the title bar as `.win-title-detail`, in the taskbar and dock tabs as `.win-item-detail`, and in the window menu's and Window list's rows after the separator `data-win-text-title-sep` gives, " · " by default. The title keeps priority: the detail gives way first, down to six characters and an ellipsis, and below that both shrink with the title keeping about two thirds. In an icon rail the full title and detail are the tooltip. `titleOf` and the heading's text stay the title alone, so a host that sets no detail sees no change.

## 10. Menu readiness (`pudl-menu-readiness.md`)

The WebKit failure of the B6 check in `page-patterns.test.js` is investigated by running the suite repeatedly in WebKit. The test is made to wait on the bar's own state rather than a fixed sleep: the front menu's title agreeing with the window in front. If the run shows the bar lagging the window, that is fixed in the script and a regression test added.

## 11. One addition of PUDL's own

`pudlWindows.openMenu(key)` opens a window's menu from script with its first command focused, so a host that gives the front window's menu a key, as the application's Alt+Minus does, calls PUDL rather than clicking its button.

## Release contents

- Specification 0.22.0: the menu-bar section's keys and accelerators, the desktop host, the extras of a row, the listing; a toolbar section; the window title's detail; sixteen glyphs.
- PUDL 0.61.0: `pudl-menubar.js`, `pudl.css`, `pudl-windows.js`, `pudl-windows.css`, `pudl-toolbar.js` (new), the component list, the reference page and a sample.
- Tests in the three engines for everything each proposal's verification section lists, with the mnemonics' Mac form checked by making the script believe it is on a Mac.
