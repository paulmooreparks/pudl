# Split docked panes

Status: implemented locally, 24 October 2026, awaiting release. Paul accepted support for additional panes along each dock's long axis and approved implementation on all four edges. The contract and implementation notes below record the resulting decisions. Cross-axis nesting and named layouts remain future proposals.

This proposal follows the cross-project [Architectural Principles](<C:/Users/paul/OneDrive/Documents/Architectural Principles.md>) and extends the [shared dock contract](../SHARED-DOCKS.md).

## Recommended behavior

An edge dock contains one or more panes. Each pane contains a tab group using PUDL's existing tab control, with one selected window visible in that pane. A right dock can therefore show a browser above a terminal, with several other windows available through each pane's tabs. Selecting a tab in the upper pane leaves the lower pane's selection alone. Only one window has keyboard focus, even though several selected windows are visible.

The dock retains one outer size. Its inner edge changes its width or height as today. A divider inside the dock changes the space assigned to adjacent panes without changing the size of the dock or the central workspace.

```text
Right dock, unsplit             Right dock, split
+-----------------------+      +-----------------------+
| Browser | Search      |      | Browser | Search      |
+-----------------------+      +-----------------------+
|                       |      | Browser               |
| Browser               |      |                       |
|                       |      +====== divider ========+
|                       |      | Terminal | Problems   |
|                       |      +-----------------------+
|                       |      | Terminal              |
+-----------------------+      +-----------------------+
```

For left and right docks, the initial split runs across the dock to create upper and lower panes. Top and bottom docks create left and right panes. These arrangements make useful use of the long dimension of a dock. The first version should support additional panes along that same axis, so a reader can create three stacked tools without encountering an arbitrary two-pane limit. Cross-axis nesting is an optional later extension.

All four edges are required in the first release. Each supports independent tab groups, additional splits, internal resizing, merging, equalizing and swapping panes under the same rules. Left and right docks offer Above, Below and Full height; top and bottom docks offer Left of, Right of and Full width. Full width merges the top or bottom dock's panes just as Full height merges a side dock's panes.

## Adding or moving a window

The Dock menu offers a destination edge and then a placement within it. An empty edge accepts the window as its only pane. An occupied edge offers the following destinations, with a small layout diagram beside the words where practical.

| Destination | Result |
|---|---|
| As tab with Browser | The window joins Browser's pane and becomes its selected tab. |
| Above Browser | A new pane appears immediately above Browser's pane. |
| Below Browser | A new pane appears immediately below Browser's pane. |
| Full height | An unsplit side dock accepts the window as another tab. |
| Full height, merge panes | A split side dock becomes one tab group, with the moved window selected. |

Top and bottom docks use Left of, Right of and Full width. Destination names use the selected window's title and include a position when titles repeat. Commands refer to stable pane identifiers internally, so changing a title does not change their meaning.

Splitting an occupied pane divides that pane's available space equally after subtracting the divider. Other panes keep their space. Moving a tab out of its own group can create a neighboring pane if another tab remains in the original group. A move that would create an empty sibling is unavailable. A window moved between panes keeps its mounted content, unsaved state, scroll position and floating restore geometry.

The existing two-argument `dock(key, edge)` remains useful. It joins the most recently active pane on that edge, or its first pane if none was active. Calling it for a window already on that edge retains its pane. It never merges an existing split implicitly.

### The full-height decision

Full height means one tab group occupying the dock. When a split exists, the explicit merge command combines all its tabs in visual pane order, preserves the relative order within each pane, and selects the incoming window. Required windows retain their prescribed leading order. No window closes, but the pane boundaries disappear.

The alternative is to allow a full-height window to cover a saved split layout, with a separate way to return to that layout. That needs another level of selection, such as a Split view tab alongside full-height window tabs. It is useful for switching between tool arrangements, but adds chrome and makes selecting a window different from selecting a layout. It remains a separate possible feature. The accepted Full height and Full width commands merge the panes.

## Pointer and keyboard interaction

A window title bar or an individual dock tab can be dragged to a pane. The center target means Add as tab; the two targets along the dock's long axis mean Split before and Split after. A preview shows the resulting rectangle and a short label before release. Targets inside the dock take precedence over the central workspace's snap targets. A thin outer workspace target continues to dock a floating window to an edge.

