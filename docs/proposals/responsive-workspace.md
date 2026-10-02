# Responsive workspace proposal review

This is the PUDL review of YAVCHN's `PUDL-PROPOSAL.md`, dated 3 October 2026, against PUDL 0.40.0 at `b998b33`. Paul approved implementation of the following contracts for 0.41.0.

## Implementation contracts

- A window opts in with `data-win-narrow="maximized"`. The layer sets `data-win-narrow-width="640"` in CSS pixels, with 640 as the default. The policy applies at or below that width, measured before dock subtraction. Content-sized windows ignore the option and report a console warning.
- `pudlWindows.effectivePlacement(key)` returns a detached derived placement, or null for an unknown window. `state()` continues to return canonical URL state. Restricted placement commands are no-ops. PUDL owns the rendered `data-win-restricted` and `data-win-mode` attributes.
- `pudl:windows-policy` bubbles from the layer when its responsive policy changes. A transition cancels placement gestures and closes placement menus without writing the URL.
- `data-win-chrome="compact"` hides secondary chrome and ensures that a window-menu button exists. `--win-button-size` and `--win-glyph-size` independently control targets and glyphs, including docked chrome.
- `--split-target-size` sets an actual track, defaulting to 6px, and `--split-rule-size` sets its visible line, defaulting to 2px. Splitters no longer overlap adjacent panes. If both minima cannot fit, each minimum becomes half the available pane space. Percentage maximums retain their existing container-relative meaning and are capped to leave the second pane's minimum.
- `data-split-pane="first"` or `"second"` on `.split` selects mounted single-pane presentation. Removing it restores the split. Hidden presentation suspends clamping and pending notifications, and cancels an active drag. Pointer cancellation restores the pre-drag value. Hosts own the URL representation and focus destination when hiding a focused pane.
- `--menubar-group-bg`, `--menubar-group-border`, `--menubar-group-border-width`, and `--menubar-group-shadow` customize menu groups. Defaults preserve their existing appearance. Border widths between 0px and 2px reduce the existing padding by the same amount.
- Menu overflow uses the visible viewport and safe-area insets. Independent cue gutters reserve space outside the scrollable commands. Visual viewport resize and scroll events update placement.

## Recommended scope

| Request | Recommendation |
|---|---|
| Restricted placement in narrow workspaces | Implement first, with per-window opt-in and one shared effective-capability calculation. |
| Discoverable menu overflow | Implement alongside placement policy, using available visible height and persistent directional cues. |
| Splitter targets and single-pane presentation | Add a configurable target that occupies layout space; define and test a mounted single-pane presentation contract. |
| Compact chrome | Add an explicit option and separate target/glyph sizing controls; preserve title, focus, active state, and command access. |
| Workspace-level taskbar | Document and test the existing arrangement. Keep independent master-detail pane navigation as a separate design item. |
| Menu-bar elevation | Add component-level theme hooks with existing defaults. Keep YAVCHN's particular palette choices local. |

## URL placement and narrow presentation

The URL should continue to contain the requested placement, dock assignment, visibility, and activation state. Restricted presentation is derived from that state, the host's declared policy, and the measured workspace width. Resizing does not rewrite placement parameters or create history entries. Widening reveals the placement already in the URL. No separate saved-wide-placement cache is required.

The breakpoint must measure the workspace container before subtracting dock strips. Measuring a dock-reduced inner width could make the policy activate and deactivate as it suspends docks. Policy participation is per window, so readers can opt in while tools retain content-sized behavior. Content-sized windows must keep their declared sizing rules; a conflicting opt-in should be diagnosed rather than silently stretching the content. Unrestricted docks continue reserving their normal space. Restricted windows fill the remaining workspace, and their suspended dock assignments reserve no strip until the policy ends.

Keep `state()` as the URL-state view. Any public effective-placement inspection must be documented as derived data. Capability checks, rendering, chrome, gestures, keyboard operations, and command callbacks must consume the same derived result. A script request to change placement while restricted must have a documented refusal result or no-op behavior, and must not modify a hidden future placement. Direct navigation to a different URL still changes the requested state.

