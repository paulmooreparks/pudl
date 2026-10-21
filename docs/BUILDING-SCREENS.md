# Building screens with PUDL

This guide is for whoever puts PUDL's components together into a screen, and it is written first for an agent doing that work. The README gives each component's markup and the reference page shows each one working, one at a time. Mistakes happen in between, where a dialog meets tabs or a toolbar meets a field, so this guide covers the combinations. Where PUDL already does the right thing by itself, the guide says so, and the markup it gives is all you need to write. Where PUDL cannot do it for you, the guide gives the rule and the reason.

The specification is the authority on what each component must be. When this guide and the specification disagree, the specification is right and this guide has a bug.

## Before you write any markup

Look for the component first. `docs/COMPONENTS.md` lists every component with its markup, and `dist/pudl-components.json` has the same list for tools. A settings card, a toolbar, a menu, a splitter, a tooltip, a toast, a tab set and an empty state all exist, and a home-made one will differ from PUDL's in some way a reader notices, such as its keys, its focus ring or its dark theme.

Do not size PUDL's components to their content by hand. A component that should keep its size already does, and one that should follow its content already does too. Setting `width`, `height`, `min-height` or `fit-content` on a dialog, a window body or a tab panel is the usual cause of a screen that jumps or leaves a gap, and the fix is almost always to remove the rule.

## Page, window or dialog

Choose where the content lives before choosing how it looks.

- **A page** holds what the reader came to the application for, with an address of its own.
- **A window** holds a record, a document or a tool the reader works in, keeps open or comes back to. It can sit beside other windows, and it has an address, so a reload or a shared link brings it back. Settings belong here.
- **A dialog** asks a question or takes a short input, and then closes with an answer. It is modal, so nothing else can be used while it is open. It has no address, so a reload loses it.

A dialog that has grown tabs of settings, or that the reader opens to look something up rather than to answer, has outgrown being a dialog. Make it a window.

## A tabbed settings window

This is the shape for an application's settings, or any tool with a few views of one thing. The tabs are the whole of the window's body, and each panel holds a settings panel of cards.

```html
<section class="win" data-win="settings" role="dialog" aria-labelledby="win-settings-title">
  <header class="win-head">
    <h2 class="win-title" id="win-settings-title">Settings</h2>
    <nav class="win-chrome" aria-label="Window">…</nav>
  </header>
  <div class="win-body">
    <div class="tabs">
      <div class="tablist" role="tablist" aria-label="Settings">
        <button role="tab" id="tab-configs" aria-controls="configs" aria-selected="true">Configurations</button>
        <button role="tab" id="tab-language" aria-controls="language">Language</button>
      </div>
      <section role="tabpanel" id="configs" aria-labelledby="tab-configs">
        <div class="settings-panel">
          <form class="card" method="post" action="/settings/configurations">
            <h3 class="card-title">Configurations</h3>
            <p class="card-desc">The folders of the installed clients.</p>
            …
          </form>
        </div>
      </section>
      <section role="tabpanel" id="language" aria-labelledby="tab-language">…</section>
    </div>
  </div>
</section>
```

With `pudl-tabs.js` loaded, PUDL does the rest. The window body gives up its padding, the tab bar runs from edge to edge directly under the title bar, and the chosen panel fills the rest of the window and scrolls on its own, so the bar stays in view. Choosing a tab never resizes or moves the window. A window that sizes to its content (`data-win-size="content"`) takes the size of its largest panel.

The `.tabs` must be the only thing in the `.win-body` for this to happen. If the window needs something above the tabs, such as a toolbar, put it inside each panel, or make the tabs the window's whole content and the toolbar part of a panel.

## A tabbed dialog

A dialog with two or three tabs of short input is fine. Put the `.tabs` straight inside the `<dialog>`, or inside a `<form>` that is, between the title and the actions.

