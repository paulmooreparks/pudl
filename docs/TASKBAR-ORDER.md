# Taskbar ordering

Add the boolean `data-win-taskbar-reorder` attribute to the window layer to enable ordering of window entries in `.win-bar` taskbars. Load `pudl.css`, `pudl-windows.css`, `pudl-menu.js` and `pudl-windows.js` as usual. Include `pudl-toolbar.js` for the arrangement popup's folding action toolbar. Its compact glyph buttons retain accessible names and title tips, and fold into group menus as space runs out. The [working sample](../samples/taskbar-reordering.html) includes overflow and child windows.

```html
<main class="win-layer" data-win-layer data-win-taskbar-reorder>
  <!-- Application windows go here. -->
</main>
<footer class="win-bar">
  <nav class="win-dock" data-win-dock aria-label="Open windows"></nav>
</footer>
```

The attribute enables mouse and pen dragging, scoped keyboard shortcuts, context commands and a generated **Arrange taskbar** glyph button after the window list. Touch users can tap that button and use the arrangement controls. Application buttons, tray entries and window-management controls retain their authored positions. Without the attribute, the editing controls and API are inactive.

## Moving entries

A primary mouse or pen drag starts after six CSS pixels of horizontal movement. An insertion line and Before/After label identify the destination. Release inside the window list commits the move without activating, minimizing or undocking the window. Escape, pointer cancellation, lost capture, window blur, viewport resize or a window-state change cancels the gesture. A direction change cancels when the next pointer event arrives. Releasing outside the list also cancels. A small movement retains normal click behavior. Touch dragging is not enabled, so native touch gestures remain available.

With a taskbar entry focused, Alt+Shift+Left or Alt+Shift+Right moves it one represented position in the physical arrow direction. RTL reverses the relation between physical direction and canonical order. Right-click, Shift+F10 or the Context Menu key opens the entry's existing window menu, which gains a **Taskbar order** submenu. Its commands are Move earlier, Move later, Move to beginning, Move to end and Arrange taskbar. Boundary commands are disabled. These commands do not activate the window.

The bar's context menu and More menu also offer Arrange taskbar. The visible arrangement button remains available when context menus are disabled. In 0.104.0 it toggles the popup: a second click, tap, Enter or Space closes and removes it, discarding the draft. Its `aria-expanded` state follows opening and every dismissal path. The `arrangeTaskbar()` API and context-menu command retain their open behavior; the toggle update is available in 0.104.0. The nonmodal arrangement popover contains a native selectable list of all entries represented by that taskbar, including overflow entries. Select an entry and use its move buttons. **Apply order** commits the draft once; Cancel, Escape or dismissal discards it. Draft moves announce themselves as previews. Selecting an entry does not activate its window.

Direct moves retain focus on the moved link, or on More when overflow hides it. Applying an arrangement returns focus to its arrangement button. Closing the popover after focus has moved elsewhere does not steal that focus. Completed moves announce the window and its new position through a polite status region. Pointer previews do not announce every movement. Taskbar entries keep their existing link semantics.

## State and lifecycle

`pudlWindows.state().taskbarOrder` contains a detached array of open root-window keys. It is independent of `open`, the active window, MRU and shared-dock tab ordering. Required windows may move in the taskbar. Child windows retain their root's entry. New roots append, closed roots disappear, and rekey or replacement preserves the original root's slot. An open arrangement reconciles those changes by key before applying its draft.

Every `[data-win-dock]` window list renders this shared order. A list with `data-win-dock-omit-docked` projects it without deleting omitted roots from the canonical order. Commands in that list move relative to represented neighbors, including overflow entries. Only window lists inside `.win-bar` receive the editing UI.

The reserved URL parameter `tb.order` stores the comma-separated canonical order when it differs from the open-root order. Duplicate, unknown and closed keys are ignored; missing open roots append. Default order omits the parameter. Reload, sharing and Back/Forward restore it. `pudl-regions.js` preserves it during region navigation. Consumers must upgrade that script with the window assets. Existing custom URLs remain readable when editing is disabled.

Each successful direct move, drag or Apply order pushes one history entry. No-op moves and cancelled drafts write none. Existing window-state changes still have their usual history behavior.

## Public API

```js
pudlWindows.reorderTaskbar('notes', { before: 'files' });
pudlWindows.reorderTaskbar('notes', { after: 'files' });
pudlWindows.reorderTaskbar('notes', { edge: 'start' });
pudlWindows.reorderTaskbar('notes', { edge: 'end' });
pudlWindows.arrangeTaskbar();
```

`reorderTaskbar(key, destination)` returns `true` only when it changes the order. The destination must have exactly one of `before`, `after` or `edge`. Both window keys must identify current roots; self-relative moves, invalid destinations, no-ops and a disabled feature return `false`. The API uses canonical endpoints. It preserves an already focused taskbar link and does not activate the moved window.

`arrangeTaskbar(dock)` opens the arrangement for a connected `[data-win-dock]` inside a taskbar and returns whether it opened. Omitting `dock` chooses the first taskbar's list. Generated buttons, markers and the arrangement panel belong to PUDL. Applications should use these APIs instead of editing their DOM.

Labels use the existing `data-win-text-*` localization mechanism on the layer. The keys are `taskbar-arrange`, `taskbar-order`, `taskbar-items`, `taskbar-earlier`, `taskbar-later`, `taskbar-first`, `taskbar-last`, `taskbar-apply`, `taskbar-cancel`, `taskbar-before`, `taskbar-after`, `taskbar-moved` and `taskbar-preview-moved`. Before/After labels accept `{title}`; move announcements accept `{title}`, `{position}` and `{count}`.

Automated tests cover browser interaction and state. Manual screen-reader and native-host testing remains necessary before claiming interoperability with a particular assistive technology or desktop host.


## Grouped entries

With opt-in taskbar stacks, pointer moves, keyboard moves, menus and Arrange operate on displayed entries. A genuine stack gathers its logical group into a stable block; an ordinary link moves only its own key. An internal stack-list move permutes the group's occupied canonical slots. The [stack contract](TASKBAR-STACKS.md) gives interleaved and filtered examples. The public `reorderTaskbar(key, destination)` call continues to move one root window.

## Persistent destinations

The optional [persistent pin contract](TASKBAR-PINS.md) adds a separate host-owned preference order for destinations and unpinned windows. The root-window array and URL grammar above retain their existing meaning. Use `reorderTaskbarEntry` for a displayed pin or stack, and persist `taskbarState()` when handling `pudl:taskbar-change`.

In the pinned-section layout, ordering operates within the selected section. Pinning and unpinning are explicit membership changes. Older interleaved preferences are stable-partitioned into pins followed by ordinary windows; see [TASKBAR-PINS.md](TASKBAR-PINS.md#shared-pinned-section-and-site-menus).

## Compact navigation in 0.105.0

PUDL 0.105.0 places Arrange taskbar in the trailing Windows popup when the dedicated Arrange button is folded away. Choosing the command opens the same arrangement surface, anchored to the visible Windows button. Draft cancellation, preference persistence and within-section ordering are unchanged. At widths where the dedicated Arrange opener is shown, it retains its second-activation toggle behavior.
