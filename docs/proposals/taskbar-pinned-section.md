# Pinned taskbar section and pinnable menus

## Status

The pinned-section presentation and exclusion of bare commands were selected on 7 November 2026. Applets, pages, links and menus are eligible for pinning. Bare commands are excluded. Implementation was authorized later that day and is now present in the working source. Publication remains separate from this authorization; the published 0.103.0 contract is unchanged.

## Pinned section

The taskbar places pinned entries together at its left end, headed by the shared pin glyph and the localized label Pinned. The label folds away when space is limited; the glyph and accessible group name remain. This heading identifies a group and does not act as a toggle. A taskbar launcher, when present at the classic lower-left position, retains its established launcher position beside this group.

The section boundary identifies pin membership, so individual entries do not add a pin glyph. Identity pictures or glyphs remain visible. Window visibility, application activity and instance counts retain their own meanings. Dormant destinations have no open-window marker. The earlier icon-badge and bottom-edge-indicator suggestion is superseded by this section design.

A pinned window destination occupies one entry inside this section as its windows open and close. Multiple instances use its existing stack chooser. The ordinary-window section omits those represented windows. Unpinning preserves running windows and returns their entries to the ordinary section. Pinned links and menus do not acquire a window stack or running indicator unless they explicitly represent managed windows.

People can reorder entries within either section. Moving an entry between sections requires an explicit pin or unpin operation, so rearrangement cannot silently change persistence. Existing combined order can migrate by stable partition: retain the relative order of pinned entries and the relative order of ordinary entries. Existing saved IDs, provider references and unavailable pins remain intact.

The section label folds before overflow hides entries. Narrow layouts and overflow must preserve group identity, keyboard access, and pin-management commands. When there are no pins, the empty section is omitted. Group naming, folding and ordering belong to PUDL; the host owns localized labels and preference storage.

## Pinnable items

Applets, pages, links and menus can be pinned. A bare command cannot be pinned. Eligibility follows the item's declared kind and reopening metadata; it is never inferred from its label, glyph or current window presence.

An applet or managed page pin opens, restores or selects its represented windows using the existing destination lifecycle. A link retains its canonical address and native modified-click behavior. A menu pin opens its associated menu, anchored to the taskbar button. Opening the menu never executes one of its commands automatically. Repeated activation toggles that menu, and dismissal preserves the standard keyboard and focus behavior.

A pinned menu resolves a stable menu identity against the current host representation. Its contents reflect current account, workspace and permissions. The host retains authorization checks, unsaved-work guards and the normal execution policy for each command inside that menu. Persist the menu identity and supported context, never executable code, a captured event, a DOM reference or a snapshot of privileged menu rows.

Bare commands remain available inside their appropriate menus. A menu containing such commands can be pinned. Settings remains eligible when it identifies the Settings applet or page. Quit can also be an applet that owns an application-exit workflow, as described below. A menu pin must actually open a menu.

The published command flag delegates activation of a destination to the host, including asynchronous loading of window destinations. That implementation mechanism does not establish eligibility for pinning a bare command. The follow-up contract must distinguish the declared item kind from the host's activation mechanism, while retaining stable IDs, provider resolution and stale-scope guards. Existing descriptors need an explicit compatibility and migration policy before implementation.

## Quit applet

A host may provide a pinnable Quit applet alongside its Settings applet. An applet can own a workflow without always opening a window. Explicit activation of the Quit applet checks current application state, prompts when the existing shutdown policy requires a decision, and requests application exit when those checks allow it. An application with nothing requiring attention may exit without an extra confirmation screen. No decorative window or unconditional prompt is required solely to qualify as an applet.

The host owns the exit policy and documented native exit integration. The Quit applet uses the same shutdown coordinator as the application's other exit paths, including its handling of unsaved work, active operations, cancellation and failures. It does not duplicate state checks or bypass final validation when state changes during a prompt. Concurrent exit requests join the existing workflow rather than opening duplicate prompts or initiating multiple shutdowns.

Canceling leaves the application running and the pin intact. Merely registering, pinning, restoring taskbar preferences or resolving a saved applet reference never initiates exit. Restoring a previous session must not replay an exit request. Explicit activation starts a new workflow against current state.