A tab drag begins as a reorder while it remains within its strip. Leaving the strip beyond the normal drag threshold reveals placement targets. Escape and pointer cancellation restore the original arrangement and focus. Dropping outside a valid target cancels the move; Float remains an explicit menu command. This avoids accidental undocking when the reader misses a narrow target.

Every operation is available through the window or tab menu, including on touch devices. Dragging is a convenience. Menus offer only destinations allowed by the window's placement policy and the available space. A menu opened before a resize rechecks those conditions when invoked.

Each divider uses PUDL's existing splitter appearance, grip, focus ring and touch target treatment. Arrow keys resize along its movement axis. Shift uses the existing splitter's larger step, Home and End reach the permitted limits, and Enter or double-click restores equal shares for the two branches it separates. Escape during a drag restores the previous ratio. A completed gesture produces one history entry; pointer movement does not fill browser history.

Tab selection, tab reordering and window-menu keys retain their existing meanings within each pane. Existing Shift+arrow commands on dock tabs continue to resize the outer dock. The internal divider has its own focus stop, name and percentage value. Moving a window follows that window's focus; closing a selected tab chooses a surviving tab in its pane before considering another pane.

## Resizing and limited room

Pane minima include the tab strip and the minimum content size. Each pane uses the largest minimum among its tabs, so changing selection cannot move its divider. Splits are unavailable when both resulting panes cannot fit. A disabled menu command explains that more room is needed; an invalid drop target is not offered.

Ratios are stored independently of the current pixel sizes. Resizing the workspace clamps the rendered ratio to the available bounds without rewriting the saved preference. Widening or increasing height restores that preference where possible.

When existing panes cannot fit after a workspace resize, the affected split is presented temporarily as one tab group. Its windows appear in visual pane order, with the active window selected. The canonical pane membership and ratios remain intact. Selecting another window updates its original pane's selection; it does not merge the saved panes. Structural split commands are unavailable while this temporary presentation is necessary. The layout restores automatically when room returns. This also handles an explicitly pinned dock whose panes no longer fit.

The existing whole-dock rail and strip modes continue to apply. A collapsed side dock shows one rail containing its windows in pane order, with modest separators between pane groups. Top and bottom collapsed docks keep their text tabs. Selecting a collapsed tab peeks that window alone; pinning the dock restores its saved panes. Peeks remain temporary and do not alter the address. Collapse and Pin remain one control per edge, anchored at their existing outer corner.

## Closing, minimizing and required windows

Closing, floating or moving the last window out of a pane removes the empty pane and gives its space to its sibling. A split with one remaining branch becomes that branch. Closing still goes through the existing close-refusal mechanism; a refusal leaves the pane intact.

Minimization keeps a window's pane membership. A pane with another non-minimized window selects that window. A pane with no non-minimized windows retains a strip so its windows remain reachable even when the taskbar omits docked windows. Its minimum along a side dock falls to the 40px strip height; along a top or bottom dock it falls to 80px for a usable tab target. Its preferred ratio remains saved. If every window on an edge is minimized, the existing collapsed-dock behavior applies. Minimize All and Restore All preserve the saved tree and dock mode.

Required windows cannot close but may move under the existing rules. Their fixed leading tab order applies within each pane. A dock-only window remains limited to left and right docks; splitting does not grant it permission to float, maximize or move to a top or bottom dock. Per-window narrow placement restrictions continue to take precedence, with canonical dock membership retained for when the restriction lifts.

## State and compatibility

Before this change, shared docks stored one selected window and one order per edge in `docks`. The URL used `d.<edge>` for dock preferences and `p.<key>` for window placement. Rendering, visibility and focus assumed one selected docked window per edge. Split support changes those assumptions together.

The proposed state adds a tree to each split dock. A group leaf owns ordered window keys and a selected key. A split node owns two branches, an axis and a preferred ratio. Stable group identifiers allow movement commands to target a pane without depending on its current title or screen position. An edge also records its last active group. The first release creates splits only along the edge's long axis, but the representation can accommodate cross-axis splits without a format replacement.

