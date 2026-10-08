# Shared Side Docks

Shared side docks add tabs and icon rails to the window manager. They are opt-in; existing layers keep their previous dock behavior. This API was introduced in v0.55.0.

The [sample workbench](../samples/shared-docks.html) has a required Workspace window, two browsers and a document. Resize it to see the rails, or use a dock's collapse button. Each rail's pin button opens its dock persistently.

## Markup

The normal window markup and source rules still apply. Add the following attributes to the layer:

```html
<div class="win-layer" data-win-layer data-win-src="#tpl-{key}"
     data-win-default="workspace,chats,flows"
     data-win-required="workspace" data-win-dock-tabs
     data-win-dock-rail-width="960">
  <!-- The server renders open windows here. -->
</div>
```

`data-win-dock-tabs` groups left and right docked windows. Top and bottom docks retain their existing behavior. Shared side docks remain at their side on narrow screens.

`data-win-required` lists keys separated by spaces or commas. Required windows open even if the address omits them. Close, replacement and re-keying cannot remove a required window, and its close controls are omitted. The normal window source must provide its markup. Required windows can move or float; they appear first in each dock, in the order given on the layer. A parent cannot close or be replaced while it has a required child.

Add `data-win-dock-only` to a window that represents a permanent side panel. It can move between left and right docks, but cannot float, snap, maximise or dock at the top or bottom. Invalid restored placements return it to the left dock. Its title bar is always hidden, even in a rail slideout. Combine this with `data-win-required` when the panel must also remain open. Its tab menu contains the applicable dock commands.

Add `data-win-dock-omit-docked` to the taskbar's `data-win-dock` element to omit docked windows from that taskbar. This includes collapsed docks. The default remains a taskbar entry for each top-level window.

A pinned shared dock hides its windows' title bars. The active tab connects to the content below it, and each tab has a window-menu button instead of a close button. Ordinary rail slideouts retain their title bars. Rails use the same square icon buttons as Pin, without dropdown buttons, including permanent side panels. The button stays depressed while its slideout is visible. Shift+F10 opens its window menu, including the placement commands for permanent side panels.

Dock labels use `text-2xs`, weight 700 and line height 1.55, matching compact badges. Collapse and Pin stay at the same outer top corner as the dock changes mode. Left docks place the toggle before their tabs, right docks after them; both rails place Pin above their tabs.

Required windows omit Close from both their window menu and the menu bar. An empty front menu is omitted. A menu with Close as its only command has no separator before it.

Windows may provide status attributes:

```html
<section class="win" data-win="chats" data-win-mode="dock-left"
         data-win-glyph="comments" data-win-attention="3"
         data-win-running data-win-progress="42">
  <!-- The normal title bar and body go here. -->
</section>
```

The glyph is the suffix of a PUDL glyph token, such as `folder` or `comments`. An absent glyph uses `app` in a side dock and leaves the existing taskbar glyph unchanged. Attention is a positive integer; invalid or zero values show no count. Running is a boolean attribute. Progress is a number from 0 to 100, displayed as a rounded percentage. A rail includes progress in its accessible name and tooltip while omitting the visible percentage. Changing these attributes updates the marks without replacing content or taking focus.

## Modes and State

```javascript
pudlWindows.dockMode('left', 'auto');
pudlWindows.dockMode('left', 'open');
pudlWindows.dockMode('right', 'rail');
```

Only `left` and `right` are accepted. `auto` uses rails when the layer is at or below `data-win-dock-rail-width` CSS pixels, default 960. `open` pins the dock open across width changes. `rail` keeps it collapsed. Choosing a mode clears the minimized flags for that side's windows. Minimize All temporarily collapses the docks; Restore All restores their prior preferences.

On opted-in layers, `pudlWindows.state()` and `pudl:windows-change` include a detached `docks` object:

```javascript
{
  left: { mode: 'auto', selected: 'workspace', size: 0.25 },
  right: { mode: 'rail', selected: 'flows', size: 0.3 }
}
```

The URL stores those entries as `d.left=auto:workspace:0.25` and `d.right=rail:flows:0.3`. These two query parameter names are reserved on opted-in layers. A side with no window has a null selection, spelled as an empty field after the first colon. Invalid modes and missing selections fall back to the available windows. Region navigation preserves these parameters. Window placements remain in `place` and `p.<key>`; a rail slideout does not change them.

The optional `size` is the dock width as a fraction of the layer width. All windows in the same dock share it, and selecting another tab never changes it. Resizing any member updates the dock preference. Moving a window into an existing dock adopts that dock's width. An empty dock retains its width for later windows. Addresses from v0.55.0 that omit the third field remain valid; their selected window supplies the initial width.

## Keyboard and Focus

Arrow keys move focus along the tabs, horizontally in an open dock and vertically in a rail. Home and End move to the first and last tabs. Enter or Space selects the focused tab. Delete requests closure through `pudl:window-closing`, so an editor can refuse while asking about unsaved changes. Required tabs ignore closure. Closing a tab focuses a remaining tab when one exists.

Shift with the horizontal arrow keys resizes the shared dock from its tab. Shift+F10 or the context-menu key opens the tab's window menu. The menu button also opens with Enter, Space or Arrow Down. Escape dismisses the menu and returns focus to its opener.

Selecting a rail tab slides out its mounted window over the central area. Working outside that window and its rail retracts it; its menus remain usable. Escape retracts it and returns focus to the rail tab, unless a menu or dialog needs the key first. Temporary slideouts are not saved in the URL. `pudlWindows.raise(key)` also reveals a docked window when its side is a rail.

PUDL generates the dock groups and their accessibility attributes. A grouped window is a tab panel, labelled by its tab, and regains its previous role and label when it leaves the group. Hosts should use the public API and status attributes rather than modifying generated elements.
