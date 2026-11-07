# Persistent taskbar pins

The window control can retain a destination on the taskbar after its last window closes. The [interactive demo](../samples/taskbar-pinning.html) uses the standard launcher, window control, taskbar, context menus and arrangement popover. PUDL 0.102.0 adds this contract.

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

The taskbar renders a pinned destination once. A running entry is an ordinary taskbar window entry with retained pin membership. In 0.104.0, clicking a foreground singleton minimizes it, clicking a minimized singleton restores it, and clicking a background singleton raises it through the ordinary taskbar click handler. Multiple represented windows use the existing stack panel regardless of the ordinary stack mode. PUDL 0.104.0 groups pins at the beginning of each taskbar under a Pinned heading. Dormant entries have no window-state marker, and running and attention marks retain the ordinary window conventions. Published 0.103.0 used an individual dormant pin glyph; the shared section replaces it in 0.104.0. Ordinary window lists outside `.win-bar` continue to list open windows only.

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

`pudlWindows.taskbarState()` returns detached `{ pins, order }` arrays. `order` uses `pin:ID` for persistent destinations and ordinary root-window keys for unpinned entries. Grouped ordinary windows retain their underlying root positions. New entries append. PUDL 0.104.0 projects pins before ordinary windows while preserving the relative order within each section. Old interleaved saved order is accepted and stable-partitioned without changing membership. Unpinning returns surviving windows to the ordinary section.

`pudl:taskbar-change` bubbles from the layer after an interactive pin, unpin or preference-order change. Detail contains `pins`, `order` and `reason` (`pin`, `unpin` or `order`). The host owns preference storage and account or workspace scoping:

```js
layer.addEventListener('pudl:taskbar-change', event => {
  saveTaskbarPreferences({ pins: event.detail.pins, order: event.detail.order });
});
```

Restore preferences by calling `configureTaskbar` with the current registrations. Omitted `pins` and `order` retain their previous inputs; duplicate or unknown pin IDs are ignored. Duplicate registrations, invalid descriptors and unsafe or malformed addresses reject the whole update. The method returns whether configuration changed and emits no preference event. Reapplying an unchanged configuration performs no DOM work. The control never writes browser or native storage.

## Opening and standard menus

Eligible windows expose Pin to taskbar or Unpin from taskbar through the same standard command list used by the top-left dropdown, the active Window menu and taskbar context menus. A child's command applies to its root's destination. A dormant pin offers Open and Unpin. Running singleton pins retain the same window and content commands as ordinary taskbar buttons. A multi-instance pin retains the existing stack commands and individual window chooser.

Taskbar context menus use a consistent leading taskbar group. Taskbar order, when enabled, comes first, followed by applicable destination controls such as New window and Pin or Unpin. A separator precedes the window actions, layout submenus and content commands. Close remains last where present. Dormant pins place Open after the leading taskbar group; ordinary and pinned stack menus keep their group-close action last. Pinning changes membership wording and applicable destination controls without moving the other shared commands or their separators. Initial menus and live updates use the same composition, including ordinary running entries.

Register `newWindow: true` to expose New window. Set `newWindowDisabled: true` when a host limit prevents another instance. The shared `pudl:taskbar-activate` request has an `action` of `open` or `new`; creation is always host-owned. `disabled` prevents destination creation, but restoring an existing represented instance remains possible. Unpin remains available while creation is disabled. The additional localized labels are `data-win-text-taskbar-open` and `data-win-text-taskbar-new`.

For asynchronous command destinations, call `event.detail.waitUntil(promise)` during synchronous event handling. The promise must cover the host's complete readiness boundary, including fragment fetch, adoption and any required application initialization. Reject it when opening fails; resolve it when the destination is usable. Registering work consumes the activation and suppresses native navigation for that request. Multiple registered promises settle together. Repeated requests for that destination, including New window, are suppressed until all work settles. Existing instances remain activatable while creation is pending. The taskbar entry exposes `aria-busy` during this interval.

