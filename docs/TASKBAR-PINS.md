# Persistent taskbar pins

The window control can retain a destination on the taskbar after its last window closes. The [interactive demo](../samples/taskbar-pinning.html) uses the standard launcher, window control, taskbar, context menus and arrangement popover. This implementation is pending release.

## Host integration

Load the usual window assets, `pudl-menu.js` for context commands and `pudl-toolbar.js` for the arrangement toolbar. Add `data-win-taskbar-reorder` to the window layer to expose arrangement, dragging and keyboard ordering. Pins themselves do not require ordering to be enabled.

Register destinations after `pudlWindows` initializes. IDs use the same key grammar as window keys. A destination needs a stable ID, a nonempty label and an optional glyph name. An optional HTTP or HTTPS `href` preserves native link navigation for a dormant destination. Relative addresses resolve against the document. Destinations without an address render as buttons.

```js
const destinations = [
  { id: 'editor', label: 'Editor', glyph: 'pencil' },
  { id: 'meeting-notes', label: 'Meeting notes', glyph: 'file' },
  { id: 'help', label: 'Help', glyph: 'info', href: '/help/' }
];

pudlWindows.configureTaskbar({
  destinations,
  pins: ['editor', 'meeting-notes'],
  order: ['pin:editor', 'pin:meeting-notes']
});
```

Set `data-win-destination="editor"` on each associated root window, including fetched fragments or templates. Multiple instances may share that destination ID. A particular document should have its own destination ID when activating its pin must reopen that document. Associations are explicit; titles, glyphs and URL prefixes are never used to infer them.

The taskbar renders a pinned destination once. One represented window restores or raises directly, and multiple represented windows use the existing stack panel regardless of the ordinary stack mode. A dormant pin stays in place and carries a pin glyph in the running indicator position. Running and attention marks retain the existing window conventions. Ordinary window lists outside `.win-bar` continue to list open windows only.

Listen on the layer for `pudl:taskbar-activate` to implement a dormant destination's action. Its detail contains `id` and `opener`. The event bubbles and is cancelable. Cancel it when handling navigation yourself; otherwise an authored `href` follows its normal browser behavior. A command destination has no default action beyond this event.

```js
layer.addEventListener('pudl:taskbar-activate', event => {
  if (event.detail.id === 'editor') {
    event.preventDefault();
    pudlWindows.open('editor', event.detail.opener);
  }
});
```

The host can set `disabled: true` for a temporarily unavailable destination or `pinnable: false` to exclude it from persistent pins. It must validate permissions when handling an activation. Removing a registration drops its pin from the control's current preferences; associated running windows remain ordinary entries. The host decides whether to retain an unavailable ID in its own storage for later restoration.

## Pin controls and persistence

`pudlWindows.pinTaskbar(id, pinned)` pins or unpins a registered eligible destination. Omit the boolean to toggle. It returns whether membership changed. A button with `data-win-pin-toggle="editor"` invokes the same path; PUDL maintains its `aria-pressed` state and disables it when the registration is missing or ineligible. Author it with the normal PUDL button and glyph markup and an accessible label.

The existing taskbar context menu gains Pin to taskbar or Unpin from taskbar. A pinned entry also retains its window or group commands. Arrange taskbar exposes a pin action for the selected entry, so touch and keyboard users can manage membership. Pin membership changes there apply immediately; Apply order and Cancel govern the arrangement's draft order. For launcher item actions, mark the row with `data-win-pin-target="editor"` and give it the standard `data-row-actions` button. The shared menu offers the same pin action through that button, right-click and the keyboard context-menu shortcut. Auxiliary row actions leave the launcher open. Context menus remain inside their owning popup so their commands do not trigger native outside dismissal. Closing that popup also removes its context menus. Hosts can also use a direct toggle button without modifying generated taskbar DOM.

Unpinning never closes a window. Close all and Minimize all continue to operate on windows and preserve persistent pins. A host supporting multiple instances can opt into the separate New window action described below; activating a running pin always uses the existing window or stack.

`pudlWindows.taskbarState()` returns detached `{ pins, order }` arrays. `order` uses `pin:ID` for persistent destinations and ordinary root-window keys for unpinned entries. Grouped ordinary windows retain their underlying root positions. New entries append. A pin replaces its current windows at their first represented slot, and unpinning replaces that slot with its surviving windows.

`pudl:taskbar-change` bubbles from the layer after an interactive pin, unpin or preference-order change. Detail contains `pins`, `order` and `reason` (`pin`, `unpin` or `order`). The host owns preference storage and account or workspace scoping:

```js
layer.addEventListener('pudl:taskbar-change', event => {
  saveTaskbarPreferences({ pins: event.detail.pins, order: event.detail.order });
});
```

Restore preferences by calling `configureTaskbar` with the current registrations. Omitted `pins` and `order` retain their previous inputs; duplicate or unknown pin IDs are ignored. Duplicate registrations, invalid descriptors and unsafe or malformed addresses reject the whole update. The method returns whether configuration changed and emits no preference event. Reapplying an unchanged configuration performs no DOM work. The control never writes browser or native storage.

## Opening and standard menus in the next candidate