```javascript
{
  right: {
    mode: 'open',
    size: 0.28,
    activeGroup: 'g2',
    tree: {
      type: 'split', id: 'g3', axis: 'y', ratio: 0.6,
      first: { type: 'group', id: 'g1', order: ['browser', 'search'], selected: 'browser' },
      second: { type: 'group', id: 'g2', order: ['terminal', 'problems'], selected: 'terminal' }
    }
  }
}
```

For compatibility, `docks[edge].selected` continues to identify the edge's last active window, and `order` exposes the flattened pane order. These are derived from the tree when one exists. Window placement remains the source of truth for edge membership and floating restore geometry. Each window belongs to at most one group.

Use an additive, versioned `ds.<edge>` URL parameter for split topology, group selections and ratios. Retain the existing `d.<edge>` and `p.<key>` syntax. A candidate encoding is URI-encoded compact JSON with an explicit version, documented for server implementers. The exact schema and size bounds must be settled before coding the serializer. Omit the new parameter for an ordinary single-group dock. Older clients can use the existing placements to show a flat dock; they cannot preserve split state when rewriting an address.

Normalization removes unknown or misplaced members, rejects duplicate group identifiers and duplicate window membership, collapses empty branches, bounds ratios, and applies documented depth and node limits. Missing group members join the edge's active group deterministically. Invalid or unsupported split data falls back to the ordinary dock without losing open windows. Restore must tolerate asynchronously fetched windows and rekeying, including an obsolete fetch finishing after a newer navigation.

Proposed calls extend the window API with an optional destination object on `dock(key, edge, destination)`, where the destination names a group and `tab`, `before` or `after`. Separate calls merge an edge and set an internal split ratio. Existing calls retain their return behavior. `state()` and `pudl:windows-change` expose detached canonical trees. The implementation must provide a documented inspection method for temporary single-group presentation, rather than asking consumers to infer it from generated DOM.

Split docks should be opt-in on shared-dock layers through `data-win-dock-splits`. A layer must already enable shared tabs on the relevant edge. Hosts that omit the new attribute retain their existing behavior. Server rendering gets a documented pane/group markup contract with real selection and placement links. The enhancement adopts that markup and preserves the window elements through rearrangement.

## Useful additions

I recommend including Equalize panes and Merge panes in the first release. Equalize panes assigns equal visible space along the whole edge, accounting for minimum sizes. Merge panes reverses the structural split without closing anything. Both are explicit dock commands.

A Swap panes command would also be inexpensive conceptually and useful when a reader wants Output above Problems without moving their tabs individually. It swaps whole groups, retaining their selections and relative tab order.

An Enlarge pane toggle would be a useful follow-up. It would temporarily show one pane across the dock while preserving its siblings and provide a visible Restore split command. It should have a URL representation because the reader intentionally chose that view. It would not solve coexistence between independently docked full-height windows and a split layout, which is the separate decision above.

Cross-axis nesting and named workspace layouts should follow demonstrated need. The tree representation supports nesting, but its drop targets, minimum-size behavior and navigation would need a further design pass. Named layouts also need host decisions about window identity and unavailable content.

## Implementation and acceptance boundary

Implementation should begin with canonical state transitions and URL round trips, then pane geometry and rendering, then menus and drag targets. The shared-dock renderer can reuse tab controls and splitter conventions, but the window manager must own their state so that two unrelated controllers cannot write competing layouts. The snapped-window grid remains independent of dock splits.

The following checks are required before release.

- Each edge supports two or more panes with independent tab selections, orders and status marks.
- The right-dock example works through both menus and dragging, including adding a tab above, below and to an existing pane.
- Outer resizing and internal resizing affect only their intended boundaries, respect minima and cancel cleanly.
- Merge preserves every window, and closing, moving, minimizing and restoring windows normalize the tree correctly.
- Rails, peeks, forced narrow placement and temporary single-group presentation restore the saved layout without remounting content.
- Reload, shared URLs, Back and Forward restore pane membership, selection, ratios and focus appropriately, including asynchronous restore races.
- Old addresses and opted-out layers retain existing behavior, and malformed split addresses cannot duplicate or lose windows.
- Required windows, dock-only windows, close refusal, child windows and rekeying retain their existing protections.
- Keyboard-only operation, touch placement menus, RTL order, both themes, forced colors and enlarged text remain usable.
- Chromium, Firefox and WebKit checks cover lifecycle changes and narrow layouts, including overflow and focus when a pane disappears.

