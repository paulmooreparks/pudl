# Host launcher

PUDL 0.99.0 adds `pudl-launcher.js` as the presentation controller for a Start catalog. It composes the existing menu bar, Start, splitter and popover controls. A host supplies the catalog and its destination actions, layout, URLs and preference storage. The [interactive studies](../samples/host-launcher.html) show application, content and desktop-tool hosts.

## Setup

Load `pudl.css`, `pudl-split.js`, `pudl-start.js` and then `pudl-launcher.js`. Load `pudl-menu.js` when using the standard Size settings popover, and `pudl-menubar.js` when the site title opens the launcher. Existing Start catalogs continue to work without the launcher module.

Render the [Start markup](proposals/start-control.md) with an ID and an accessible name. Give a two-pane `.split` a first `.split-pane` to hold the pinned catalog, a `.split-handle`, and a second pane for the host workspace. Keep the taskbar outside this split. Pass connected elements from the same document:

```js
const root = document.getElementById('catalog');
pudlLauncher.enhance(root, {
  pane: document.getElementById('catalog-slot'),
  layout: document.getElementById('workspace-split'),
  invoker: document.getElementById('catalog-button'),
  presentation: 'closed',
  size: { width: 720, height: 600 },
  placement: 'auto'
});
```

`pane` must be a direct child of `layout` and represents its first pane. `invoker` is an element or a function returning the current identity button. Optional `anchor` is an element or function returning the visible control used for placement and focus return. Optional `popupHost` is a connected container outside the catalog, defaulting to `document.body`. `placement` is `auto`, `above` or `below`; automatic placement chooses the side with room. The controller constrains popup geometry to the viewport. The default popup size is 720 by 600 pixels. Sizes are positive finite numbers; effective dimensions can be smaller on a narrow viewport.

Add `data-launcher-pin` to the standard pin glyph button, `data-launcher-close` to the close button, and, optionally, `data-launcher-size` to the Size button, `data-launcher-size-panel` to its named `.popover`, and `data-launcher-width` and `data-launcher-height` to its numeric fields. Render the fields with PUDL form classes and labelled pixel units. The controller owns the pin's `aria-pressed` state and disables Size while pinned. Pinned dimensions use the existing splitter's pointer and keyboard interaction. The controller does not generate a second catalog or copy its content.

## Site title and other openers

Set `data-menubar-launcher="catalog"` on the real `[data-menubar]` to make its identity title and hamburger open that catalog. Other site menus and the active application's menus retain their normal behavior. The collapsed menu bar includes a launcher command. Initialize after the menu bar has started:

```js
pudlLauncher.enhance(root, {
  pane: document.getElementById('catalog-slot'),
  layout: document.getElementById('workspace-split'),
  invoker: () => pudlMenubar.launcherButton(),
  anchor: () => pudlMenubar.launcherButton({ visible: true })
});
```

The menu bar retains its identity button across rebuilds. The launcher consumes `pudl:menubar-launcher` for hamburger, keyboard and collapsed-menu activation. A normal button with `popovertarget="catalog"` also works, including top-bar and taskbar placement. Use `placement: 'above'` for a lower taskbar button. Native pointer invocation supplies the open/close toggle. Arrow Down opens or enters the catalog without closing an already-open one.

## Presentation and unpinning

The four presentation values are `popup`, `pane`, `collapsed` and `closed`. A visible pinned catalog is a named region. Its collapsed state retains the pinned preference while showing the workspace's second pane. An unpinned catalog is a named popover dialog. The controller exposes the current value as `data-launcher-presentation` on the root.

Pinning an open popup and immediately unpinning restores the popup. Activating a destination or clicking outside the pinned catalog clears that return intent, so subsequent unpinning closes it. Query editing and category changes within the catalog leave the intent intact. Disabled destinations do not consume it. The intent is transient and is never stored; a pane restored on a new page closes when unpinned.

Plain activation of an enabled catalog destination dismisses an unpinned popup without returning focus to the opener. The host remains responsible for routing or executing that destination. Modified link clicks retain browser behavior. A programmatic host activation, such as a link on a content desktop, calls `pudlLauncher.activated(root)` to apply the same dismissal and unpin policy. Closing or collapsing through the launcher controls restores focus to its visible invoker; native outside dismissal leaves focus with the outside action.

## API and persistence

| Method | Result |
|---|---|
| `enhance(root, options)` | Initializes a valid catalog and returns a boolean. Repeated initialization is a no-op until destruction. |
| `state(root)` | Returns `{ presentation, pinned, width, height }`, or `null` for an unknown root. Width and height describe the retained popup dimensions. |
| `present(root, mode, { focus })` | Restores a presentation explicitly. It returns a boolean and does not invent a new immediate-unpin intent. |
| `open(root)` | Opens a closed popup, expands a collapsed pane, or focuses the visible catalog. |
| `close(root)` | Closes an unpinned popup or collapses a pinned pane, restoring invoker focus. |
| `toggle(root)` | Toggles the visible popup or the pinned pane's expanded state. |
| `pin(root, boolean)` | Applies pinning or unpinning, including the transient return-intent rule. |
| `resize(root, { width, height })` | Sets either or both retained popup dimensions. Invalid dimensions return `false` without a change. |
| `activated(root)` | Records host-driven destination activation and dismisses an unpinned popup. |
| `destroy(root)` | Disconnects listeners and the resize observer, restores original placement and presentation/control attributes, and leaves the Start catalog and its data intact. |

Except for `state`, methods return booleans. Methods on an unknown root return `false`. Each controller owns its own state and handlers; several independent launchers can coexist. An unchanged presentation does not rewrite the catalog.

`pudl:launcher-change` bubbles from the catalog when presentation or retained popup dimensions change. Its detail is `{ presentation, pinned, width, height, reason }`. Reasons include `init`, `api`, `open`, `dismiss`, `toggle`, `pin`, `unpin`, `close`, `activate` and `resize`. Native popup state is reflected synchronously during `beforetoggle`; later placement does not emit a duplicate unchanged state.

The host listens to this event to update its URL or save preferences. It restores those preferences through `present` and `resize`, and uses `pudlStart.setState` for query/category state. The host also owns the outer-pane and category-divider preferences through `pudl:split`. PUDL never writes storage or browser history. Hosts can keep different popup sizes for narrow and wide layouts and should avoid feeding unchanged events back into restoration.

The host chooses its responsive workspace layout and supplies the content on the desktop background. Its taskbar remains a sibling of the launcher/workspace split, with the standard minimize-all, restore-all and close-all controls. A tool's File or Edit commands remain in its application menus.