After settlement, `pudl:taskbar-activation-end` bubbles from the layer with `{ id, action, status, error }`. Status is `completed` or `failed`; error is the first rejection reason, otherwise null. Pending state is cleared before dispatch, allowing retry. The host presents any error through its normal notification UI. The event is not a cancellation API, and unpinning does not cancel an accepted open. A host that never settles its work leaves creation pending.

`waitUntil` must be called synchronously. Calling it after event dispatch, or for an `open` request backed by `href`, throws. Dormant navigation destinations remain real HTTP(S) links, with native modified-click behavior. Hosts must not defer navigation, downloads or new-tab creation into a promise and depend on user activation surviving that delay.

PUDL 0.102.0 adds completion results to `pudlWindows.open(key, opener)` and `pudlWindows.replace(oldKey, key)`. Both return a promise resolving to `{ key, status, window, error }`. Status is `opened` after adoption, state commit and the window-open announcement, `existing` when reusing a window, `failed` for invalid keys or loading/adoption failures, or `blocked` when replacement would remove a required window family. Window is the current element or null; error is the failure reason or null. Concurrent requests for the same loading key share the same promise. Existing callers may ignore it; expected loading failures resolve as data rather than creating unhandled promise rejections. The existing authored-link navigation fallback remains in effect on failure.

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

For legacy static registrations, preference storage must retain unavailable IDs separately from the currently registered projection. A temporarily empty registry emits no user preference event. Hosts must not save that temporary projection over durable account or guest preferences. Provider references described below retain unavailable membership within the control as well.

## Provider-backed destinations (0.103.0)

PUDL 0.103.0 adds provider resolution and destination pictures. Static registrations remain supported.

Register a provider once for each category of reopenable destination. Every associated root window supplies `data-win-destination-provider="articles"` and `data-win-destination="article-slug"`. Applet instances use their canonical applet ID as the destination, regardless of each window's instance key. The metadata belongs in the host's shared window template and content model; adding content does not require an item-specific taskbar registration.

```js
const providers = [{
  id: 'articles',
  async resolve({ id, signal }) {
    const response = await fetch('/taskbar-destinations/' + encodeURIComponent(id), { signal });
    if (response.status === 403) return { status: 'forbidden' };
    if (response.status === 404) return { status: 'unavailable' };
    if (!response.ok) throw new Error('Destination lookup failed');
    return { status: 'available', destination: await response.json() };
  }
}];

// The host supplies its scoped, versioned preference record.
pudlWindows.configureTaskbar({ providers, ...savedPreferences, scope: currentTaskbarScope });
```

The example endpoint is host-owned. Its response descriptor contains the requested `id`, a nonempty `label`, optional `glyph` and `icon`, and either an HTTP(S) `href` or `command: true`. Relative addresses resolve against the document base. A command destination uses the existing `pudl:taskbar-activate` handler and readiness contract. Static descriptors remain compatible without `command: true`; provider results require explicit reopening metadata.

Provider IDs and destination IDs use `[A-Za-z0-9_-]+`. Destination IDs remain globally unique within the configured taskbar scope. The same ID cannot belong to two providers or also be a static registration. Invalid configuration rejects the whole update. A conflicting association discovered on an adopted window is not associated with that destination. PUDL never infers identity from titles, instance suffixes or links.

Pinning defaults to enabled. Set provider `pinnable: false`, descriptor `pinnable: false`, return `{ status: 'excluded' }`, or mark a root `data-win-pinnable="false"` to exclude it. A root exclusion suppresses that window's association and standard Pin command; other instances may still represent the same destination. Non-reopenable window kinds must be explicitly excluded. Child window commands use the root's association.

Unopened launcher rows use the same provider identity. Put `data-win-destination-provider="articles"` alongside `data-win-pin-target="article-slug"` on the authored row, with its usual `data-row-actions` button or context-menu access. Set `data-win-pinnable="false"` on a row to suppress its pin commands without resolving it. Rows backed by static registrations continue to need only `data-win-pin-target`.