## Implementation decisions

The first implementation keeps the binary tree and supports one split axis per edge. Split nodes have stable IDs as well as leaf groups, so a divider can keep its identity through redraws. Each node has `type`, `id`, `axis`, `ratio`, `first` and `second`; each leaf has `type`, `id`, `order` and `selected`. `activeGroup` lives beside the tree in the dock record.

`ds.<edge>` contains URI-encoded JSON `{ v: 1, activeGroup, tree }`. Decoded input is limited to 32,768 characters, 255 nodes, depth 32, 80 characters per node ID and 256 members per group. IDs and window keys follow the existing ASCII window-key grammar. Duplicate node IDs or duplicate member keys invalidate the whole tree. Unknown or incorrectly placed windows are pruned without closing them, and unassigned members join the active group. Unsupported versions or axes fall back to an ordinary dock. These are parser limits; usable pane counts are ordinarily limited much earlier by their minimum sizes. Interactive splitting observes the same depth and node limits so a layout always reloads.

`dock(key, edge, { group, position })` accepts `tab`, `before` or `after`. The initial unsplit group's ID is `main`. `dockArrange(edge, action, group)` accepts `merge`, `equalize` or `swap`; swap exchanges that group's contents with the next group's, wrapping at the end. `dockRatio(edge, splitId, ratio)` sets a divider's ratio. `dockPresentation(edge)` returns `single`, `split`, `collapsed` or null for an unshared edge. These APIs are documented in [SHARED-DOCKS.md](../SHARED-DOCKS.md).

An internal divider has a 12px track, enlarged to 20px for a coarse primary pointer. Arrow keys move by 1%, Shift by 10%, Home and End reach the limits, and Enter or double-click resets the two shares. Enter follows PUDL's existing reset convention rather than the optional collapse behavior in the [WAI window splitter pattern](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/). The focusable separator names and controls its primary branch, and reports its current percentage and limits.

Placement targets use the outer quarter of a pane's long dimension for splitting and its middle half for tabbing. If a split cannot fit, the preview offers tabbing instead. A 16px band at an empty outer edge creates a new dock. Tab reordering remains active inside its strip; leaving the strip by more than 8px enables placement. Required tabs may move between allowed panes but retain their fixed order within a pane.

The first release flattens the whole edge temporarily when its split tree cannot fit. It preserves the canonical tree and does not attempt independent subtree flattening. This gives one consistent tab strip and one collapse control during constrained presentation.

Touch retains native scrolling within tab strips and uses tab menus for pane placement. Mouse and pen support tab dragging. This keeps overflowed tabs reachable on a narrow pinned dock without introducing a competing touch-drag gesture.

Paul approved publication on 24 October 2026 after trying the local sample. The release is PUDL 0.83.0 with specification 0.40.0. Consumer upgrades and native Desktop deployment remain separate work.

## Verification, 24 October 2026

The Linux full suite passed all 267 engine/suite runs in Chromium, Firefox and WebKit. Its dependency and output directories used isolated Docker volumes, with the checkout mounted read-only. The Windows full run passed 264 of 267; its Chromium font-download and page-navigation failures and Firefox date-wheel failure passed when rerun in isolation. An earlier Windows run passed 265 of 267, with both failures also passing on rerun. The date, font and general menu tests were not edited for this feature.

The focused split-dock suite passes in all three engines against minified assets on both Windows and Linux. It covers all four edges, three panes, independent tab selection, equalizing and swapping, mounted-content preservation, URL restoration, region links, keyboard resizing, pointer placement and cancellation, history, minimization, close refusal, malformed addresses, superseded asynchronous restores, required and dock-only windows, rekeying, static server rendering and strip adoption. Chromium additionally checks touch placement menus and the 20px divider track.

The public sample was inspected in light and dark themes, including RTL menu placement, and checked for page overflow at 390px. Minified copies pass `build/minify.js --check`. Source and specification diffs pass whitespace checks. These checks cover web behavior; they do not constitute a consumer upgrade or a native Desktop deployment.
