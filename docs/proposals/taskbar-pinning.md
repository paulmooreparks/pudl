# Persistent taskbar pins

This proposal led to the persistent destinations delivered in PUDL 0.102.0. Its integration contract is in [Persistent taskbar pins](../TASKBAR-PINS.md). The existing taskbar ordering contract is documented in [Taskbar ordering](../TASKBAR-ORDER.md). The candidate checkpoints below retain the design and verification history.

Taskbar pinning and the [folded launcher label correction](folded-launcher-discoverability.md) share the 0.102.0 release after window-stack persistence. Live beta review is complete.

## Design review on 6 November 2026

The review confirmed that eligible windows need the same Pin to taskbar or Unpin from taskbar command in their taskbar context menu, top-left window menu and active Window menu. Pin membership belongs to the registered destination, so all instances share its state. The standard window commands remain available. A dormant pin offers Open and Unpin from taskbar. Multiple represented root windows use the existing stack chooser, and closing the final instance retains the pin.

The following recommendations close gaps in the proposed contract. They require implementation and focused verification before they can be advertised as supported behavior.

- PUDL should expose an optional, explicit New window action for destinations that support it. The host supplies the creation operation and its current availability. Open reuses existing instances; New window intentionally creates another. A document destination reopens its specific document. A generic application destination follows the host's normal opening policy.
- A command destination that opens asynchronously should expose pending and failure state through a documented host update. Repeated ordinary activation while the same open request is pending should not create duplicate requests. A failed or canceled operation should clear pending state and allow retry. The host must avoid stealing focus when completion follows a later user activation elsewhere. Native navigation links must retain synchronous browser activation semantics.
- Creation availability and existing-window activation should be separate capabilities. Losing permission to create another instance must not automatically prevent restoring an existing window that remains usable. Unpin must remain available when a destination cannot currently open. Permanently revoked access and temporary unavailability remain host decisions.
- A pin should count represented root windows using the existing taskbar filter. Child windows stay in their parent's family, and stack commands retain the existing close vetoes, required-window rules and attention aggregation. A pin must not make a second independent grouping decision from window titles or override docking policy.
- Pinning and unpinning should preserve active window, window Z order and the taskbar position of the affected entry. When a menu command replaces its source button, keyboard focus should recover to the resulting entry. If that entry disappears, focus should move to a neighboring taskbar entry or the taskbar control. Open choosers must reconcile instance closures without stale actions.
- Restoring preferences should reconcile stable destination IDs before asynchronous window loading finishes. Registration updates must not emit user preference changes or overwrite saved pins with a temporary empty registry. The host owns storage scope, schema migration and reconciliation across tabs or devices. Temporary absence must not silently become permanent preference deletion.
- Context menus, visible management controls and keyboard access should reach the same commands, with consistent labels and checked state. A pinned destination's accessible name should distinguish dormant, pending and running states, and a stack should identify its instance count. Narrow layouts must preserve access through overflow. Status indications must use the existing glyph and color conventions.
- The demo should exercise two instances with distinguishable titles, a delayed open, a failed open with retry, a temporarily unavailable destination, unpinning through each menu surface and reload with saved pins. It should also demonstrate that bulk window commands retain pins and that ordinary links keep modified-click and new-tab behavior.

The first implementation should preserve existing taskbar behavior outside registered destinations. Jump lists, recently used documents, cross-origin window discovery and cross-device preference synchronization remain separate host features; this release does not need new public contracts for them.

## Behavior

A person can pin a launcher destination or an eligible running taskbar entry. The destination may identify an application, a tool, a document or another host-defined work area. Its entry remains when its last window closes. Unpinning leaves any running windows open.

A pinned entry retains its position as its windows open and close. Activation opens its destination when it has no represented windows, restores or focuses its sole window, and offers the existing stack interaction when several windows belong to it. The host explicitly supplies the relationship between a destination and its windows. PUDL must not infer it from titles, URL prefixes or glyphs.

The default presentation combines the shortcut and its represented windows into one entry. A stable running indicator distinguishes a dormant destination from one with open windows; attention keeps its existing glyph and color treatment. Labels remain visible when there is room. A pin indicator can appear in management UI without occupying every taskbar entry permanently.

Close all and Minimize all operate on windows. They leave persistent pins intact. An explicit Open new command is available only when the host supports creating another instance. Removing a pin does not remove a launcher registration.

