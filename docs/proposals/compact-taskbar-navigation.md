# Compact taskbar navigation

## Status

This proposal responds to narrow-width browsing feedback after PUDL 0.104.0. Implementation was authorized on 7 November 2026. Consumer installation, publication and production promotion remain separate. The final responsive candidate was accepted on isolated beta, and Paul authorized release preparation on 8 November 2026. The [0.105.0 verification record](../RELEASE-0.105.0.md) records the final disposition.

## Persistent navigation

A host with a launcher offers a taskbar opener at the leading edge in compact mode. On desktop it is hidden when a directly available site-title launcher exists, unless the host sets `taskbarAlways: true`. The later [responsive policy](responsive-launcher.md) supersedes the original always-visible proposal. It uses the existing application-grid glyph and opens the same catalog as the title control. Its position stays stable across widths, and it remains outside the destination registry. Hosts can retain the title-menu route as an alternate entry point.

Touch activation opens the catalog for browsing and moves focus to a suitable non-input catalog target. It does not focus the filter or dismiss an already-visible keyboard through a blur workaround. Tapping the filter requests text entry. Keyboard invocation can focus the filter immediately. Opening intent must come from the invocation rather than viewport width or a permanent touch-device classification. The launcher retains query, category and scroll state when returning from a destination.

## Folding priorities

The proposed compact layout reserves the launcher opener, a useful representation of the active window and a trailing Windows control. It removes labels and groups entries before reducing touch targets. No width threshold changes row height.

1. Fold the trailing window-management controls into the Windows popup and remove the Pinned heading text.
2. Fold inactive ordinary window labels to glyphs.
3. Fold pinned entry labels to glyphs, retaining readable space for the active window where practical.
4. Keep ordinary entries on the taskbar. Allow horizontal scrolling when their glyph buttons no longer fit.
5. Collapse the pinned section into one raised pin-glyph button when the remaining pin glyphs would crowd out the active window. Its popup lists every pin with its full label.
6. Truncate the active label as the final reduction, preserving its identity glyph and accessible name.

Pinning retains destination membership and direct placement for as long as room permits. It does not reserve unlimited taskbar width. Within-section saved order never changes because of folding. A running pinned window remains represented once in the taskbar. An active pinned entry stays in its original pinned position beside the pin-popup opener while inactive pins aggregate. At extreme widths its label can fold, but it is never copied into the ordinary section. The pin popup may list that destination as an alternate navigation surface.

The narrow strip retains Launcher, Pins, ordinary taskbar buttons and Windows. Empty groups disappear. A pins popup can show a running-state mark and preserve normal singleton or stack activation behavior. Opening a menu pin from this popup must use the visible popup row as its menu anchor, with defined focus return. The pin popup is a navigation surface, not the deferred pin editor.

## Window management

The trailing Windows control uses the existing window glyph and the label Windows when space permits. The popup contains only Arrange taskbar, the currently useful Minimize all or Restore all action, and a separately grouped Close all windows action at the end. It uses current shared commands and availability. Window buttons remain on the taskbar and never appear in this actions popup.

The current Arrange toggle contract remains intact wherever its dedicated opener is shown. Choosing Arrange from the Windows popup retains the documented command behavior of opening the arrangement surface.

## Sizing and implementation boundary

Coarse-pointer sizing remains independent of viewport width. Space is recovered through labels and grouping rather than narrow touch targets. The [WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) distinguishes its 24 CSS pixel minimum from the larger enhanced target, and does not require large touch dimensions for every desktop pointer.

Shared PUDL code should own section priority, aggregation, popup lifecycle and input-sensitive focus. Hosts should provide launcher placement, destination metadata and current commands through documented contracts. Any implementation needs explicit coverage of an active pinned window while its section collapses, no duplicate logical entries, keyboard focus and return, state preservation across widths, popup anchoring, and touch browsing without forced filter focus.

## Implementation and verification

The shared implementation is complete in an isolated worktree. The sample authors an ordinary launcher opener and managed dock, and delegates taskbar folding, aggregation and popup interaction to the shared controllers. The pin editor remains deferred. Consumer integration remains pending.

The minified affected-suite matrix passed 75 of 75 runs across Chromium, Firefox and WebKit. After the final source-context and focus refinements, the focused readable and minified checks each passed 15 of 15 runs across those engines. Coverage includes pointer and keyboard menu toggles, site-menu anchoring, Pin and Unpin through navigation-row context menus, unavailable-reference removal, native modified links, pictures and broken-image fallback, one active pinned entry, width transitions, stable heights, empty-window focus recovery, unrelated status preservation, normal context menus and menu references. Touch-emulated launcher checks passed in Chromium and WebKit; Firefox supplies narrow-pointer coverage.

The larger readable matrix passed 72 of 75 runs. Its three failures were in the newly added unavailable-reference fixture: it first omitted the required destination configuration and later searched for an internal ID instead of the documented unavailable label. The fixture was corrected, and its full popup scenarios passed in both final focused matrices. Earlier exploratory runs exposed a real natural-width cache defect and a context-row suppression gap. Those were corrected before the final focused checks. Existing stack hysteresis, ordering, provider, lifecycle, menu and launcher regressions passed in the affected matrix. Original failure logs remain retained.

