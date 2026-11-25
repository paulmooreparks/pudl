# Desktop editing and menu maintenance

PUDL owns the shared fixes requested in bus messages 11178, 11195, 11197, 11241, 11249 and 11258. The messages reached this chat together on 25 November after the Software Director's overview request. The starting tree is released 0.108.2 at ee4426740ab543d040893555c74880a062c19ef4. Work happens in the dedicated desktop-edit-menus worktree. The planned release is 0.109.0 because the remote-options and editing APIs extend the public contract.

The public intake records are [issue 40](https://github.com/paulmooreparks/pudl/issues/40) for display-only shortcuts and [issue 41](https://github.com/paulmooreparks/pudl/issues/41) for the Edit menu and clipboard contract. Delivery will bind both records to the accepted 0.109.0 release and close them after that acceptance.

## Ownership and delivery

The implementation engineer owns dist/pudl-menubar.js, dist/pudl-combo.js and their focused tests/fixtures. The lead owns dist/pudl-menu.js, the new editing tests/fixtures, shared documentation and release metadata. Verification owns an independent review document. Build and Release owns generated copies and hosted validation/publication after source readiness. All contributors share the worktree and preserve one another's edits. Nobody stages or commits another owner's unfinished changes.

## Menu state and keyboard labels

Closing a menubar panel by Escape, light dismissal, another title, source removal or programmatic dismissal must clear aria-expanded on every title/row whose panel closed. Reopening must work on the first subsequent activation. Tests cover the site and another menu, plus nested panels.

A command with bind:false retains its displayed shortcut even when that key is reserved for the browser/editor. PUDL must not register or intercept that key. Bound commands retain existing reserved-key rejection. The same distinction applies in desktop and ordinary web contexts.

## Disabled reasons and flyouts

data-menubar-reasons="tooltip" on a menubar opts its disabled reasons out of visible second lines. A source list or row can override the inherited policy. The reason remains a tooltip and an accessible description with a valid aria-describedby target. data-menu-detail stays visible independently. Applet item menus offer the equivalent reasons policy through their documented descriptor/options path. The default presentation stays unchanged.

Full-width menubars support nested submenu levels from markup and applet items. Each inner panel opens beside its parent row while ancestor panels remain open. Left closes the current inner level and returns focus to its invoker; Escape, outside dismissal and source invalidation close the appropriate chain and clear expansion states. Narrow layouts preserve their existing Back navigation. Placement stays within the viewport, including RTL and edge cases.

## Remote searchable-select options

Publish a documented way to replace a searchable select's option elements and explicitly keep/reopen its list without synthesizing keyboard input. The API preserves the typed query, focus and selected value according to its documented policy, rejects stale/out-of-order remote responses, and never reopens after the reader deliberately dismisses or leaves the field. Existing local and data-combo-src behavior remains supported. The engineer records the chosen signature and lifecycle in the implementation notes before handoff.

## Shared Edit menu

pudl:contextmenu exposes detail.handlesEdit(). An applet calls it to own Cut, Copy, Paste and Select All for its editor transactions; PUDL then adds no generic edit rows. Ordinary applet rows still merge with generic edit rows, separated once. Generic editing is contributed after application handlers have had the opportunity to claim it, including handlers registered on document. This ordering must be explicit in the event-dispatch implementation rather than relying on listener registration order.

The shared menu covers supported native text fields, textareas, ordinary contenteditable and selected document text. Delivered right-click, Shift+right-click, Shift+F10 and Menu key events use the same path. Firefox can omit contextmenu dispatch for physical Shift+right-click, so embedded hosts must disable their native menu through their documented option. Cut/Copy require a selection, Cut/Paste require a writable target, and Select All applies to the actual editing target or selected document. Password text must never become a clipboard copy. Editor-owned surfaces must use their own transactions and Undo through handlesEdit.

Software Director accepted the email/number selection limit for 0.109.0 in message 11339. Both types still show the Edit menu with disabled Cut, Copy and Paste rows and an accessible explanatory reason. Their native shortcuts remain uncanceled. Select All uses select(), documented for both types, with the standard's no-selectable-text qualification. Applications needing full menu editing can use type="text" with inputmode="email" or inputmode="decimal" and their own validation, losing automatic email/number validation and any native number spinner. docs/EDIT-MENUS.md links the applicable HTML Standard sections. The limit must appear in release notes and issue 41 before adoption.

window.pudlClipboard.readText() returns Promise<string>; writeText(text) returns Promise<void>. A documented setter accepts a host transport with both methods, or resets to the browser Clipboard API. The accessor is installed by pudl-menu.js. A denied or failed host operation rejects without silently retrying another transport. Hosts may configure it after script initialization. Clipboard payloads are text only. Editors may keep their own HTML transport when the shared text accessor is unavailable.

Opening a menu preserves the original field selection or document Range. An asynchronous clipboard operation rechecks that its target is still connected, writable and owned by the same document before mutating it. Edit commands preserve native input/change semantics and ordinary undo behavior through documented APIs; the implementation must identify any browser capability gap explicitly rather than assuming undocumented editing behavior. Failed clipboard operations must not delete a selection. Tests use invented fixtures and a host clipboard stub, including rejected writes/reads and target invalidation during pending reads.

The standard command IDs are cut, copy, paste and select-all. Menus use standard labels, glyphs and display-only shortcuts. Existing application command scopes must not be overwritten to install generic editing.

## Acceptance and current state

No fixes or release are accepted at intake. Source review, focused rendered evidence, complete hosted original-outcome accounting, immutable release-byte review and downstream installed acceptance remain separate. Original failures are retained. Neither longer waits nor retries may replace a diagnosed regression. Customer documents and screenshots must not enter public fixtures.

The lead's generic editing draft and focused regressions are present. Syntax and whitespace checks pass. The first static run passed all 27 Node cases, token comparison and generated palette freshness. Subsequent source corrections add operation generations, exact selection and active-editor checks, and explicit cancellable preflight events; those corrections still need independent review and hosted native Undo/event evidence. Normal runner allocation1 passes Chromium/WebKit and fails Firefox before the rich Undo step. A separate diagnostic allocation2 retains JSON showing successful insertion, no edit error and Firefox's native adjacent-space conversion to a nonbreaking space. The original tests/output/desktop-edit-lead-20261125-1 and -2-diagnostic failures remain preserved. The focused test now compares rich Paste against an independent real-keyboard replacement in an equivalent invented editable region and retains exact original-markup Undo checks. No product behavior was changed for that test correction. docs/EDIT-MENUS.md records the concrete transport setter and capability limits. CARRYOVER.md records the current branch and pending work.

The lead will report the release and its adoption contract to Dinah VS Code and Yavc.App Team Lead. Dinah owns disabling the native webview context menu and installing its native clipboard transport after both upstream components are available. The existing 30px menu-height mockup is outside this implementation scope.

Lead allocation7 passes all six context/Edit runs across the three readable engines after correcting offscreen keyboard menu placement. The current source branch contains the planned version metadata and updated carryover; Build still needs to generate minified copies and replace README hashes from final bytes. Verification and hosted final-tree acceptance remain required. Software Director resolved the native-input scope question in message 11339 with the bounded conditions recorded above.