The applet has a stable identity, localized label such as Quit Dinah, and the normal applet availability and activation lifecycle. Its pin does not imply a persistent open window. PUDL owns shortcut presentation and activation delivery; the host owns the workflow and its optional UI. Bare-command pinning remains excluded. The distinction is an explicit host-provided applet contract, and does not depend on whether activation happens to display a window.

## Default-pin guidance

Hosts may seed a short useful set on first use, while preserving the person's later removals and ordering. Defaults apply once per preference scope and are not reapplied on every startup. Updating the default set must not silently restore an item the person unpinned. Required fixed shell controls are separate from removable default pins.

Settings is a suitable common default when it opens an applet or page. Application-specific defaults can include Files, Terminal, a home page or a useful navigation link. A native application may seed Settings and a Quit applet labeled with the application name. A session host may seed an account menu containing the currently permitted account and session actions, or provide a session-ending applet with its own lifecycle. These are applet pins; bare commands remain excluded.

Hosts should choose a primary location for global menus rather than duplicating the same permanent strip in both the launcher header and taskbar. PUDL supplies group composition, menu anchoring and lifecycle; applications supply destinations, menu contents and authorization.

## Interactive mockup

The isolated [pinned-section mockup](../../mockups/pinned-section.html) uses the real PUDL window, taskbar, menu bar, popup-menu and dialog controls. The managed dock now renders the pinned section and menu entries. The host supplies destinations, persistence and the simulated Quit workflow; no taskbar composition CSS or custom menu pin handler remains in the mockup. Settings and Editor use real managed destination pins; View uses the same canonical command source as the actual View menu, with pin management through site-menu title and taskbar entry context menus. Quit simulates cancellation, saving and exit without calling a native bridge.

The preview was checked in Chromium at 1440, 760 and 390 CSS pixels, in light and dark themes. Settings open/close retention, menu toggle, Quit cancellation and direct simulated exit passed. Screenshots and the focused preview check are retained under `tests/output/pinned-section-*`. The mockup is uncommitted and unpublished.

The mockup now folds all taskbar entry labels to identity glyphs when their natural widths exceed available space. Labels remain available to assistive technology, and widening restores the text. Chromium, Firefox and WebKit checks confirm that the folded entries fit at 390 CSS pixels without horizontal scrolling, the menu remains operable and labels return at desktop width.

All taskbar entry types must use the same height, including authored applet/menu buttons, managed window entries, stacks and glyph-only bulk controls. Folding must preserve that height. The first mockup mixed the button and window-entry metrics; the shared taskbar rules now provide the common sizing, with regression coverage for mixed entry types.

The compact-width decision was clarified during review. Every entry folds to its visible glyph group and standard padding. There is no common fixed-width slot. Empty execution-state reservations disappear in compact mode, so glyphs do not look left-aligned beside unused space. Visible status marks and menu arrows may require additional width. The mockup now delegates folding to the shared taskbar controller and uses its sizing rules rather than a local resize observer.

The shared-source follow-up passed 24 readable and 24 minified focused runs across Chromium, Firefox and WebKit, covering glyph folding, row heights, stack transitions, tray folding, pins, context menus and dock menus. All six final source checks for the authored-button/tray measurement adjustment also passed across the three engines. The refreshed mockup passed its interaction and compact-alignment checks in Firefox and WebKit as well as Chromium. No commit or release is included in this design review.

## Refresh and sizing corrections

The mockup's earlier interaction checks did not cover restoring already-open windows. Destination metadata had been added to templates after the window controller could clone them, leaving restored roots unassociated and creating duplicate ordinary entries. Templates now declare identity before initialization. The taskbar-pinning sample received the same correction. Theme selection is hydrated from current state and persists independently of the window URL.

The mockup's additional minimum height and padding were removed. Desktop taskbar height remains stable as available width changes. Larger minimum widths and heights apply to coarse-pointer input, including at full viewport width, rather than being inferred from a narrow viewport. Glyph artwork stays at its normal size, and folding and More handle space pressure independently. The earlier touch-by-width behavior is superseded.

