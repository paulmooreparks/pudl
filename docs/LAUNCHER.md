# Host launcher

PUDL 0.99.0 adds `pudl-launcher.js` as the presentation controller for a Start catalog. It composes the existing menu bar, Start, splitter and popover controls. A host supplies the catalog and its destination actions, layout, URLs and preference storage. The [interactive studies](../samples/host-launcher.html) show application, content and desktop-tool hosts.

PUDL 0.100.0 adds the activation-feedback behavior and heading inset described here.

PUDL 0.102.0 labels the folded identity action `Open launcher` with the shared app glyph. Set `data-menubar-launcher-label` on the real menu bar to localize that action. The expanded identity retains the site's own name and logo, and the folded group heading retains that name. Ordinary identity menus are unchanged.

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

## Launcher header actions

The launcher does not repeat the site or application title as a visible heading. Its opener already identifies the host. Give the catalog an accessible name such as `aria-label="Dinah launcher"`; removing a visible label must not leave a dangling `aria-labelledby` reference. The shared controller requires no visible title and does not generate one.

Use the available header space for a small set of host-level actions. Put normal PUDL buttons or navigation links with meaningful glyphs and visible labels at the leading edge, and keep the standard pin and close glyph controls at the trailing edge. The buttons use existing host commands, availability rules and safeguards. The controller owns presentation; it does not provide account, settings or process-exit implementations.

| Host type | Recommended header actions |
| --- | --- |
| Public content site with accounts | Settings and Sign In for a guest; Settings and Account for a signed-in reader. |
| Content site without accounts | Settings when useful; otherwise the host can omit the action group. |
| Web application or application suite | Settings and Account or Switch account when those concepts exist. |
| Native desktop application | Settings and Quit followed by the application name, such as Quit Dinah. |
| Shared terminal or kiosk session | Settings only when permitted, and End session when the host has a defined session-ending operation. |

These are defaults, not required placeholders. A host must omit unavailable or meaningless actions rather than add disabled filler. Account can open account management containing Sign Out, while a host with a simpler session model can offer Sign Out directly. Signing out and ending a shared session must preserve the host's existing confirmation and unsaved-work policy. Quit must invoke the native application's real guarded quit command. A browser-hosted page must not imitate that operation with window closing or PUDL Close all.

Keep context-specific commands in the relevant application menus and toolbars, and put less frequent destinations in launcher categories. Do not turn the header into a second menu bar. Allow the action group to wrap at narrow widths without covering the pin, close or search controls; retain labels whenever they fit. Header actions which open a destination can use `data-launcher-activate`, or call `pudlLauncher.activated` synchronously when accepted, to follow the standard feedback and popup-dismissal policy. Controls that operate within the launcher must not be marked as destinations.

The interactive studies demonstrate a functional Settings destination using the real window control and theme select. They omit account and Quit buttons because those browser studies have no account service or native process to terminate. A standalone embedded Start catalog may still have a meaningful section heading when it has no identifying opener; that is separate from the host-launcher header convention.

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

## Fixed taskbar commands

The launcher header is the recommended home for Settings and account or Quit actions when a host uses this pattern. A host needing permanent access may instead place ordinary glyph-bearing buttons directly in `.win-bar` before `nav.win-dock[data-win-dock]`. Avoid duplicating the same fixed action strip in both places by default. Fixed taskbar controls remain outside the generated dock and its destination registry. They cannot be reordered or unpinned through taskbar destination management. The host connects them to its existing command registry and controls availability and localization.

Keep the taskbar outside the launcher/workspace split so pinning the launcher cannot reparent or narrow it. Preserve the standard minimize-all, restore-all and close-all controls at the taskbar's trailing end. The dock uses the remaining width and its normal overflow behavior; the host must check its fixed controls at narrow widths. Route Quit through the native host's existing quit and unsaved-work guards. PUDL's close-all action continues to manage windows.

## Presentation and unpinning

