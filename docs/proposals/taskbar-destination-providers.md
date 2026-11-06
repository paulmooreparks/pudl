# Taskbar destination providers and pictures

The implementation is accepted for PUDL 0.103.0. Publication is authorized. Earlier candidate checkpoints below retain their original verification and hold conditions; consumer production promotion remains separate. The supported contract is [TASKBAR-PINS.md](../TASKBAR-PINS.md).

This design extends the 0.102.0 taskbar contract and was recorded on 7 November 2026. It was implemented and verified through isolated beta candidates before acceptance for 0.103.0. The candidate handoff retains the frozen assets and verification history.

The existing explicit destination registry is useful for small static hosts, but it must not become an item eligibility allowlist. Adding an article or applet should require its normal content metadata, without adding a taskbar registration. PUDL owns resolution lifecycle, standard commands, grouping and rendering. The host owns domain identity, reopening, authorization, application readiness and preference storage.

## Provider resolution

The proposed additive `configureTaskbar` option is `providers`, an array of `{ id, pinnable, resolve }` descriptors. A host registers each content category once, such as articles or applets. Provider IDs are stable keys. Pinning defaults to enabled; `pinnable: false` excludes a provider category. The existing `destinations` array remains supported for static integrations.

A root window supplies `data-win-destination-provider` and `data-win-destination`. The second attribute remains its stable destination ID, independent of the window instance key. Application instances share their canonical application ID. Separate articles have separate document IDs and canonical reopening links. PUDL does not infer identity from a title, instance suffix, glyph or URL prefix.

The provider's `resolve({ id, signal })` returns a result or a promise. An available result has `{ status: 'available', destination }`, where `destination` carries the existing descriptor fields and the proposed `icon` field. The returned ID must match the requested ID. A descriptor must contain a native `href` or declare `command: true`, whose activation the host handles through the existing taskbar request. A provider with neither reopening mechanism cannot make a destination pinnable.

The other explicit results are `{ status: 'unavailable' }`, `{ status: 'forbidden' }` and `{ status: 'excluded' }`. Unavailable covers temporarily absent content or capabilities. Forbidden means the current principal cannot use the destination. Excluded means the host explicitly disallows pinning or cannot reopen that window kind. A rejected promise represents a resolution failure and remains retryable. Resolution must not open or focus a window.

Root adoption starts resolution, including adoption of fetched fragments. PUDL coalesces requests for the same provider and destination. A pending resolution exposes a disabled resolving command instead of treating a missing cache entry as an exclusion. An explicit `data-win-pinnable="false"` on the root excludes that window association; descriptor or provider exclusions cannot be overridden by an instance. Hosts should mark non-reopenable window kinds explicitly. Missing identity metadata is an integration error, not an invitation to invent identity.

Unopened launcher rows carry `data-win-destination-provider` beside their existing `data-win-pin-target`. Their shared context-menu request discovers that one reference lazily. The focused menu row updates from resolving to Pin after lookup, without enumerating the catalog or opening the destination. Row-level `data-win-pinnable="false"` skips lookup and shared pin commands. This closes the unopened-row contract gap found during host integration of the first snapshot.

Destination IDs retain the existing key grammar and remain globally unique within one taskbar scope. Reusing one ID under different providers is a configuration error, rather than allowing a resolver race to decide ownership. This keeps existing pin IDs and `pin:ID` order tokens compatible. Category registration is the eligibility policy; resolved per-destination metadata is a cache, not a second allowlist.

## Saved pins and invalidation

The proposed preference snapshot adds `references`, an array of `{ id, provider }` records for provider-backed pins. Existing `pins` and `order` arrays retain their formats. The host versions its own storage envelope and restores the three fields together. Static registrations and old snapshots remain usable; the host must supply provider references when migrating old provider-backed IDs. PUDL cannot safely infer their category.

Restoring a saved reference resolves that ID directly without enumerating all articles, loading its window or requiring its presence in the launcher. Pending, unavailable and forbidden references retain membership and order, with a generic unavailable presentation and an accessible reason. Unpin remains available. Cached private labels and pictures must not be shown after a principal change until revalidated. No failed lookup silently deletes saved preferences.