The evidence directories are `tests/output/compact-navigation-final-source`, `tests/output/compact-navigation-final-minified`, `tests/output/compact-navigation-menu-followup-source` and `tests/output/compact-navigation-menu-followup-minified`. Earlier exploratory evidence remains under the other `compact-navigation-*` directories. Final wide, narrow, light, dark and pin-popup screenshots were inspected. Syntax, minifier freshness, added-line provenance and whitespace checks pass.

The local sample is available at `http://127.0.0.1:8806/samples/compact-taskbar.html`. Candidate handoff uses a frozen archive and per-file manifest under `tests/output/compact-navigation-candidate-*`, rather than mutable worktree files. The candidate retains the 0.104.0 stylesheet version comment and must be identified by its source fingerprint and host build ID.

No commit or publication is included. Consumer deployment and desktop installation remain separately authorized actions. Manual assistive-technology verification and physical-device keyboard or touch behavior remain untested. A browser focus trace proves that touch opening does not focus the filter, but does not claim an observation of a physical phone keyboard.
## Beta follow-up

Real-host beta testing exposed two shared defects. A retained title created before its catalog became a popup lacked native targeting when another button was the primary opener. The menubar now observes catalog presentation changes and synchronizes both retained launcher controls. It also refreshes the title before native activation. The controller's presentation state supplies the expanded state during popup transitions.

A combined modified-link, new-tab return and Escape sequence exposed a second defect. Native dismissal hid the context popup while its logical menu remained registered. The next opener activation treated that stale registration as an open menu and returned after closing it. The menu now retires its logical panels when their native popup closes. The new regression reproduces the original failure, exercises the complete return sequence and checks title activation, initial embedded markup, pane/popup transitions, keyboard activation and the collapsed menubar route. Touch checks also cover the alternate title opener.

The first replacement matrix retained an expanded-state failure caught by the existing host study. That correction passed the subsequent host checks. Final replacement evidence and counts are recorded in the replacement candidate handoff; earlier failed runs remain retained. The upstream replacement requires a fresh real-host beta check before acceptance. Production remains on 0.104.0.

The replacement final readable checks passed 9 of 9 suite runs, and the final minified affected matrix passed 36 of 36 runs across Chromium, Firefox and WebKit. The first readable matrix retained 35 passes and one expanded-state regression that was corrected before the final checks. Evidence is retained under `tests/output/compact-replacement-source`, `tests/output/compact-replacement-final-source` and `tests/output/compact-replacement-minified`. The narrow light rendering was inspected; syntax, minifier freshness and whitespace checks passed.
## Launcher resize delivery correction

The next real-host check accepted both launcher routes and the native-link return sequence but retained a WebKit resize-delivery error. Runtime inspection showed that the launcher observer changed the popup top from 240 to 214 pixels while handling its size notification. That raised the CSS maximum height from 598 to 624 pixels, allowing the popup to grow from 598 to 620 pixels and resizing its nested splitter during the same delivery cycle. The splitter callback was the final trace entry, but its observer did not perform the responsible placement mutation.

The launcher now coalesces resize-driven measurement, placement and change notification into an animation frame. The callback checks the current presentation again before doing work, and destruction cancels the pending frame. The correction keeps the nested splitter notification outside the parent observer's delivery cycle. It does not suppress browser errors or change the splitter contract.

A local regression recreates a stale desktop top constraint after switching to a 320-pixel viewport, repeats the resize, asserts that geometry settles within the viewport and fails on browser errors. The real-site route test was also run against a local replacement script through browser request substitution; the shared beta server was unchanged. The replacement passed that reproduction, including the repeated pane/popup transitions and touch title route. Original failures and diagnostic traces remain retained under `tests/output/resize-host-*`.

The resize correction passed 18 readable and 18 minified focused suite runs across Chromium, Firefox and WebKit. The new constrained-height regression fails against the preceding frozen launcher script. The real-host WebKit route sequence also passes with the replacement launcher script supplied through browser request substitution. Fresh beta deployment acceptance remains pending. Evidence is retained under `tests/output/launcher-resize-*` and `tests/output/resize-host-*`.

## Actions-only popup correction

The bottom-right folded menu contains only Arrange taskbar, Minimize all or Restore all, and Close all windows. Window buttons stay on the taskbar. Ordinary entries fold to glyphs and, when necessary, remain in a horizontally scrollable dock. Pin aggregation remains in its separate pin popup. This decision supersedes the earlier window-list and ordinary-overflow behavior described in the historical verification notes.

The actions-only correction passed 18 readable and 18 minified focused runs across Chromium, Firefox and WebKit, including compact geometry, pin popup behavior, taskbar folding, stack controls and bulk actions. The initial exploratory matrix retained two outdated Chromium test failures; the final matrices verify the revised interaction. Evidence is retained under `tests/output/actions-only-*`. Beta integration of the frozen replacement remains pending.