The four presentation values are `popup`, `pane`, `collapsed` and `closed`. A visible pinned catalog is a named region. Its collapsed state retains the pinned preference while showing the workspace's second pane. An unpinned catalog is a named popover dialog. The controller exposes the current value as `data-launcher-presentation` on the root.

Pinning an open popup and immediately unpinning restores the popup. Activating a destination or clicking outside the pinned catalog clears that return intent, so subsequent unpinning closes it. Query editing and category changes within the catalog leave the intent intact. Disabled destinations do not consume it. The intent is transient and is never stored; a pane restored on a new page closes when unpinned.

Plain activation of an enabled catalog destination executes its existing action immediately. PUDL marks its row with `data-launcher-selected` for a static 180 ms background confirmation, then dismisses an unpinned popup without returning focus to the opener. A pinned launcher shows the same feedback and remains open. The controller never replays the click or delays host execution. Reduced-motion preferences retain this static confirmation without an animation.

Only the primary link or button in a `data-start-item` row is a destination. Auxiliary actions and categories do not start feedback. A host can mark an additional header destination with `data-launcher-activate`. Disabled destinations do nothing; repeated plain destination activation during feedback is blocked in capture before target and bubbling destination handlers run. Modified clicks, middle clicks, downloads and links targeting another browsing context keep native behavior and do not start this path.

A managed destination that prevents the original click calls `pudlLauncher.activated(root, actionElement)` synchronously when accepting that action, then executes its existing operation immediately. Existing `activated(root)` calls infer a destination from the same click when available. Without a catalog action, such as a programmatic activation from the desktop background, the call records activation and dismisses immediately. Passing an element outside the catalog follows that same immediate path. Repeated confirmation calls during one feedback interval are idempotent. These calls do not guard independent programmatic host operations from executing twice; the host still owns those operations.

Close, outside dismissal, presentation changes, filter or category changes and destruction cancel pending feedback. A pending interval cannot close a reopened or newly pinned launcher. Destination activation still clears the immediate-unpin return intent. Dismissal preserves focus already moved by the destination. Closing or collapsing through the launcher controls restores focus to the visible invoker.

A normal same-tab navigation can replace the document before confirmation is visible, and opening a modal can supersede the launcher. A visible 180 ms pause is therefore not guaranteed for every destination. Operations that require the original user gesture retain it because they execute through their original event; no permission or new-context action depends on activation surviving a timer. Hosts must remove their own delayed click replay and immediate popup-close code when adopting the shared feedback policy.

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
| `activated(root, actionElement)` | Confirms host-driven destination activation; a catalog action gets 180 ms feedback before popup dismissal. Existing calls without an element remain valid. |
| `destroy(root)` | Disconnects listeners and the resize observer, restores original placement and presentation/control attributes, and leaves the Start catalog and its data intact. |

Except for `state`, methods return booleans. Methods on an unknown root return `false`. Each controller owns its own state and handlers; several independent launchers can coexist. An unchanged presentation does not rewrite the catalog.

`pudl:launcher-change` bubbles from the catalog when presentation or retained popup dimensions change. Its detail is `{ presentation, pinned, width, height, reason }`. Reasons include `init`, `api`, `open`, `dismiss`, `toggle`, `pin`, `unpin`, `close`, `activate` and `resize`. Native popup state is reflected synchronously during `beforetoggle`; later placement does not emit a duplicate unchanged state.

The host listens to this event to update its URL or save preferences. It restores those preferences through `present` and `resize`, and uses `pudlStart.setState` for query/category state. The host also owns the outer-pane and category-divider preferences through `pudl:split`. PUDL never writes storage or browser history. Hosts can keep different popup sizes for narrow and wide layouts and should avoid feeding unchanged events back into restoration.

The host chooses its responsive workspace layout and supplies the content on the desktop background. Its taskbar remains a sibling of the launcher/workspace split, with the standard minimize-all, restore-all and close-all controls. A tool's File or Edit commands remain in its application menus.
