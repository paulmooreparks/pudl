# Desktop menu and remote option implementation

The implementation engineer owns pudl-menubar.js, pudl-combo.js and focused fixtures/tests in this worktree. Shared menu editing, documentation and release files remain lead-owned.

## API choices

pudlCombo.beginOptions(select) returns an opaque request ticket for an enhanced searchable select while its proxy is focused and usable. A later request supersedes the prior ticket. pudlCombo.replaceOptions(select, ticket, options, {open:true}) accepts an array of native option elements, clones them into the source and returns true only when the ticket still owns the same focused query/lifecycle. Invalid tickets return false without mutating options or reopening. The current selected option/value remains selected, including when absent from a result page. Query text, selection/caret and focus remain unchanged; script replacement fires no input/change events. Opening is explicit and uses the retained query. The select emits bubbling pudl:combo-query after trusted query input, with detail.query and detail.ticket. Hosts can listen on the original select without depending on the generated proxy ID. The caller uses that ticket for the lookup, or explicitly calls beginOptions for another request; it never synthesizes keys. Tickets are frozen opaque identity tokens. After deliberate dismissal, beginOptions returns null until a fresh input, explicit browse key/button or focus re-entry supplies reader intent. Reset, blur, disabling, source movement and ancestor hidden/inert changes retire pending ownership. Pending mutation records are consumed before ticket acquisition/replacement, so same-turn disabling or remove/reinsert cannot resurrect a request. Dismissal, leaving the field, query changes and source invalidation retire ownership.

The menubar reasons policy uses data-menubar-reasons="tooltip" on the bar and data-menu-reasons on a source list or command row. The explicit alternative is inline. Applet menu/title/item descriptors accept reasons with the same tooltip/inline values. Tooltip-only reasons retain a separately identified visually hidden accessible description while detail remains visible. Default inline behavior remains unchanged.

Nested wide flyouts use one manual popover per level, attached to their parent panel. Opening a sibling retires only that sibling branch. Existing placement handles viewport and direction; narrow menus retain in-place Back navigation.

## Verification status

The assigned implementation is ready for independent source review. No generated copies, commit, publication or complete hosted acceptance is claimed. The lead-owned context-item reasons path in pudl-menu.js is a separate integration dependency; message 11319 identifies it explicitly.

Menubar closure publishes collapsed state synchronously, including native beforetoggle closure, and clears title/glyph associations before later toggle delivery. Display-only shortcuts bypass reserved-binding rejection and stay out of the bound shortcut listing and dispatch. Markup uses data-shortcut-bind="false". Both web and desktop contexts retain reserved-key rejection for bound commands. Tooltip-only reasons keep a visually hidden identified description and an independent visible detail. Item/list overrides and applet menu/title/item reasons inheritance are retained.

Wide menus use one manual popover per submenu level. A branch close excludes its own host panel and removes only descendants, clearing each invoker's expansion state. Refresh reconciles every surviving level and closes unavailable branches. The original first-submenu ID remains stable for existing tests; deeper panels have unique IDs. Left/Escape return focus to the immediate invoker, root dismissal clears the full chain, and narrow layouts keep Back navigation. Existing pudlMenu.place supplies viewport/RTL placement.

## Retained local checks and corrections

All local browser work used the existing normal tests/run.js runner with one worker, isolated port 8876 and fresh per-allocation output directories. No executor or process-control tooling was added. The retained directories are tests/output/desktop-menu-focused-20261125-implementation-1 through -10. No earlier failure is replaced by a later result.

