# Shared Docks

Shared docks add tabs to the window manager's docks, icon rails to its side docks and a collapsed strip to its top and bottom docks. They are opt-in; existing layers keep their previous dock behavior. Shared side docks were introduced in v0.55.0, and shared top and bottom docks and tab order in v0.57.0.

The [sample workbench](../samples/shared-docks.html) has a required Workspace window, two browsers, a document, and Output and Problems windows in the bottom dock. Resize it to see the rails and the collapsed bottom strip, or use a dock's collapse button. Each collapsed dock's pin button opens it persistently.

## Markup

The normal window markup and source rules still apply. Add the following attributes to the layer:

```html
<div class="win-layer" data-win-layer data-win-src="#tpl-{key}"
     data-win-default="workspace,chats,flows,output"
     data-win-required="workspace" data-win-dock-tabs="all"
     data-win-dock-rail-width="960" data-win-dock-collapse-height="600">
  <!-- The server renders open windows here. -->
</div>
```

`data-win-dock-tabs` with no value groups left and right docked windows, and top and bottom docks keep their earlier behavior, one window at a time. `data-win-dock-tabs="all"` groups the windows at all four edges. Shared side docks remain at their side on narrow screens.

`data-win-required` lists keys separated by spaces or commas. Required windows open even if the address omits them. Close, replacement and re-keying cannot remove a required window, and its close controls are omitted. The normal window source must provide its markup. Required windows can move or float; they appear first in each dock, in the order given on the layer. A parent cannot close or be replaced while it has a required child.

Add `data-win-dock-only` to a window that represents a permanent side panel. It can move between left and right docks, but cannot float, snap, maximise or dock at the top or bottom. Invalid restored placements return it to the left dock. Its title bar is always hidden, even in a rail slideout. Combine this with `data-win-required` when the panel must also remain open. Its tab menu contains the applicable dock commands.

Add `data-win-dock-omit-docked` to the taskbar's `data-win-dock` element to omit docked windows from that taskbar. This includes collapsed docks. The default remains a taskbar entry for each top-level window.

A pinned shared dock hides its windows' title bars. The active tab connects to the content, and each tab has a window-menu button instead of a close button. Ordinary rail slideouts retain their title bars. Rails use the same square icon buttons as Pin, without dropdown buttons, including permanent side panels. The button stays depressed while its slideout is visible. Shift+F10 opens its window menu, including the placement commands for permanent side panels.

Dock labels use `text-2xs`, weight 700 and line height 1.55, matching compact badges. Collapse and Pin stay at the same outer top corner as a side dock changes mode. Left docks place the toggle before their tabs, right docks after them; both rails place Pin above their tabs. Top and bottom docks place the toggle at the end of their strip.

## Top and Bottom Docks

On a layer with `data-win-dock-tabs="all"`, the windows docked at the top or bottom share that edge under one strip that runs the width of the layer. The strip is on the dock's inner side, next to the central area. In a bottom dock it is above the content and the tabs stand on its baseline, as at the sides. In a top dock it is below the content and the tabs hang from its top edge, so the selected tab still joins its content. Every window in the dock shares one height. The dock's free edge resizes it, and so does Shift with the vertical arrow keys on a tab.

A collapsed top or bottom dock keeps its strip alone, with the same text tabs and menu buttons; there is no icon form. Selecting a tab slides its window out over the central area, between the side docks, from the strip, with the same retraction, Escape and focus rules as a rail slideout. The tab stays depressed while its window shows, and the slideout keeps its title bar.

## Modes and State

```javascript
pudlWindows.dockMode('left', 'auto');
pudlWindows.dockMode('left', 'open');
pudlWindows.dockMode('right', 'rail');
pudlWindows.dockMode('bottom', 'rail');
```

Each shared edge is accepted: `left` and `right`, and `top` and `bottom` on a layer with `data-win-dock-tabs="all"`. `auto` collapses a side dock to its rail when the layer is at or below `data-win-dock-rail-width` CSS pixels wide, default 960, and a top or bottom dock to its strip when the layer is at or below `data-win-dock-collapse-height` CSS pixels high, default 600. `open` pins the dock open across size changes. `rail` keeps it collapsed. Choosing a mode clears the minimized flags for that dock's windows. Minimize All temporarily collapses the docks; Restore All restores their prior preferences.

On opted-in layers, `pudlWindows.state()` and `pudl:windows-change` include a detached `docks` object:

```javascript
{
  left: { mode: 'auto', selected: 'workspace', size: 0.25, order: ['workspace', 'flows', 'chats'] },
  right: { mode: 'rail', selected: 'flows', size: 0.3 },
  bottom: { mode: 'open', selected: 'output', size: 0.22 }
}
```

