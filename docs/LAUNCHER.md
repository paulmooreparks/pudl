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

Add `data-launcher-pin` to the standard pin glyph button, `data-launcher-close` to the close button, and, optionally, `data-launcher-size` to the Size button, `data-launcher-size-panel` to its named `.popover`, and `data-launcher-width` and `data-launcher-height` to its numeric fields. Render the fields with PUDL form classes and labelled pixel units. The controller owns the pin's `aria-pressed` state. Size remains enabled while pinned and exposes only the pane's active axis. Pinned dimensions also use the existing splitter's pointer and keyboard interaction. The controller does not generate a second catalog or copy its content.

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

Keep the taskbar outside the launcher/workspace split so pinning the launcher cannot reparent or narrow it. Preserve the standard minimize-all, restore-all and close-all controls at the taskbar's trailing end so PUDL can fold them into Windows when space is limited. The dock uses the remaining width and its normal overflow behavior; the host must check its fixed controls at narrow widths. Route Quit through the native host's existing quit and unsaved-work guards. PUDL's close-all action continues to manage windows.

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
| `state(root)` | Returns `{ presentation, pinned, width, height, compact, visible, paneAxis, paneSize }`, or `null` for an unknown root. Presentation is the desktop preference; width and height are requested popup dimensions, while paneSize holds requested pane dimensions. |
| `present(root, mode, { focus })` | Restores a presentation explicitly. It returns a boolean and does not invent a new immediate-unpin intent. |
| `open(root)` | Opens a closed popup, expands a collapsed pane, or focuses the visible catalog. |
| `close(root)` | Closes an unpinned popup or collapses a pinned pane, restoring invoker focus. |
| `toggle(root)` | Toggles the visible popup or the pinned pane's expanded state. |
| `pin(root, boolean)` | Applies pinning or unpinning, including the transient return-intent rule. |
| `resize(root, { width, height })` | Sets retained popup dimensions while floating, or the applicable pane dimension while pinned on desktop. Invalid dimensions return `false` without a change. |
| `activated(root, actionElement)` | Confirms host-driven destination activation; a catalog action gets 180 ms feedback before popup dismissal. Existing calls without an element remain valid. |
| `resetSize(root)` | Restores the applicable default dimensions; compact mode restores both saved desktop sizing defaults. |
| `destroy(root)` | Disconnects listeners and the resize observer, restores original placement and presentation/control attributes, and leaves the Start catalog and its data intact. |

Except for `state`, methods return booleans. Methods on an unknown root return `false`. Each controller owns its own state and handlers; several independent launchers can coexist. An unchanged presentation does not rewrite the catalog.

`pudl:launcher-change` bubbles from the catalog when presentation or retained popup dimensions change. Its detail includes `{ presentation, pinned, compact, visible, width, height, paneAxis, paneSize, reason }`. Reasons include `init`, `api`, `open`, `dismiss`, `toggle`, `pin`, `unpin`, `close`, `activate` and `resize`. Native popup state is reflected synchronously during `beforetoggle`; later placement does not emit a duplicate unchanged state.

The host listens to this event to update its URL or save preferences. It restores those preferences through `present` and `resize`, and uses `pudlStart.setState` for query/category state. The host also owns the outer-pane and category-divider preferences through `pudl:split`. PUDL never writes storage or browser history. Hosts can keep different popup sizes for narrow and wide layouts and should avoid feeding unchanged events back into restoration.

The host chooses its responsive workspace layout and supplies the content on the desktop background. Its taskbar remains a sibling of the launcher/workspace split, with the standard minimize-all, restore-all and close-all controls. A tool's File or Edit commands remain in its application menus.

## Compact navigation in 0.105.0

The working candidate requires a leading taskbar launcher opener in compact mode. On desktop, it hides that control when a direct site-title launcher is visible, unless `taskbarAlways` is true. The controller reuses an existing taskbar invoker or generates a normal application-grid button in the host taskbar. A normal `button[popovertarget]` with `placement: 'above'` uses the existing controller. The title-menu route can remain available. Launcher placement stays stable across widths, and the opener remains outside the taskbar destination registry.

Touch and pen activation open for browsing without focusing the filter. Keyboard invocation and mouse opening retain search focus. The decision follows the actual invocation, independently of viewport width and coarse-pointer sizing. The catalog receives non-input focus in browse mode; tapping its filter requests text entry. Query, category and scroll state survive closing and reopening. The controller does not focus the filter and then blur it as a workaround.