The separate Session example was removed. View is an existing menu in the top menu bar, and the taskbar entry draws from its canonical command source. The menu title and taskbar entry offer Pin or Unpin through their context menus. The proposed pencil editor has been removed from the mockup. Menu contents have no inline pin command. Menu pin membership persists across reloads.

## Taskbar behavior comes first

A pinned window entry is an ordinary taskbar entry with retained membership. Pinning changes its position and keeps its destination available after the last window closes. It must not introduce another implementation of window activation, sizing, state indicators or window actions. Clicking the foreground singleton entry minimizes its window; clicking a minimized entry restores it; clicking a background entry raises it. These rules apply before and after pinning. Multi-window entries retain the shared window chooser.

The shared click handler now lets running singleton pins continue into the ordinary window-entry path. Dormant destinations still use the host activation lifecycle. The mockup's Quit workflow uses that lifecycle without defining a second kind of taskbar button. Site-menu entries now use the shared built-in destination provider and the ordinary managed dock. The earlier authored adapter was removed during implementation.

## Site menu tear-offs and pin discovery

Every site-menubar menu is eligible for a pinned tear-off. Applet and resident-applet menus are excluded because their availability follows the applet context. A site menu keeps its stable menu ID, and its taskbar entry reads the same current command source as its menubar title. Standard menu IDs retain their existing meaning; custom titles declare `data-menubar-id` so localization and reordering cannot change saved identity. A tear-off opens a menu at the taskbar entry and never executes a command merely by being pinned.

Right-click or the keyboard context-menu shortcut on any site-menu title offers Pin or Unpin. This operation is absent from menu contents. Applet menu titles consume pointer and keyboard context-menu requests without opening either a PUDL menu or the browser context menu. Pin-editor design is deferred. The taskbar has no editor or pencil button. A future editor will probably live in the launcher; that placement remains provisional.

The working-source menubar adapter exposes current site-menu descriptors, title-to-site-ID resolution and current command rows. The adapter excludes applet menu titles internally, so host code does not infer scope from title text or generated DOM groups. The mockup uses that adapter for every site menu and retains only IDs in preferences.

## Current verification

The ordinary-entry click path and refresh/sizing corrections passed 18 readable suite runs across Chromium, Firefox and WebKit. The subsequent generic site-menu adapter and removal of the pin editor passed 12 readable runs across those engines. The final minified run passed all 27 focused suite runs, covering the mockup, menu references, menu choices and freshness, destination pins, folding, row height, stack transitions and taskbar overflow.

The mockup checks every authored site menu, generated Window commands and an additional custom menu without a named-menu branch. The custom menu retains its identity after renaming and reordering. Pointer and keyboard requests on applet menu titles are consumed without a context menu. The tests also verify refresh associations, no duplicate running entries, consistent desktop height across narrow boundaries, touch target sizing and the same foreground-window toggle before and after pinning. Firefox wide and Chromium narrow screenshots were inspected. Browser evidence remains under `tests/output/taskbar-common-entry-source`, `tests/output/site-menu-tearoff-source` and `tests/output/taskbar-site-menu-final-minified`.

The preview remains available at `http://127.0.0.1:8806/mockups/pinned-section.html`. These changes are uncommitted and unpublished. The pin editor is deferred, with the launcher recorded as its likely future location.

## Shared implementation contract

Implementation was authorized on 7 November 2026. PUDL renders the pinned heading and boundary inside its managed dock, stable-partitions existing combined order into pinned and ordinary sections, and retains existing IDs and provider references. Ordering within a section remains supported; cross-section ordering requests cannot change membership.

Site menus use the built-in `pudl-site-menus` destination provider. Their IDs start with the reserved `pudl-menu-` prefix followed by four lowercase hexadecimal digits for each UTF-16 code unit of the stable menu ID. Hosts must not register destinations or providers in those reserved namespaces. Saved menu references use the existing pins/order/references envelope. Menu availability and labels are resolved from the current site menu representation; absent saved menus remain removable. Standard IDs work without additional registration, while custom site menus require their documented `data-menubar-id` for stable restoration. An identity button configured to open a launcher is an applet-like launcher action rather than a site menu and is excluded from menu tear-offs.

