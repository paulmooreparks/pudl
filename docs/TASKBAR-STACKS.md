# Taskbar stacks

Taskbar stacks group root windows without changing their membership or canonical order. This contract is approved for implementation.

The host sets `data-win-group`, `data-win-group-label` and optional `data-win-group-glyph` on each root. Optional `data-win-section` labels consecutive runs in the popup. The layer opts in with `data-win-taskbar-stacks="always"` or `"full"`; `data-win-group-open` names the expanded group. Other mode values preserve ordinary buttons. Full mode is defined below. Group keys use the window-key alphabet, letters, digits, underscore and hyphen.

## Membership and presentation

Stack projection uses the represented roots of each taskbar after its omit-docked filter. Two or more represented roots form a stack; one remains an ordinary window button. The expanded group retains individual buttons and may still overflow. Projection never changes the canonical window order or URL. The host must restore its chosen expanded group from its own addressable application state.

A stack sits at its earliest represented member's position. Its count means represented roots, not descendants. Attention sums the represented roots' own valid attention values; running is true when any represented root has its running attribute. Descendants contribute neither value. The current taskbar reads these attributes directly from the named root, so this preserves hosts' existing aggregation choices without double-counting children. The accessible name includes running state. Progress remains on individual rows; no aggregate percentage is defined.

The host should supply consistent labels and glyphs for each group. The metadata leader is the earliest logical root in canonical order, independently of dock filtering. A missing label on that leader falls back immediately to the group key; a missing or invalid glyph uses `window`. Neither fallback searches later members. Conflicting supplied values issue a diagnostic while the leader's values prevail. Invalid group keys leave the root ungrouped. Mirrored docks therefore agree on metadata. Tests must combine missing values, conflicts, filtering, reordering and rekeying.

`pudlWindows.group(key, dock)` returns a fresh array of open root window keys in canonical taskbar order. Only omission of the second argument requests logical membership. A supplied dock must be a connected element matching `[data-win-dock]` and managed by the current window system; the query then applies its representation filter. Any invalid supplied value, including explicit `undefined`, `null`, a detached element or an unrelated element, returns a fresh empty array. An invalid or unknown group key also returns a fresh empty array. The query excludes children and does not change state.

Commands invoked from a stack act only on the roots represented by that stack in its originating dock. A docked root omitted from that dock is left alone. Labels state the represented count, for example "Close these 2 windows", with equivalent wording for minimize and restore. The count describes root targets; descendants follow their root's existing lifecycle rules. Overflow into More does not change representation or command scope. Mirrored taskbars may expose different sets and their commands apply to their own sets; they do not require logical-wide operations. A host offering a separate logical-wide command must describe that wider scope itself.

Membership and labels refresh together while a list or menu is open. At invocation, a command snapshots the currently represented roots from the originating dock, retaining both their keys and window-instance identities. Newly arriving members are not added to the operation. Immediately before each root's close begins, that same instance must still be open under its original key, belong to the group and be represented by that dock; otherwise it is skipped. A replacement under the same key is a new arrival and survives. Rekeyed targets are skipped. Revalidation reads current membership attributes and current window/filter state directly, without waiting for a MutationObserver or trusting a rendering cache. If the originating dock is removed, the remaining operation stops.

Once a root's close has begun, its existing cancellable lifecycle governs that close, including listeners on the root and its children. Regrouping, docking or removal of the originating dock during those listeners does not introduce a new implicit veto of the already-started close. The normal veto mechanism still applies. Every remaining root is revalidated before its own close starts. This boundary preserves the existing lifecycle while preventing callbacks from broadening the rest of the operation.

Choosing a stack row always raises/restores that window and dismisses the list. It never minimises the current window. This applies in More as well. Ordinary unstacked taskbar buttons retain their existing toggle behavior.

The stack list uses the existing nonmodal popover pattern, with window links and separate, named close buttons. It must not acquire listbox semantics around interactive descendants. `data-row-actions` opens a row's context menu and is excluded from keyboard focus today; it cannot serve as the proposed direct Close button. Close needs its own keyboard- and touch-accessible control.

Preview has three states: closed, hover preview and pinned open. Hover opens without moving focus; leaving both trigger and panel closes only a preview, with a short transit allowance. Clicking the previewed trigger pins it; clicking a pinned trigger closes it. Choosing a window activates it immediately and closes either form. Keyboard opening focuses the first window link. Escape dismisses the panel and restores focus only when focus belonged to the panel or its owned context menu. A preview dismissed while the editor has focus leaves that focus alone. Outside dismissal preserves the outside target's focus. Opening a row context menu must suspend hover dismissal until that menu closes.

Live updates reconcile keyed rows and keep the focused row while it exists. If that row disappears, focus moves to the next row, then the previous row. If the panel closes or is replaced, recovery tries the surviving trigger, the former focused member's visible taskbar link, the first surviving represented member, More, then the bar's next available control. If no control survives, the bar itself receives programmatic focus. Recovery runs only when the removed panel, owned menu or removed trigger held focus. An empty hover preview must not take focus from an editor. Group expansion, regrouping and singleton transitions follow this same rule. Placement follows the existing viewport-aware popover conventions for both top and bottom bars.

Section labels annotate consecutive runs in canonical order. Repeated sections repeat their heading. Sorting by section would silently alter the requested order and is excluded from the first contract.

## Ordering examples

The canonical order remains a list of window keys in `tb.order`. Consider `A1, B1, A2, B2` with both groups stacked.

| Operation | Canonical result | Display result |
|---|---|---|
| Project without moving | A1, B1, A2, B2 | A, B |
| Expand A without moving | A1, B1, A2, B2 | A1, B, A2 |
| Move A after B | B1, B2, A1, A2 | B, A |
| Move A2 before A1 inside A, from the original order | A2, B1, A1, B2 | A, B |