The URL stores each entry as `d.<edge>=mode:selected:size:order`, with only what the default would not give back (issue #13, 0.58.0). The selection is written only when it differs from the window in front, or the first tab when the window in front is elsewhere. The size is written only for an empty dock, since a dock that holds windows takes its size from their placements in `p.<key>`. A dock that is automatic with nothing else to say is left out, so a page whose docks were never touched keeps a short address. For example, `d.right=rail` keeps a right rail, `d.left=auto:flows` keeps Flows selected while another window is in front, and `d.bottom=auto:::problems,output` keeps a tab order. The parameter for each shared edge is reserved on the layer. Invalid modes and missing selections fall back to the available windows. Addresses written by earlier versions, with every field, read the same as before. Region navigation preserves these parameters. Window placements remain in `place` and `p.<key>`; a slideout does not change them.

The optional `size` is the dock's width, for a side dock, or height, for a top or bottom dock, as a fraction of the layer. All windows in the same dock share it, and selecting another tab never changes it. Resizing any member updates the dock preference. Moving a window into an existing dock adopts that dock's size. An empty dock retains its size for later windows. Addresses from v0.55.0 that omit the third field remain valid; their selected window supplies the initial size.

The optional `order` lists the dock's windows in tab order. It is present only while it differs from the default order, which is the required windows in the layer's order and then the others in the order they opened. The address writes it as a fourth field, leaving the third empty when there is no size, as in `d.bottom=auto:problems::problems,output`. A window that joins the dock later goes at the end, and a window that leaves it leaves the order. An address without the field keeps the default order.

## A Strip the Server Draws

A host that renders its windows on the server, so its pages work without script, may render a shared dock's strip too (issue #14, 0.58.0). The script adopts a strip it finds and builds one only where there is none. The markup is the following, one entry per window in the dock in tab order, with the selected entry marked `data-selected`:

```html
<div class="win-dock-group" data-dock-edge="right">
  <div class="tablist win-dock-tablist" role="tablist" aria-label="Right">
    <div class="section-tab win-dock-entry" role="presentation" data-dock-entry="moderation" data-selected>
      <a role="tab" data-dock-key="moderation" aria-selected="true" href="?open=moderation,pending&amp;top=moderation">Moderation</a>
    </div>
    <div class="section-tab win-dock-entry" role="presentation" data-dock-entry="pending">
      <a role="tab" data-dock-key="pending" aria-selected="false" href="?open=moderation,pending&amp;top=pending">Pending</a>
    </div>
  </div>
</div>
```

The group is a direct child of the layer. Each tab is a link to the address that selects it, so without script selecting a tab is a page load. The server marks the dock's windows `data-win-dock-shared` with their `data-win-edge`, and gives every window but the selected one the `hidden` attribute. The script then wires the strip's keys and selection, adds the collapse toggle and the menu buttons, keeps each tab's `href` current, and selects in place, so the link is only followed without script. Space selects a link tab as it does a button.

Until a strip is there, drawn by either, a window marked `data-win-dock-shared` keeps its title bar and the whole of its dock, so a server that marks its windows to avoid a shift when the script arrives leaves no empty band where the strip would be.

## Tab Order

On every shared dock, the reader can drag an ordinary tab along its strip, or along its rail, to a new place. While the drag is under way an accent mark shows where the tab will go, and Escape cancels it. A drag ends without selecting the tab. Alt+Shift with the arrow keys along the strip moves the focused tab one place, keeping focus on it. Required windows keep the first places in the layer's order: an ordinary tab cannot move before them, and a required tab does not move. A narrow strip does not scroll during a drag, so a tab is dropped among the tabs in view.

Dragging a tab out of its strip is not supported. A docked window moves to another edge, or floats, from its window menu or by dragging its title bar.

## Keyboard and Focus

Arrow keys move focus along the tabs, horizontally in an open dock and a top or bottom strip and vertically in a rail. Home and End move to the first and last tabs. Enter or Space selects the focused tab. Delete requests closure through `pudl:window-closing`, so an editor can refuse while asking about unsaved changes. Required tabs ignore closure. Closing a tab focuses a remaining tab when one exists. Alt+Shift with the arrow keys moves the focused tab, as described above.

Shift with the arrow keys toward or away from the central area resizes the shared dock from its tab: the horizontal keys for a side dock, the vertical keys for a top or bottom dock. Shift+F10 or the context-menu key opens the tab's window menu. The menu button also opens with Enter, Space or Arrow Down. Escape dismisses the menu and returns focus to its opener.

Selecting a tab in a rail or a collapsed strip slides out its mounted window over the central area. Working outside that window and its dock retracts it; its menus remain usable. Escape retracts it and returns focus to the tab, unless a menu or dialog needs the key first. Temporary slideouts are not saved in the URL. `pudlWindows.raise(key)` also reveals a docked window when its dock is collapsed.

PUDL generates the dock groups and their accessibility attributes. A grouped window is a tab panel, labelled by its tab, and regains its previous role and label when it leaves the group. Hosts should use the public API and status attributes rather than modifying generated elements.

## Status Marks

Windows may provide status attributes:

```html
<section class="win" data-win="chats" data-win-mode="dock-left"
         data-win-glyph="comments" data-win-attention="3"
         data-win-running data-win-progress="42">
  <!-- The normal title bar and body go here. -->
</section>
```

The glyph is the suffix of a glyph token, such as `folder` or `comments`, or since 0.58.0 `flag`, `inbox`, `shield`, `terminal` or `reload`. A host that needs a shape PUDL does not have may define its own token in the same manner, a 16 by 16 SVG mask with PUDL's stroke weight, such as `:root { --glyph-ballot: url("data:image/svg+xml,…"); }`, and name it as `data-win-glyph="ballot"`; the specification asks that such a shape be proposed to PUDL if others would need it. An absent glyph uses `app` in a shared dock and leaves the existing taskbar glyph unchanged. Attention is a positive integer; invalid or zero values show no count. Running is a boolean attribute. Progress is a number from 0 to 100, displayed as a rounded percentage. A rail includes progress in its accessible name and tooltip while omitting the visible percentage. Changing these attributes updates the marks without replacing content or taking focus.
