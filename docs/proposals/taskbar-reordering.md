# Taskbar item reordering

This document records the design rationale for letting readers drag taskbar items into a new order, with accessible alternatives and context-menu commands. The implementation follows it and adds an always-visible Arrange taskbar button so touch users need neither overflow nor long press. The implemented contract is in [TASKBAR-ORDER.md](../TASKBAR-ORDER.md).

## Behavior before implementation

`renderDocks()` in `dist/pudl-windows.js` takes taskbar entries from `state.open`, excludes child windows, and optionally excludes docked windows through `data-win-dock-omit-docked`. It reconciles keyed links rather than rebuilding every entry. `fitBar()` hides entries from the end when space runs out while retaining the front window's button. `openMore()` lists the hidden entries in their original order and activates a chosen window.

Shared dock strips and rails already have a different order model. They support pointer reordering and Alt+Shift with the arrows along the strip, retain required windows at the start, and store pane order in dock state. That implementation provides useful gesture machinery, but taskbar movement must not change a dock pane's order or placement. Existing taskbar context menus provide window commands; they do not provide taskbar ordering commands.

## Recommended scope

The first implementation should reorder window entries within PUDL's taskbar window list. It should leave application buttons, tray entries, Minimize All and other bar controls in their host-defined places. It should not introduce pinning, app grouping, inter-workspace moves or dragging a button into a dock.

Required windows should remain movable in the taskbar. Their required status controls whether they can close, not their taskbar position. Shared docks retain their existing required-tab ordering rule. A future locked-position feature would need its own contract rather than overloading `data-win-required`.

The implementation uses a layer opt-in, `data-win-taskbar-reorder`, so consumers with application-owned taskbar gestures can adopt the feature deliberately. The shared order is reflected in all PUDL window-list docks; the taskbar editing UI operates on `.win-bar` window entries. Lists that omit docked windows project the shared order without deleting those windows' stored positions.

## Pointer interaction

A primary mouse or pen drag should start after 6 CSS pixels of movement along the bar, with an insertion marker at the proposed destination. A normal click should retain its current activate/minimize behavior. A completed drag must suppress the trailing click and must not activate, minimize, raise, resize or undock the moved window.

The marker should identify a destination before or after a visible target, using the full canonical order to resolve the insertion. It should have a visible shape and a text description; colour alone is insufficient. Pointer release should commit one reorder. Escape, pointer cancellation, lost capture or window blur should discard the preview and leave URL/history unchanged. Dropping outside the valid strip should cancel.