PUDL discovers a row's provider reference only when its shared context menu is requested. It does not enumerate or resolve the catalog at startup. While the lookup is pending, the menu displays a disabled Resolving destination command. The open menu updates through the shared menu control when resolution settles, preserving its focused row. Successful resolution enables Pin; an exclusion removes the shared actions. Pinning the row records its provider reference for dormant restoration without opening a window or activating the launcher item. The launcher popup remains open. An unknown provider stays unavailable and can be retried after registration or refresh.

Resolution runs when a window is adopted or a saved reference is restored. Requests are coalesced per destination. The disabled Resolving destination command appears while an eligible association is pending. Other results are `unavailable`, `forbidden` and `excluded`; a rejected or invalid result becomes `failed`. These results do not delete a saved pin. Their generic presentation omits cached labels and pictures, disables creation and retains Unpin. Existing represented windows retain their ordinary activation behavior; the host must independently remove access to sensitive window content when authorization changes.

`taskbarState()` and `pudl:taskbar-change` add `references: [{ id, provider }]` when providers are configured or referenced pins exist. Save this field with `pins` and `order`. Restore all three through `configureTaskbar`. Unknown provider references keep their membership and position, so temporarily unavailable categories need no destructive preference rewrite. Old static snapshots remain supported. The host explicitly migrates known old IDs to references; PUDL cannot infer their categories. Configuration remains a full registry replacement, so supply all current providers and static registrations together. An omitted references field retains known associations; pass an explicit array when replacing scoped preferences.

`pudlWindows.refreshTaskbarDestinations({ provider, ids })` invalidates matching references and returns a promise that settles after their new resolution results have been applied. Omit either filter to select all providers or all IDs. Resolution failures become disabled `failed` entries and dispatch `pudl:taskbar-resolution-error` with `{ id, provider, error }`; they do not reject the refresh promise. Call refresh to retry failed lookups or revalidate metadata after a capability change. Successful resolutions are cached until refresh or reconfiguration.

Pass a non-secret string `scope` identifying the current guest/account/workspace context, or its host-owned generation token. Changing scope forces revalidation even when the same provider functions and pin IDs are reused. The default is an empty string for legacy integrations. Scope is configuration context, is passed to `resolve({ id, signal, scope })`, and is not stored in taskbar preference snapshots. Supply it on every configuration call. Capability changes within one scope can use refresh.

Reconfiguration and refresh abort old lookup signals, immediately discard affected cached presentation metadata, and ignore results from superseded requests even if the host ignores abort. Resolution must never open or focus a window. Account changes require scoped preferences, a changed scope token and host removal of inaccessible windows. The host must still validate authorization at command execution or on native link navigation. Cached availability is not permission to execute. Scope changes invalidate lookups; they do not cancel previously accepted host commands, whose results the host must guard against a subsequent account change.

Native destinations become real links only after successful resolution. Modified clicks and new tabs retain browser behavior. Never defer native navigation through an asynchronous lookup or replay a click after resolution. Command destinations keep synchronous `waitUntil` registration, failure settlement and independent applet readiness. Provider refresh does not cancel already accepted host work.

## Destination pictures (0.103.0)

Both static and provider destination descriptors accept optional `icon`, an HTTP(S) image URL or a relative URL resolving against the document base. Invalid image descriptors reject static configuration or fail provider resolution. `glyph` remains the fallback. PUDL renders the picture on dormant and running aggregate pins, stacks and overflow using its shared image renderer. Individual window rows retain `data-win-icon`. An aggregate with no descriptor icon can use its represented window's picture while running.

The glyph stays visible until the image loads and after it fails. Image errors share the existing per-page failed-address cache across window and destination surfaces. A different image URL or a page reload permits another attempt. Pictures carry empty alternative text because the entry label supplies the accessible name. Image URLs are never identity or reopening metadata. The host owns image access, CSP and cache policy. Do not patch generated taskbar markup.