The proposed `refreshTaskbarDestinations({ provider, ids })` invalidates one provider or selected IDs. Reconfiguring providers also invalidates their resolutions. An explicit configuration `scope` token forces invalidation on principal changes even when provider function identities and pin IDs stay the same. Resolution generations and abort signals prevent stale results from a previous account or configuration from replacing current state. Aborting resolution does not cancel an already accepted application open. The host continues to scope guest, account and workspace preferences and must reconfigure with the new scope before displaying another principal's pins.

Authorization is checked during resolution and again by the host or server when executing an activation. Available metadata is never an authorization grant. A permission change invalidates the provider cache; a server denial settles a command as failed and permits retry after revalidation. An existing window may still be closed or unpinned, and the host remains responsible for removing access to its sensitive content.

## Activation and readiness

Resolved navigation destinations remain real HTTP(S) links. Modified clicks, middle clicks and new-tab navigation keep native behavior. PUDL resolves metadata before enabling the link and does not replay navigation after an asynchronous permission lookup. The server validates navigation permissions normally.

Command destinations keep the existing synchronous `pudl:taskbar-activate` and `waitUntil` contract. The host validates permission, awaits the `pudlWindows.open` result, rejects `failed` or `blocked`, and then awaits independent application readiness. Fetch completion and application readiness remain separate. Repeat creation stays suppressed until settlement, and errors release pending state for retry. Delayed completion must preserve an intervening explicit window selection.

## Pictures

The proposed descriptor field is `icon`, an optional image URL. Relative URLs resolve against the document base; HTTP and HTTPS URLs are accepted. Invalid values reject the descriptor. Glyph fallback remains available through `glyph`, defaulting to the shared window glyph. Pictures are presentation metadata and never supply identity or activation policy.

PUDL will use the shared image renderer for dormant pins, running pin buttons, stacks and overflow. The destination picture represents the application or document on its aggregate pin; individual window rows retain their own `data-win-icon`. A running aggregate can use the represented window's icon when the descriptor supplies none. After the last window closes, the provider descriptor supplies the dormant picture. Hosts should return matching canonical icon metadata where continuity is desired.

The glyph remains visible until the image loads and after an image error. Failed addresses use the same shared failure cache across destination and window surfaces. Refreshing with a different icon URL permits another load; a page reload also clears the cache. Images have empty alternative text because the entry label supplies its accessible name. CSP and normal image loading rules remain host-owned. Hosts must not insert pictures into generated taskbar DOM.

## Window-order baseline and acceptance

The new candidate will start from the released 0.102.0 implementation. Its `c3230a5` correction distinguishes popup focus restoration from explicit window selection. Beta's frozen `8ed0119` predates that correction. Source comparison establishes that relationship, but does not establish that the real-host regression passes.

The retained real-host reproducer from message 5280 focuses an existing article, delays another article's fragment until popup dismissal, and checks both logical top and rendered overlap. It repeats with an intervening explicit selection and with a pinned launcher pane. Those cases must pass against the frozen candidate in Firefox, Chromium and WebKit.

The focused provider and picture acceptance checks must establish the following behavior:

- Two distinct articles expose Pin without item-specific registrations, including opening the second after pinning the first, and both restore as dormant pins after reload.
- Applet category defaults expose Pin across instances, explicit exclusions suppress Pin, and all standard pin-management surfaces agree.
- Resolver failures, unavailable providers, account changes and server permission denials preserve saved membership without exposing stale private metadata or accepting stale results.
- Pictures survive running, minimizing, restoring, unpinning, close-last and dormant reload; loading and broken pictures retain the glyph fallback.
- Native links preserve modified and new-tab behavior, while commands retain request suppression, failure settlement, application readiness and later window selection.
- Legacy static registration, ordering, overflow and readable/minified distributions continue to work.

The shared-control owner will supply a frozen snapshot identified by its base commit, source snapshot digest, archive checksum, full distribution manifest, finalized contracts and retained focused cross-engine results. The snapshot does not require a new commit while commits remain paused. The beta owner will integrate that frozen build and run real-host regressions. The separate candidate handoff records its actual verification and remaining limitations.