`pudlLauncher.open(root, { focus: 'browse' })` and `.toggle(root, { focus: 'browse' })` request browse focus explicitly. The default remains search focus for API callers. `present(root, mode, { focus: 'browse' })` applies the same policy when presenting a pane or popup. Boolean `focus: true` retains search behavior. Boolean false preserves the caller's existing no-focus policy. The underlying Start API accepts `pudlStart.open(root, opener, { focus: 'browse' })` and `pudlStart.focus(root, 'browse' | 'search')`. Standalone native Start openers also follow touch and pen invocation intent.

The menubar synchronizes its retained title and companion launcher control with the catalog's popup or pane presentation, even when the controller uses a separate primary opener. Initially embedded catalogs can become popups after the menubar initializes. Hosts do not need to modify generated title attributes.

The standard Windows popup now provides bulk window commands under pressure; hosts no longer need to reserve separate narrow-layout slots for Arrange, Minimize all and Close all. Update the window script and stylesheet, menu, menubar, Start and launcher scripts together when adopting 0.105.0. See the [compact sample](../samples/compact-taskbar.html).

Resize-driven launcher placement is coalesced into an animation frame. Placement can change the popup's CSS height limit, so it runs after resize-observer delivery and allows nested splitters to settle. The pending work is cancelled when the controller is destroyed.


## Responsive presentation and contextual Size controls

The default compact breakpoint is 650 CSS pixels. Set `compactAt` to another nonnegative width, or false for desktop-only presentation. Compact mode presents the existing catalog as a manual popover filling the connected workspace layout. The host header and taskbar stay available. The launcher has no floating frame or resize handle, and the Pin button is hidden. It closes through its opener, Close, Escape or accepted destination activation, including taskbar window and stack selection. Modified native taskbar links leave it intact. A click elsewhere does not light-dismiss it.

The desktop presentation preference survives compact opening and closing, including reloads when the host persists `state().presentation`. Widening restores that preference. Optional `compactVisible` restores compact visibility independently at initialization. State adds `compact` and `visible` so hosts can distinguish the responsive appearance from the stored desktop preference. The catalog, query, categories, item identity and scroll positions remain the same objects. Hosts should provide a taskbar outside the workspace layout; optional `taskbar` supplies that element when the default `.win-bar` lookup is insufficient. `taskbarAlways: true` retains its opener on desktop.

Size remains enabled. Floating launchers expose width and height. A pinned side pane exposes width; a `.stacked` layout exposes height. Compact mode hides numeric fields and explains automatic workspace sizing. `data-launcher-reset` invokes the shared reset operation. If a Size panel omits that hook, the controller supplies a Reset button. Optional `data-launcher-size-note` supplies host-localized compact sizing guidance; otherwise the controller supplies it. Numeric fields should each have their own containing label so the complete inapplicable field can be hidden.

Popup `size` and pane `paneSize` are separate requested dimensions. `paneSize` is an optional object with positive width and height values; the applicable axis follows the split orientation. State reports both forms. Hosts can persist them through `pudl:launcher-change`, including `pane-resize`, `reset-size` and `responsive` reasons. A viewport constraint must not replace a larger requested size with the constrained measurement. Native CSS resize measurements update the retained popup size only while the corresponding requested dimension is unconstrained; explicit Size fields remain available for setting a smaller requested size.

`defaultSize` supplies popup reset dimensions, defaulting to 720 by 600 pixels. `defaultPaneSize` optionally supplies a positive reset size for the split's current axis. Without it, reset removes the split's inline sizing property and restores the layout stylesheet. Compact Reset restores saved desktop defaults without changing its current full-workspace appearance. Closing Size settings returns focus to Size and leaves the launcher open.

The [responsive design](proposals/responsive-launcher.md) records the approved policy. This behavior ships in 0.105.0. Hosts should remove width-based popup-size substitutions and unconditional filter focus, and use the shared state and invocation policy.

An unhandled Escape dismisses an open compact launcher even when focus is on the taskbar or elsewhere outside the catalog. Other open popovers and modal dialogs receive their own dismissal first. A key event already handled by another control does not dismiss the catalog. Dismissal returns focus to the compact opener and preserves the desktop presentation preference. Desktop panes retain their existing Escape behavior.