## Ordering compatibility

Pins participate in taskbar dragging, Alt+Shift+Left/Right, overflow and the arrangement popover. `reorderTaskbarEntry(id, { before: otherId }, dock)` and its `after` variant move displayed entries through the same path. IDs are `pin:ID`, root-window keys or `group:ID` for ordinary stacks. Omit `dock` to use the first taskbar. Invalid, disabled and unchanged moves return `false`.

The existing `state().taskbarOrder`, `reorderTaskbar` and `tb.order` URL contract still describe open root windows. Persistent preferences remain separate. When pins participate, the host persists the combined order from `taskbarState`; a preference move replaces current window URL state rather than adding a browser history step. Existing unpinned taskbars retain their history behavior. A taskbar that omits docked windows filters pin membership to its represented roots; the persistent destination remains available when none are represented.

Context and arrangement labels use the existing `data-win-text-*` mechanism. The additional keys are `taskbar-pin`, `taskbar-unpin`, `taskbar-pinned-running`, `taskbar-pinned-idle` (both with `{title}`), and `more-entries` (with `{n}`). Pin indicators use the shared glyph and color tokens, including forced colors.

## Responsive taskbar follow-up

PUDL 0.104.0 folds taskbar labels automatically when shrinking labels and compacting the tray cannot make entries fit. This behavior is available in 0.104.0. Folded entries use their visible identity and state marks plus standard padding. They do not share an imposed width. Empty execution slots do not offset the glyph group. Authored, window and stack entries retain a common row height; coarse-pointer touch sizing applies to both dimensions of the controls at any viewport width. A narrow fine-pointer desktop window retains its compact row height.

Authored taskbar buttons keep their glyph outside a `.win-bar-label` span and place their words inside it. The span remains available to assistive technology when folded. A direct `.win-bar` child marked `data-win-bar-items` can contain those buttons and the managed `[data-win-dock]`, allowing a composed section without host-written folding logic. Its CSS must provide a constrained flex region; a dock with `display: contents` participates directly in that region. Do not put arbitrary children inside the managed dock because the window controller owns its entries.

Entries that cannot fit after folding remain available through More with their full names. An authored popup menu opened from More uses the visible More button as its anchor. Widening restores labels and entries. Folding does not change pin membership, window order, selection or activation policy. It does not make a bare command eligible for pinning.

Destination metadata must be authored on templates and server-rendered roots before window initialization can clone or adopt them. Applying it later during host startup can leave a restored window briefly or permanently unassociated. Hosts must also synchronize controls inside restored Settings windows with the current application state.

## Shared pinned section and site menus

The managed `.win-dock` inside a `.win-bar` now supplies its own Pinned heading and section boundary. Hosts author neither the heading nor individual pinned buttons. Empty sections disappear. The shared controller folds the heading text before entry labels, then uses More for remaining overflow. Identity glyphs and pictures use standard padding, every entry type keeps the same row height, and coarse-pointer target sizing is independent of viewport width. The host may localize the heading with `data-win-text-taskbar-pinned` on the window layer.

Pinning retains the ordinary taskbar behavior. A foreground singleton minimizes on activation, a minimized window restores, and a background window raises. Multiple instances use the existing chooser. Ordering APIs, dragging, keyboard moves and Arrange taskbar operate within the selected section. A before/after move across sections returns false. Pin or Unpin changes membership explicitly. Existing root-window order URLs remain separate from saved pin preferences.

Every identified site-menubar menu offers Pin to taskbar or Unpin from taskbar through its title context menu, including the keyboard context-menu shortcut. Applet and resident-applet titles consume those requests without a PUDL or browser context menu. The actions do not appear inside menu contents. The pin editor is deferred; no pencil control is added. A site identity button configured as a launcher is an activation control rather than a menu and is excluded.