Minimization remains a real state change. Restoring a minimized reader makes it visible in the constrained presentation. Restore to floating remains visible but disabled and must have a distinct label from restoring visibility. Movement, resizing, snapping, docking, undocking, and placement reset cannot execute while restricted. Open-as-page, sharing, content commands, and close remain available.

A policy transition should cancel an active placement gesture and invalidate an open placement menu before re-rendering. Reuse the mounted window and applet elements throughout the transition. Do not close and reopen windows to maximize them. The implementation must preserve scroll positions, activation, minimized state, and saved docking across both directions of the breakpoint.

## Menu overflow

The current `.menu-panel` has a 32rem CSS cap. `pudl-menu.js` clears the inline maximum and measures the CSS-capped rectangle before calculating a new maximum, so the cap affects the supposedly natural height. The placement code also enforces minimum heights of 120 or 160 pixels, which can exceed very small available spaces. Both calculations need review.

Use the visible viewport's dimensions and offsets for popup placement, with layout-viewport fallback and safe-area handling. The documented [VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport) supplies resize and scroll events and distinguishes keyboard or zoom effects from the layout viewport. CSS [environment variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) provide safe-area insets. These popup bounds are separate from the workspace-width policy measurement.

Overflow cues should reserve their own space and have no pointer interception. Show above and below cues independently, update them when content or scroll position changes, and retain a visible indication in forced colors. Nested menus, Back navigation, filtering, and keyboard focus scrolling must update the cues too. A submenu must reveal its first actionable row rather than inherit an unrelated previous scroll offset.

## Splitters and compact chrome

The current splitter has a six-pixel target with negative three-pixel margins. A larger supported target should occupy its own track instead of expanding an overlapping hit region over adjacent content. Keep the visible rule and the interactive track separately configurable. An 18px track is a useful host choice, not a required global default. Minimum-size calculations must account for the space consumed by that track and define behavior when the container cannot satisfy both pane minima.

Single-pane presentation must keep both contents mounted and preserve the stored split value. Hidden presentation must suspend measurement or clamping that could replace the saved split with the visible pane's full size. Returning to split presentation should remeasure and clamp only for the currently available space. Hosts retain labels, per-reader state, URLs, and scroll restoration.

Compact chrome should hide secondary buttons only when every applicable command remains accessible through the window menu. Size the hit target independently of its glyph. Policy-driven disabled controls and title-bar instructions must agree with effective capabilities. The title, active indication, and keyboard access must remain available in light, dark, forced-color, and enlarged-text presentation.

## Taskbar and theme boundaries

`renderDocks()` finds `data-win-dock` throughout the document, so the taskbar already need not be inside the detail pane. Document workspace-level placement and test list/detail switching, focus, and overflow. PUDL currently owns the contents of the dock element by replacing them during rendering; host sidebar controls should be siblings in a shared taskbar container rather than children that PUDL will remove.

A separate pane-navigation API needs an explicit URL representation and precedence relative to the window module's automatic `data-md-pane` updates. Do not introduce that API as an incidental extension of this batch or describe minimizing windows as the universal meaning of showing a list.

Menu-bar groups currently consume `--tb-chip` and `--tb-chip-shadow`. Add component-specific surface, border, and shadow hooks if needed, preserving current defaults so other sites do not change unexpectedly. Document YAVCHN's raised/recessed composition as an optional theme recipe. Changing the light topbar to `--surface` is a host palette decision, and dropdown/menu-item redesign remains outside this work.

## Verification and delivery

The implementation should test floating, maximized, docked, minimized, duplicate, and content-sized windows across the breakpoint, including direct URLs and previously captured callbacks. Test policy transitions during gestures and menus, and assert that a width-only transition changes neither URL nor mounted applet identity. Test mixed participating and nonparticipating windows.

Menu tests should cover long Window lists, nested navigation, keyboard focus, touch scrolling, both overflow directions, landscape, zoom, and visible viewport changes. Splitter tests should cover both axes, pointer cancellation, adjacent content scrolling, minima, keyboard resizing, and repeated single/split transitions. Device behavior that browser automation cannot reproduce must be reported separately from simulated coverage.

The implementation targets 0.41.0. The [responsive workspace guide](../RESPONSIVE-WORKSPACES.md) records the adopted contracts and distinguishes implemented support from the deferred pane-navigation design.