## Shared control responsibility

PUDL owns rendering, focus recovery, overflow, keyboard access and integration with taskbar arrangement and stacks. Pin to taskbar and Unpin from taskbar belong in the existing entry context menu. The visible arrangement UI also exposes pin management so touch users need no context-menu gesture. Launcher destinations can expose the same action through their accessible actions UI.

The control accepts keyed destination descriptions and explicit window associations. It emits requests for activation and changes to pin membership or order. The host supplies current state back through a documented update boundary. Reapplying unchanged state must cause no DOM mutations or layout measurement.

The existing `taskbarOrder` and `tb.order` contracts cover open root-window keys. Persistent destination identities must be separate from these keys. Implementation must define a compatible combined projection before exposing an API, including interleaved order, singleton transitions and multiple taskbars. It must not make closed window keys permanent in the existing array.

## Host responsibility

The host registers a stable destination ID, label, glyph or image, activation target and any supported instance-creation action. It associates running root windows with that ID and decides which destinations are pinnable. A particular document needs a document-specific ID if pinning it should reopen that document rather than a generic editor.

The host stores the ordered pin IDs in its existing preference system, scoped to the appropriate site, account or workspace. PUDL does not silently write browser or native storage. URLs remain responsible for addressable navigation and open-window state; persistent preferences remain separate from a shared page URL.

Navigation destinations retain real links. Tool commands retain button semantics. PUDL provides a shared activation path for pointer and keyboard interaction without requiring a host to manipulate generated taskbar DOM.

The host validates restored IDs against current registrations and permissions. It defines how temporarily unavailable destinations are shown and how permanently removed destinations are reconciled. A pin must not bypass permission checks or silently substitute a different destination.

## Proposed delivery

The first implementation should include a working sample with an application, a document and a tool. It should exercise a dormant pin, one and several running windows, close and reopen, unpin while running, overflow, rearrangement, restored preferences and unavailable destinations.

Focused Chromium, Firefox and WebKit checks must cover keyboard and pointer activation, focus preservation, stacks, existing unpinned taskbars and bulk window controls. The sample should also verify that repeated unchanged host updates produce no mutations. Persistence tests belong to the host integration as well as the shared control's state-reconciliation tests.

## Review checkpoint

The next candidate adds shared window-menu commands, pending command activation, New window and the folded launcher presentation. Beta integration is authorized on a content host, with shared-control ownership separate from host routing, preferences and deployment. Production and public release remain held for that beta review. The integration handoff must name an immutable candidate commit, asset hashes and current verification results. The host adapter must cover application readiness beyond fragment insertion and preserve unavailable stored identities. Shared glyph fallback is supported for dormant destinations; image descriptors remain outside this candidate.

The results below describe the earlier demo checkpoint. They do not verify the additions in the next candidate; new results must be recorded separately.

The implementation is available in `dist/pudl-windows.js` and its stylesheet, with the shared popup corrections in `pudl-launcher.js` and `pudl-menu.js`. Generated minified copies are current. The demo is `samples/taskbar-pinning.html`; its small host adapter owns registrations, document identity, activation and browser preference storage.

The final popup integration batch passed all 18 source suite runs and all 18 minified suite runs across Chromium, Firefox and WebKit. It covers taskbar pin lifecycles, context menus, launcher presentation, menu open tracking and title-menu integration. Earlier taskbar-only batches also passed ordering and both stack modes in all three engines. The complete logs and light, dark, narrow and launcher-action screenshots are retained under `tests/output/pins-popup-regression-source/` and `tests/output/pins-popup-regression-minified/`; earlier ordering and stack evidence is under `tests/output/pins-final-source/` and `tests/output/pins-final-minified/`. An asset hash manifest is retained at `tests/output/taskbar-pinning-review/manifest.json`.

The lifecycle checks exercise explicit root associations, dormant and running entries, multiple instances, minimize and restore, bulk close, unpin while running, interleaved ordering, host preference restoration, unavailable destinations, address validation, overflow activation and unchanged configuration with zero mutations. Launcher item actions remain open after a pin change, and closing their owner removes its context menu.

No whole-project matrix or manual assistive-technology check was run for this checkpoint. The changes have not been tagged or published as a release. The interactive demo is ready for review before that step.