Destination `kind` accepts `applet`, `page`, `link` or `menu`. A declared bare-command kind is rejected. Existing descriptors without kind retain compatibility as links when they have an address and as applet destinations otherwise. Their existing `command` flag remains an activation-delivery mechanism; it does not make bare commands pinnable. Hosts should migrate to explicit kinds. Menu descriptors are supplied by the built-in provider and open through the shared menu controller, preserving current command ownership, choice events, keyboard navigation, focus return and popup placement.

The isolated mockup uses the managed dock without authored pin entries, section CSS or menu context handlers. The pin editor remains deferred, probably to the launcher. This authorization covers implementation and tested candidate handoff, without publication or consumer installation.

## Arrange taskbar toggle

The Arrange taskbar button now toggles its popup. A second activation closes and removes the popup, discarding its uncommitted order draft through the normal Cancel path. Pointer clicks, Enter, Space and touch taps share this behavior. The button exposes `aria-haspopup="dialog"` and the current `aria-expanded` state. Escape, outside dismissal, Cancel and Apply clear the popup association and expanded state. Calling the existing `arrangeTaskbar()` API or choosing the context-menu command still opens the arrangement surface.

The Arrange button association uses the HTML Standard's [target-popover light-dismiss boundary](https://html.spec.whatwg.org/multipage/popover.html#topmost-clicked-popover), so the second activation reaches the owned toggle handler instead of first dismissing and reopening the popup.

## Shared implementation verification and handoff

The shared implementation is complete and remains uncommitted and unpublished. The preview authors only a managed dock; it has no special pinned buttons, section styles, per-menu pin handler or pin editor. The Arrange taskbar toggle is included.

The initial readable affected-suite run passed 86 of 87 runs. Its WebKit narrow-overflow failure exposed a host-grid sizing assumption. The grid was constrained, and rendered viewport-width coverage was added. Additional checks exposed a tear-off focus-return overwrite; the shared menu controller now retains the editor selection correctly. Those failures remain in their original output directories. The corrected lifecycle check passed in all three engines. The final readable additions passed 12 of 12 runs, and the final readable menu/preview checks passed 6 of 6 runs.

The minified affected-suite matrix passed all 87 runs across Chromium, Firefox and WebKit. After the Arrange toggle, keyboard refinements and reference validation were added, all 18 final focused minified runs passed. The final checks cover pointer/keyboard/touch-emulated toggle dismissal, draft cancellation, popup cleanup and expanded state, current site menus, ribbon-independent tear-offs, content focus return, ArrowUp/Down opening, left/right submenu scope, More anchoring, unavailable-menu removal and reserved-reference validation. Final Firefox wide and WebKit narrow screenshots were inspected. Regeneration and whitespace checks pass.

The retained evidence directories are `tests/output/pinned-section-implementation-source`, `tests/output/pinned-section-focus-overflow-correction`, `tests/output/pinned-section-implementation-minified`, `tests/output/pinned-section-arrange-and-guards-source`, `tests/output/pinned-section-final-additions-minified` and `tests/output/pinned-section-final-menu-source`. The earlier source follow-up failure is retained at `tests/output/pinned-section-implementation-followup-source`.

A frozen candidate will be identified by its source fingerprint, archive SHA-256 and per-file manifest under `tests/output/pinned-section-candidate-*`. Host handoffs must use that archive rather than mutable worktree files. Beta integration and a Dinah host build remain the consumer owners' next actions; shared implementation ownership remains here. Production deployment, desktop installation, commit and publication are outside this handoff. Headless browser verification does not claim manual assistive-technology checks or real-device touch testing.

## Release acceptance

Publication was authorized on 7 November 2026 after real-beta integration passed the shared-section suite and 15 regression runs across Chromium, Firefox and WebKit. PUDL 0.104.0 releases the accepted runtime. Earlier candidate and mockup status statements above describe their historical review stages. The pin editor remains deferred, and consumer installation and production deployment require their own authorization. Release evidence and limitations are recorded in [the verification record](../RELEASE-0.104.0.md).