| Allocation | Actual outcome and limitation |
| --- | --- |
| 1 | Remote replacement passed in Chromium; outside dismissal exposed delayed expansion cleanup. The product correction moves native cleanup to beforetoggle. |
| 2 | The menu fixture lacked its explicit Other identifier and timed out. The fixture now declares data-menubar-id rather than assuming arbitrary labels become IDs. |
| 3 | The reserved-key fixture used Mod+L, which the existing policy permits; it now uses the actually reserved Mod+Q. Existing menu continuity exposed a null submenu after branch retirement. |
| 4 | The intended null guard had not applied because a UTF-8 source read failed under the shell's default text encoding. This allocation retained that same failure. Explicit UTF-8 editing applied the guard afterward. |
| 5 | Both new Chromium suites and existing menubar-update-continuity passed. |
| 6 | Both new suites passed all three source engines (six outcomes), including applet descriptors, narrow Back navigation, RTL and nested ancestor retention. |
| 7 | Immediate remote lifecycle consumption passed Chromium/WebKit; Firefox timed out locating the outside fixture button. No product cause was established for that timeout. |
| 8 | The strengthened fixture-document assertion and Firefox remote suite passed, with slower local wall time retained. This is a new allocation, not a retry that changes allocation 7. |
| 9 | Seven of eight Chromium combo suites passed. Existing combo-validation hit the unchanged 120-second guard because watching every hidden mutation fed validation-error visibility writes back into sync. Query-event code was also edited while this allocation was still active, so this allocation is not an exact-final-source acceptance record. |
| 10 | After filtering unrelated hidden/inert records, remote-options and existing combo-validation passed all three source engines (six outcomes). This includes the final query event, opaque ticket and immediate lifecycle guards. |

Syntax checks and git diff --check pass. npm run test:static passed all 27 Node cases plus token/palette freshness before the final query-event/visibility-filter adjustment; those changes do not touch static-check inputs. The meaningful final rendered evidence is allocation 10 for remote replacement/validation and allocation 6 for the unchanged menubar implementation; Chromium menu continuity is additionally supported by allocation 5. Final hosted source/minified completeness and independent outcome/image review remain pending. Only invented fixtures and normal per-suite images were used.

## Host usage

A host listens for pudl:combo-query on its enhanced select, captures query and ticket from event.detail, and asynchronously obtains its results. It constructs native option elements and calls pudlCombo.replaceOptions(select, ticket, options, {open:true}). A false return means that response lost ownership and must be discarded. No fallback keyboard event or second reopening request should follow. Selected options missing from a remote page are retained to keep the form value stable. HTML strings and foreign-document options are rejected with TypeError on an otherwise live request. Empty/filtered results may leave the panel closed. The browser's later change for an actual user choice retains the existing component semantics.


## Independent lifecycle follow-up

Verification message 11331 found two additional gaps. Combo visibility filtering admitted wrapper/ancestor records but retirement did not include the wrapper itself or ancestors containing only the wrapper. The retirement predicate now includes both, without broadening the filter to validation-error visibility writes. Focused cases toggle wrapper hidden/inert and ancestor hidden/inert within the replacement task, then require rejection without option mutation.

The menubar refresh snapshot could revisit a descendant already removed when an intermediate branch closed. Its null parent then selected full-chain closure. Refresh now skips entries no longer in the live submenu collection or without a parent. The regression opens four actual levels, invalidates the intermediate source, and requires the root and first flyout to remain open with the surviving invoker expanded. This preserves the existing source-invalidation check for closing an entire unavailable branch.

Allocation 11, tests/output/desktop-menu-focused-20261125-implementation-11, passes all nine original suite runs: desktop-menu-maintenance, combo-remote-options and existing combo-validation in Chromium, Firefox and WebKit. The ordinary runner retained original aggregate, child results, logs and invented images. Syntax/whitespace checks pass after the correction. No timeout, retry or wait was added. Revision remains null for this local dirty-worktree evidence; it is focused development proof and does not replace a final hosted source/minified run. The lead-owned context reasons implementation and pudlCommands descriptor preservation now provide the previously identified integration path. Public remote-options documentation should additionally describe pudl:combo-query and the new-ticket prohibition after deliberate dismissal until fresh reader intent.

The following hashes identify the assigned files after allocation 11. They are local file identities, not a claim that concurrent lead-owned files were frozen or that a commit was tested.

| Assigned file | SHA256 |
| --- | --- |
| dist/pudl-combo.js | 1fe74baeee56814da03e64ff6c4116895d7bcbe6534388888cfaed79ccdf338e |
| dist/pudl-menubar.js | eaa093702a71bb68219196a67bb51b81c6d9d05c6609d2508982b50f4396801a |
| tests/combo-remote-options.test.js | 16000ed96266574d1ccdf01dcc2226f9c46455e2884f95cabbe789ac9f881e82 |
| tests/desktop-menu-maintenance.test.js | 9d29803263a0ca15c1f7e0a1c68ee9b0be32145351789377c16ebd0a9ad1dfcb |
| tests/fixtures/desktop-menu-maintenance.html | 0f653a21047255363f2fe99043c78f7cb41f721dfda8c119cfdbaf755fa107c0 |