The implementation should reuse the existing dock gesture approach where practical, use Pointer Events and pointer capture, and make no browser-specific guesses. Pointer cancellation and touch behavior follow the documented [Pointer Events contract](https://www.w3.org/TR/pointerevents3/). Bar fitting should stay stable during a drag. A resize, direction change or change in participating windows should cancel and refit rather than apply a stale destination. Pointer movement should update only the taskbar preview through animation-frame scheduling, without repeatedly applying all window layouts or writing history.

Touch should retain its existing tap and context-menu behavior in the first implementation and use the non-drag arrangement controls below. This follows PUDL's existing split-dock distinction between mouse/pen dragging and touch menu operations. Long press should not acquire a second meaning as the start of a reorder gesture. If touch dragging is added later, a dedicated handle in the arrangement view can claim the gesture without disabling scrolling or zooming across the taskbar.

## Context menus and keyboard

Each taskbar window entry should gain a **Taskbar order** submenu containing these commands:

- Move earlier
- Move later
- Move to beginning
- Move to end
- Arrange taskbar...

Unavailable moves should be disabled at the boundaries. These commands should operate on the clicked window without activating it. They should be added only in taskbar context, so shared dock tab menus do not acquire ambiguous ordering commands. The bar's own context menu and the More menu should also offer Arrange taskbar. Existing right-click, Context Menu key and Shift+F10 routes should reach the same commands. A visible action in the More menu must keep arrangement available on touch without requiring long press.

Alt+Shift+Left/Right while a taskbar entry has focus should move it one displayed position along the bar, matching the existing dock reorder convention. Physical arrow direction should be mirrored against the canonical reading order in RTL. The shortcut should be advertised through `aria-keyshortcuts` and contextual help, and should not be captured outside taskbar entries. Ordinary focus and activation behavior should remain intact. The mouse/touch menu commands remain available when an assistive technology intercepts the shortcut.

Direct command moves should retain focus on the moved entry without changing the active window. If overflow prevents that entry from remaining visible, focus should move to More with a spoken confirmation identifying the moved window and its new position. A move should announce its result once through a polite status region, for example, "Notes moved to position 2 of 8." Pointer-move previews should not generate a stream of announcements.

## Arrangement and overflow

Arrange taskbar should open an existing PUDL nonmodal popover with a selectable ordered list of all entries represented by that taskbar, including those under More. Selecting a row should not activate its window. Separate Move earlier, Move later, Move to beginning and Move to end controls should operate on the selected entry. Apply order should commit the proposed order once; Cancel or Escape should discard it. The preview can remain within this list until application, avoiding temporary changes to the actual taskbar.

The list should use a documented selectable-list control with stable window keys, remain scrollable within the viewport, retain focus/selection on the same window after a move, and reveal that row. A native sized select with external action buttons is a suitable first prototype. A custom listbox would require its full keyboard and assistive-technology behavior; adding ARIA roles to arbitrary divs is insufficient. Live window additions/removals should reconcile the draft list by key, append new members and remove closed ones. Applying a draft must never reopen a window that closed while the popover was open.

The current non-scrolling taskbar overflow policy should remain. Dragging visible entries should not open More automatically or require a narrow target inside its menu. The arrangement view supplies access to all hidden items. When a destination is adjacent to hidden entries, a before/after anchor in the canonical sequence must determine the result; visible DOM indices alone are insufficient.

## Accessibility basis

[WCAG 2.2 SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements) requires a single-pointer alternative that does not require dragging. Keyboard support is a separate requirement and does not by itself satisfy that criterion. Clickable move commands and the arrangement controls provide the required alternative.

The [WAI-ARIA rearrangeable-list example](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/examples/listbox-rearrangeable/) demonstrates scoped shortcuts, keeping focus on the moved item and announcing completed actions. Those principles fit this feature; its listbox role should not be applied to the taskbar itself. Taskbar entries should retain their current navigation-link semantics. [WAI-ARIA 1.2](https://www.w3.org/TR/wai-aria-1.2/#aria-grabbed) deprecates `aria-grabbed` and `aria-dropeffect`; the implementation should not use them.

Automated tests and the APG example cannot establish screen-reader interoperability. Manual testing with representative Windows and macOS screen readers, browser zoom and touch operation is required before making that claim.

## State and public API

Taskbar ordering should have its own canonical array, proposed as `state.taskbarOrder`. It must not reorder `state.open`, change stacking or MRU state, or change dock pane order. It should contain open root-window keys, including roots temporarily omitted from a particular bar. New roots append, closed roots are pruned, and replacement of a window preserves the replaced root's slot where applicable. Child windows continue to belong to their root entry.

The proposed URL field is `tb.order`, reserved explicitly in the next contract and preserved by `pudl-regions.js`. An absent field should retain today's open-list order. A field equal to that default should be omitted. Parsing should discard duplicates and unknown/closed keys and append missing open roots. Reload, sharing, Back and Forward must restore the same order. Custom ordering should not require localStorage or host-specific persistence; applications that restore the workspace URL already restore it.

Each completed drag, direct move command or Apply order action should push one history entry. A no-op or cancelled action should write none. Repeated shortcut invocations are individual moves; first/last commands provide a larger jump without requiring many steps.

One internal reorder operation should serve every input route. A proposed public shape is `pudlWindows.reorderTaskbar(key, { before: otherKey })`, or `{ after: otherKey }`, with `{ edge: 'start' }` and `{ edge: 'end' }` for canonical endpoints. It should report whether it changed the order. The API should validate current root membership and reject contradictory destinations. Context actions for a filtered taskbar should derive before/after anchors from its full represented sequence, including overflow items, so omitted docked entries do not produce invisible intermediate moves.

`state()` and `pudl:windows-change` should expose detached order state through the existing contract. A separate reorder event is unnecessary unless integration work establishes a concrete need. DOM order should be rendered from state while preserving keyed taskbar nodes, content mounts and focused links whenever possible.

## Verification before implementation is accepted

- Mouse and pen dragging, movement threshold, marker placement, trailing-click suppression and cancellation.
- Context-menu, keyboard and click/tap-only moves with identical resulting state.
- Focus and spoken feedback without window activation, including a moved entry that enters overflow.
- Wide and narrow bars, the active item retained out of sequence, all other items under More, RTL and bars at either workspace edge.
- Root/child relationships, required windows, omitted docked roots, several taskbar views and duplicate window titles.
- New, closed and replaced windows during a drag or arrangement draft, with no stale-key resurrection.
- URL normalization, old URLs, region navigation, reload, sharing and Back/Forward.
- Preservation of glyphs, marks, mounted content and current MRU/dock ordering through redraws.
- Both themes, forced colours, reduced motion, zoom, touch controls and manual screen-reader checks.

The implementation includes a focused sample and browser regressions for overflow, keyboard and pointer moves, draft controls, lifecycle changes and URL restoration. Manual screen-reader and native-host verification remains outstanding.
