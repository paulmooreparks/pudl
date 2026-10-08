# Shared Side Docks

GK Companion needs several browser windows to share each side of its workbench. Paul approved tabs with attention counts, a required Workspace window first in its dock, and icon rails on narrow screens on 2026-10-08. This control belongs in PUDL. The application supplies window titles, glyphs and status; PUDL owns placement and interaction.

## Opt-In Contract

A window layer with `data-win-dock-tabs` groups its left and right docked windows into tab strips. Existing layers keep their current behavior. Top and bottom docks retain their existing presentation. Side docks on an opted-in layer stay at their side when narrow.

The layer's `data-win-required` lists keys, separated by spaces or commas. Those windows always open, including when an address omits them. Close and replacement commands cannot remove them, and their tabs precede other tabs in the listed order. Required windows can move between docks or float. Hosts must provide their markup through the normal window source.

Each side has a selected window and a mode of `auto`, `open` or `rail`. In `auto`, a layer at or below `data-win-dock-rail-width` pixels, default 960, shows a rail. An explicit choice of `open` pins the dock open across width changes; `rail` keeps it collapsed. `pudlWindows.dockMode(edge, mode)` sets that preference. Only `left` and `right` are accepted.

The window state adds `docks`, indexed by side, with `{ mode, selected }` records. The address stores these as `d.left=auto:workspace` and `d.right=rail:flows`. Invalid modes and selections are ignored. Region navigation preserves these parameters. The existing `p.<key>` placement remains the window's canonical placement.

## Interaction

An open dock shows one mounted window under a full-width PUDL tab strip. Selecting a tab raises its window. Arrow keys move focus, Home and End select the first and last focus stops, and Enter or Space activates the focused tab. Delete requests closing the focused window through the existing cancelable closing event. A required window has no close affordance.

A rail shows each tab's glyph and status, with its full title available to assistive technology and in a tooltip. Activating a rail tab opens that window over the central area. Working outside the window and its rail retracts it. Escape retracts it and restores focus to its rail tab. Opening a menu within the window keeps it open. The rail's pin button switches the dock to `open`; an open dock has a collapse button. Temporary slideouts do not alter the saved mode or placement.

Window elements may provide `data-win-glyph`, identifying a PUDL glyph by its token suffix, `data-win-attention`, a nonnegative integer count, `data-win-running`, a boolean attribute, and `data-win-progress`, a percentage from 0 to 100. PUDL shows those marks in the side tabs, rails and taskbar. Rails include the percentage in the accessible name and tooltip. Status updates do not change focus or remount content.

## Verification

Tests must cover independent sides, required-window closure through every public route, selected-tab persistence, responsive rails, pinning, outside dismissal, keyboard focus, cancellation of dirty-window closure, and live status updates. Existing dock behavior must continue to pass in all three supported browser engines. Companion adopts the control only after a tagged PUDL release.