A genuine stack move gathers the logical group's members into a stable block. When the destination is a stack, insertion is before its first logical member or after its last. When the destination is an individual represented window, insertion is immediately before or after that key, even when other members of its group exist. A singleton link always moves only its own key, including when filtering concealed other group members. Drag, keyboard, context menus and Arrange use these same entry semantics. Existing single-window reorder APIs retain their meaning.

For canonical order `A1, B1, A2, B2`, with B expanded and A2 omitted from the dock, the display is `A1, B1, B2`. Moving A1 after B1 yields `B1, A1, A2, B2`; A2 is not gathered. With A2 represented, the display is `A, B1, B2`; moving the genuine A stack after B1 yields `B1, A1, A2, B2`, immediately before B2. Moving A before B1 in that latter display is a no-op: it must not rewrite the canonical order merely to gather A's interleaved members.

An internal move permutes only that group's occupied slots. A proposed outer move is first checked against the initiating dock's displayed entry order; if it leaves that order unchanged, it does nothing. Rendering, hovering and opening a list never normalize interleaved order. Preview, pinning and dismissal write no history. Cancelled and no-op moves write none; each effective move or changed Arrange Apply writes one entry. A change to membership or projection during a drag cancels the gesture rather than committing a stale target.

Overflow measures stack entries alongside ordinary buttons. More states both entry and window counts when stacks are present, avoiding an ambiguous count. It keeps the active root's stack visible where possible and uses a submenu for an overflowed stack. More's member links use raise/restore behavior and expose the same window commands.

Group minimize and restore compute one state transition and one history entry per effective gesture; an unchanged result writes none. Minimize sets the member roots' minimized flags together. If the active window belongs to a member family, the final top becomes the highest visible window outside those families, or null if none remains. Otherwise top stays unchanged. Restore clears the member roots' minimized flags together and preserves an existing active window, including an active child. With no active window, it retains the recorded top if that window becomes visible, otherwise selects the highest visible window after restoration. Descendants retain their own state and follow existing root visibility rules. MRU is updated once through the normal final commit; it must not record intermediate activation of every member.

Group minimize and restore use the represented-root snapshot defined above. Close Group uses that same scope and the existing cancellable close path, retaining required windows and any family that vetoes closure. The first release preserves Close All's existing per-root close/history behavior rather than introducing an unrelated transaction change. Partial refusal leaves survivors visible with valid focus. These lifecycle commands have a narrower scope than an explicit stack reorder, which gathers logical members to move their shared canonical position; reordering never activates, minimizes or closes them.


## Labels

The layer's `data-win-text-*` mechanism supplies the new words. `stack-name` defaults to `{label}, {n} windows`; nonzero attention appends `stack-attention`, defaulting to `, {attention} needing attention`, and running appends `stack-running`, defaulting to `, running`. `stack-list` names the popup and defaults to `{label}`. `stack-close-window` and `stack-window-commands` accept `{title}`. `stack-minimize`, `stack-restore` and `stack-close` accept `{n}`. `more-stacks` and `more-stacks-name` accept `{entries}` and `{windows}`. The group's label is host content and is rendered as text.

## Full mode

The `data-win-taskbar-stacks="full"` mode keeps separate root buttons until the existing fit procedure would need More. It then projects every eligible group as a stack in one transition. Groups with one represented root and ungrouped roots remain ordinary buttons. The host continues to supply opaque group keys and metadata; composing a key from a workspace and a window kind belongs to the host.

Each dock that is a direct child of a `.win-bar` makes its own decision from its represented roots and available width. Measure the separate-button layout using the existing shrink limits and compact-tray stage, with More absent. Enter stacked mode only when that layout would overflow. Do not use the widths of the currently rendered stacks to decide whether separate buttons fit.

For the return threshold, the spare room is the largest represented ordinary button's minimum fitting width, plus one inter-button gap. This uses the existing rule of 120px or the button's natural width when smaller. Return to separate buttons only when the same separate-button measurement fits with that reserve. Initial layout starts separate if it fits; subsequent layouts retain the current mode within the gap between thresholds. An empty dock resets to separate. Font, title, status, membership, filter and available-width changes must invalidate the measurement. Overflow uses the existing 1 CSS pixel tolerance: `scrollWidth > clientWidth + 1`. Returning to separate buttons requires measured spare room plus 1 CSS pixel to reach the reserve. A dock outside a `.win-bar` keeps separate buttons in full mode because it has no More-based fit boundary.

Full mode ignores `data-win-group-open`; always mode keeps honoring it. If the stacked projection still overflows, the existing More behavior applies. These presentation changes must not rewrite canonical order, URL history, activation or MRU state.

The transition rule holds the dock's current projection while its preview, pinned list, owned menu or submenu, Arrange session, or drag is active. Changes mark its fit as pending. After the last such interaction closes, commits or cancels, measure the current layout again and apply the threshold rule once; do not replay a mode selected from an earlier measurement. Unrelated menus do not hold this dock. Pending work must survive skipped fit calls and unchanged widths, as deferred toolbar folding does.

Deferral does not freeze live membership, command eligibility or viewport-safe popup placement. Existing removal and cancellation rules still apply if an interaction's target disappears. When the deferred projection removes a focused trigger, use the existing taskbar focus-recovery rules; a pointer preview must not take focus from an outside editor. The fit itself writes no history and does not activate a window.

Verification must cover both threshold directions, repeated near-threshold changes, filtered and mirrored docks, long localized labels, font arrival, RTL, and stacks that still require More. It must also cover nested interactions, closing the last interaction without a width change, cancellation, target removal and pending changes superseded before dismissal. Implementation was authorized on 30 October 2026.