```html
<dialog class="dialog" id="export" aria-labelledby="export-title">
  <h2 class="dialog-title" id="export-title">Export the report</h2>
  <div class="tabs">
    <div class="tablist" role="tablist" aria-label="Export">
      <button role="tab" id="tab-format" aria-controls="format" aria-selected="true">Format</button>
      <button role="tab" id="tab-pages" aria-controls="pages">Pages</button>
    </div>
    <section role="tabpanel" id="format" aria-labelledby="tab-format">…</section>
    <section role="tabpanel" id="pages" aria-labelledby="tab-pages">…</section>
  </div>
  <form class="dialog-actions" method="dialog">
    <button class="btn" value="cancel" autofocus>Cancel</button>
    <button class="btn btn-primary" value="export">Export</button>
  </form>
</dialog>
```

PUDL keeps the dialog at the size of its largest panel, so it never jumps as the reader chooses a tab. It lays every panel in the same place and keeps the ones not chosen out of sight rather than out of the layout; a panel out of sight still cannot be seen, focused, found in the page or reached by assistive technology. The tab bar reaches the dialog's sides under the title, and the panels take the dialog's colour and padding. Do not give the panels a border, a background or a height, and do not set the dialog's width to fit its content.

If one panel is much larger than the others, the dialog is large on every tab. That is the right trade, and if it looks wrong, the content is telling you it wants a window. When the panels are alike in size and you truly want the dialog to follow each one, mark the `.tabs` with `data-tabs-size="each"`.

## A dialog that may grow long

Write the dialog as usual and let PUDL handle the length. When the content is taller than the window, the title and the `.dialog-actions` stay in view and only the content between them scrolls, with a line under the title or over the actions only while there is more to scroll to. Do not add a scrolling container of your own inside the dialog, since the reader would then have two scroll bars and the actions could scroll away. A filter or another control that belongs with the title goes in a `.dialog-head` with it, and stays in view too.

## Actions

A visible context, which is a page, a window or a dialog, has at most one primary button, `btn btn-primary`. If you seem to need two, one of them is secondary or destructive.

In a dialog the action that leaves things as they were comes first and the action that commits comes last. Focus starts on the safe one, or on the first field when the dialog takes input, so a reader who presses Enter without reading does no harm. When the committing action destroys something or cannot be undone, it is `btn btn-danger` and the dialog has no primary button. PUDL draws the warning glyph on a danger button for you. Label each action with what it does, "Discard changes" rather than "OK".

## Toolbars and commands

Build a toolbar from groups of controls in a `.toolbar[role="toolbar"]`, and load `pudl-toolbar.js`. The toolbar is one stop in the Tab order, and the arrow keys move along its buttons. A field in a toolbar, such as a search box or a page number, keeps its own keys and is a Tab stop of its own, so two fields side by side are filled as in a form. Put a group that holds a field in `data-toolbar-keep` so that a folding toolbar never folds it away.

When an applet has commands, declare them once with `pudlCommands.register` and point controls at them with `data-command`, rather than wiring each button's click and state by hand. The controls then take their words, glyph, key, state and tooltip from one place, the menu bar lists their keys, and an agent can list and run them by id with `pudlCommands.list` and `pudlCommands.run`. The command table is a preview, described in `dist/pudl-commands.js` and `docs/proposals/toolbar-commands.md`.

## Status and colour

Never let colour carry a meaning alone. A status, an error or a selection also shows a glyph, a position or a change of elevation, which PUDL's components already do: an invalid field's error leads with the warning glyph, a danger button carries it too, and the chosen tab stands flat and taller. If you make something new that has a state, give the state a glyph as well as a colour.

## A checklist before you finish

- Settings, and anything the reader comes back to, are in a window, and a dialog only asks or takes a short input.
- No `width`, `height`, `min-height` or `fit-content` is set by hand on a dialog, a window body, a tab set or a tab panel.
- Tabs that fill a window are the only thing in its body; tabs in a dialog sit straight inside it or its form.
- Choosing every tab in turn moves nothing: not the dialog, not the window, not the tab bar.
- Each visible context has at most one primary button, and none where the committing action is destructive.
- A dialog's safe action comes first and has focus, and its committing action is last.
- No colour stands alone for a state.
- Every control is reachable by the keyboard, and a toolbar's fields keep their own keys.
- Both themes have been looked at.