Eligible windows expose Pin to taskbar or Unpin from taskbar through the same standard command list used by the top-left dropdown, the active Window menu and taskbar context menus. A child's command applies to its root's destination. A dormant pin offers Open and Unpin. Running singleton pins retain the same window and content commands as ordinary taskbar buttons. A multi-instance pin retains the existing stack commands and individual window chooser.

Register `newWindow: true` to expose New window. Set `newWindowDisabled: true` when a host limit prevents another instance. The shared `pudl:taskbar-activate` request has an `action` of `open` or `new`; creation is always host-owned. `disabled` prevents destination creation, but restoring an existing represented instance remains possible. Unpin remains available while creation is disabled. The additional localized labels are `data-win-text-taskbar-open` and `data-win-text-taskbar-new`.

For asynchronous command destinations, call `event.detail.waitUntil(promise)` during synchronous event handling. The promise must cover the host's complete readiness boundary, including fragment fetch, adoption and any required application initialization. Reject it when opening fails; resolve it when the destination is usable. Registering work consumes the activation and suppresses native navigation for that request. Multiple registered promises settle together. Repeated requests for that destination, including New window, are suppressed until all work settles. Existing instances remain activatable while creation is pending. The taskbar entry exposes `aria-busy` during this interval.

After settlement, `pudl:taskbar-activation-end` bubbles from the layer with `{ id, action, status, error }`. Status is `completed` or `failed`; error is the first rejection reason, otherwise null. Pending state is cleared before dispatch, allowing retry. The host presents any error through its normal notification UI. The event is not a cancellation API, and unpinning does not cancel an accepted open. A host that never settles its work leaves creation pending.

`waitUntil` must be called synchronously. Calling it after event dispatch, or for an `open` request backed by `href`, throws. Dormant navigation destinations remain real HTTP(S) links, with native modified-click behavior. Hosts must not defer navigation, downloads or new-tab creation into a promise and depend on user activation surviving that delay.

The follow-up candidate adds completion results to `pudlWindows.open(key, opener)` and `pudlWindows.replace(oldKey, key)`. Both return a promise resolving to `{ key, status, window, error }`. Status is `opened` after adoption, state commit and the window-open announcement, `existing` when reusing a window, `failed` for invalid keys or loading/adoption failures, or `blocked` when replacement would remove a required window family. Window is the current element or null; error is the failure reason or null. Concurrent requests for the same loading key share the same promise. Existing callers may ignore it; expected loading failures resolve as data rather than creating unhandled promise rejections. The existing authored-link navigation fallback remains in effect on failure.

This result covers the window control's adoption, not independent applet initialization. A host using `waitUntil` must turn a failed result into a rejection and then await its own application readiness. For example, `openAndInitialize` below is the host's adapter:

```js
layer.addEventListener('pudl:taskbar-activate', event => {
  event.preventDefault();
  event.detail.waitUntil(openAndInitialize(event.detail));
});

async function openAndInitialize(request) {
  const key = chooseInstanceKey(request.id, request.action);
  const result = await pudlWindows.open(key, request.opener);
  if (result.status === 'failed' || result.status === 'blocked') {
    throw result.error || new Error('Window opening was blocked');
  }
  await initializeApplication(result.window);
}
```

The host supplies `chooseInstanceKey` and `initializeApplication` for its domain. A genuine fragment failure now settles the taskbar request as soon as the fetch fails, without waiting for a readiness deadline. A host may still impose its own deadline for an initialization operation that never completes.

PUDL's ordinary asynchronous window loading preserves a later active-window selection. Host adapters that fetch and initialize windows independently must likewise avoid unconditional focus on completion. Pending work and errors are transient and are excluded from pin preferences and URLs. Reconfiguration does not cancel already accepted host work.

Preference storage must retain unavailable IDs separately from the currently registered projection. A temporarily empty registry emits no user preference event. Hosts must not save that temporary projection over durable account or guest preferences. The current descriptor accepts a shared glyph name; picture destinations should use a glyph fallback for this candidate rather than modifying generated taskbar markup.

## Ordering compatibility

Pins participate in taskbar dragging, Alt+Shift+Left/Right, overflow and the arrangement popover. `reorderTaskbarEntry(id, { before: otherId }, dock)` and its `after` variant move displayed entries through the same path. IDs are `pin:ID`, root-window keys or `group:ID` for ordinary stacks. Omit `dock` to use the first taskbar. Invalid, disabled and unchanged moves return `false`.

The existing `state().taskbarOrder`, `reorderTaskbar` and `tb.order` URL contract still describe open root windows. Persistent preferences remain separate. When pins participate, the host persists the combined order from `taskbarState`; a preference move replaces current window URL state rather than adding a browser history step. Existing unpinned taskbars retain their history behavior. A taskbar that omits docked windows filters pin membership to its represented roots; the persistent destination remains available when none are represented.

Context and arrangement labels use the existing `data-win-text-*` mechanism. The additional keys are `taskbar-pin`, `taskbar-unpin`, `taskbar-pinned-running`, `taskbar-pinned-idle` (both with `{title}`), and `more-entries` (with `{n}`). Pin indicators use the shared glyph and color tokens, including forced colors.