Menu pins use the built-in `pudl-site-menus` provider. `pudlMenubar.siteMenuDestinationId(menuId)` returns their canonical destination ID, which can be used in first-use defaults and ordinary pin APIs. IDs reserve `pudl-menu-` followed by four lowercase hexadecimal digits per UTF-16 code unit of the stable menu ID. Hosts must not register that provider name or destination prefix themselves. Standard menu IDs are already stable; custom menus require `data-menubar-id` so reordering and translation do not change saved identity. This metadata is an identity requirement, not a per-menu eligibility list.

The current menu representation supplies labels, availability and commands. Opening a menu pin uses the existing menubar controller, including generated Window actions, contributions, submenus, keyboard behavior, choice events and focus return. A pinned menu remains a popup when the menubar is displayed as a ribbon. Its taskbar entry never acquires window instances or sends a host `pudl:taskbar-activate` request. More anchors an overflowed menu to its visible control. Menu discovery and restoration execute no command.

Persist the complete ordinary `taskbarState()` envelope, including `references` when present. Restore it with the host's current destination/provider configuration. The built-in provider is always available when the window and menubar controls are loaded, so no host resolver or per-menu registration is required. Saved canonical menu IDs are recognized even if an older preference adapter omitted their provider references. Missing menus retain unavailable membership and can be unpinned. Account/workspace scope and stale-resolution guards use the same path as other destinations.

Destination descriptors now carry an optional `kind` of `applet`, `page` or `link`. The built-in menu provider supplies `kind: 'menu'` internally. Other kinds, including `command`, reject the whole configuration. Existing descriptors without a kind remain compatible as links when they have an address and as applet destinations otherwise. The old `command` flag controls host activation delivery and does not establish pin eligibility. Hosts should add explicit kinds when adopting this follow-up; a Quit applet may own a guarded exit workflow without maintaining a window.

These additions are available in 0.104.0. The [approved design](proposals/taskbar-pinned-section.md) records the decisions and the isolated [preview](../mockups/pinned-section.html) now uses this shared implementation.

The Arrange taskbar button is a toggle. A second activation closes and removes its popup, discarding the draft order. Enter, Space and touch follow the same path. Escape, outside dismissal, Cancel and Apply clear its expanded state; the arrangement API and context-menu command retain their existing open behavior.

## Compact navigation in 0.105.0

PUDL 0.105.0 gives inactive ordinary labels the first folding priority, then folds inactive pin labels. The current window retains its existing entry and label while space permits, even when pinned. Pinning never creates an ordinary-section copy. If glyphs still do not fit, ordinary entries remain in a horizontally scrollable taskbar dock. Inactive pins aggregate under a raised pin-glyph button, with the active pinned entry retained beside it. Further pressure truncates and eventually folds the active label. The row height remains stable.

The pin popup lists every pin with its full name and current window state. Activation delegates to the original taskbar entry, so singleton toggling, stacks, readiness and host authorization retain their existing behavior. Site-menu pins open at the visible pin-popup opener. A navigation row's context menu uses the same destination Pin or Unpin command as its original entry, including unavailable references. No pin editor is introduced.

The trailing Windows popup contains only Arrange taskbar, the useful Minimize all or Restore all action, and Close all windows in a separate final group. It replaces dedicated bulk controls under width pressure. Window buttons remain on the taskbar. Native links in either navigation popup remain anchors with their source addresses and browser attributes. Modified activation retains native navigation.

The [compact sample](../samples/compact-taskbar.html) keeps a host-authored launcher opener at the leading edge using the existing application-grid glyph. Hosts connect that opener to the same launcher catalog and keep it outside the generated dock. The [design and verification scope](proposals/compact-taskbar-navigation.md) records the approved priorities. These changes ship in 0.105.0.

Set `data-win-text-taskbar-windows` on the window layer to localize the Windows control. The existing `data-win-text-taskbar-pinned` localizes the pin-popup name and section heading. Presentation folding never rewrites the saved preference envelope. Bulk-only wrappers are omitted when their controls fold; unrelated status content in a mixed wrapper remains visible.
