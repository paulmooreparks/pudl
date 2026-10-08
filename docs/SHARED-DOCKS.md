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
  left: { mode: 'auto', selected: 'workspace' },
  right: { mode: 'rail', selected: 'flows' }
}
```

The URL stores those entries as `d.left=auto:workspace` and `d.right=rail:flows`. These two query parameter names are reserved on opted-in layers. A side with no window has a null selection, spelled as an empty suffix after the colon. Invalid modes and missing selections fall back to the available windows. Region navigation preserves these parameters. Window placements remain in `place` and `p.<key>`; a rail slideout does not change them.

## Keyboard and Focus

Arrow keys move focus along the tabs, horizontally in an open dock and vertically in a rail. Home and End move to the first and last tabs. Enter or Space selects the focused tab. Delete requests closure through `pudl:window-closing`, so an editor can refuse while asking about unsaved changes. Required tabs ignore closure. Closing a tab focuses a remaining tab when one exists.

Selecting a rail tab slides out its mounted window over the central area. Working outside that window and its rail retracts it; its menus remain usable. Escape retracts it and returns focus to the rail tab, unless a menu or dialog needs the key first. Temporary slideouts are not saved in the URL. `pudlWindows.raise(key)` also reveals a docked window when its side is a rail.

PUDL generates the dock groups and their accessibility attributes. A grouped window is a tab panel, labelled by its tab, and regains its previous role and label when it leaves the group. Hosts should use the public API and status attributes rather than modifying generated elements.
