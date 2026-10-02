# Persistent sidebar review

This review, dated 3 October 2026, recommends an opt-in persistent sidebar handle for PUDL. It evaluates the [Parks Computing proposal](https://github.com/paulmooreparks/parkscomputing/blob/main/Architecture/pudl-proposal-persistent-sidebar.md) against PUDL 0.42.0. These are proposed implementation requirements; this document does not add a supported API or authorize a release.

The canonical [Architectural Principles](<C:/Users/paul/OneDrive/Documents/Architectural Principles.md>) apply. The existing [responsive workspace contract](../RESPONSIVE-WORKSPACES.md) remains in force until an implementation updates it.

## Implementation status

Paul approved implementation, testing, and release on 3 October 2026. PUDL 0.43.0 implements the opt-in master-detail integration. The [component contract](../PERSISTENT-SIDEBAR.md) records the final attributes, commands, and request timing. The review below remains the rationale; its open API questions are resolved by that contract.

## Recommended scope

PUDL should own the persistent divider, collapse and reopening mechanics, keyboard interaction, focus safety, and committed change notifications. Applications should retain their navigation, storage, window restoration, and command placement policies.

| Proposal | Recommendation |
| --- | --- |
| Persistent handle | Add an opt-in mode that keeps the handle operable when its pane is collapsed or hidden by narrow presentation. |
| Track geometry | Give master-detail handles independent target and rule sizes, with the target occupying layout space. |
| Desktop interaction | Support resize, collapse, remembered-width restoration, reset, and cancellation. |
| Narrow interaction | Request a pane change after a completed gesture, without changing the saved desktop width. |
| Keyboard and accessibility | Define consistent collapse, restore, focus transfer, translated instructions, and RTL behavior. |
| Window restoration | Keep the saved window set and selective restoration in the host. |
| Toggle controls | Supply a documented way to invoke and inspect the same state transition used by the handle. Keep wording, glyph selection, and placement with the host initially. |
| Continuously dragged drawer | Leave this outside the initial feature; neither the submitted use case nor existing PUDL layout requires it. |

## Existing implementation gaps

The master-detail divider in `dist/pudl.css` is a six-pixel target with negative margins. It occupies no net layout width and disappears under the 640-pixel container query. Its sidebar width is clamped to a minimum of 180 pixels by default. Setting its width to zero cannot implement collapse under the current contract.

`dist/pudl-md.js` provides dragging, arrow keys, Home, End, and double-click reset. It does not provide collapse, a pane-request contract, or a public refresh method. Its `pointercancel` handler currently takes the same path as `pointerup`, applies the last pointer position, and announces a committed resize. That cancellation defect should be fixed even if the larger feature is deferred. Its geometry refresh also listens to browser resize rather than observing the layout container.

`dist/pudl-split.js` already has real track sizing, container observation, and drag rollback. Its single-pane mode intentionally hides the handle. Enter currently resets its size. Persistent collapse must therefore be an opt-in extension that preserves existing Enter and single-pane behavior for other users.

PUDL's window manager already writes `data-md-pane` unless the layer sets `data-win-pane="off"`. An independently controlled sidebar must use that existing opt-out, or route requests through the host's window policy. Two components must not compete to set the pane.

## Component boundary

Implement the first public integration in `pudl-md.js`, where sidebar sizing and responsive list/detail presentation already live. Define geometry, cancellation, and collapse semantics so generic splitters can adopt them without a second behavior model. Share internal code where it reduces duplication, but do not introduce another required script merely to expose a common helper.

The initial release should keep existing layouts unchanged unless they opt in. The reference page should demonstrate the opt-in beside the existing behavior, and the article-reader sample should demonstrate a host adapter. A generic splitter extension can use the same contract when a concrete caller needs it; it need not delay the sidebar feature.

## State and ownership

The contract needs separate values for the requested expanded desktop width, desktop collapse, and narrow pane selection. Effective width is derived from those values and the current container geometry. Narrow presentation must not overwrite the desktop width or collapse preference. A successful collapse drag preserves the expanded width from before the drag; reopening clamps that width to current limits without destroying the requested value.

The host owns persistence. The component must not write local storage or maintain a second authoritative navigation state. PUDL already permits browser-local width preferences, but that precedent does not automatically authorize storing pane navigation or window visibility only in memory. The host must render addressable pane selection from its URL and reconcile Back, Forward, reload, and direct links. A breakpoint transition changes presentation without creating history entries.

Parks Computing's saved window set needs particular care. If that set is required to reconstruct the workspace after returning from the list, keeping it only in memory leaves restoration dependent on hidden state. The adoption guide should require either a URL representation sufficient to reconstruct it or a presentation-only pane switch that preserves canonical window state. This review does not endorse the current saved-set technique as a general PUDL recipe.

## Request and commit contract

A narrow gesture should issue a host-handled request naming the desired pane and input source. Issuing the request must not itself change pane visibility, accessibility values, desktop preferences, or the URL. The host can decline by leaving authoritative state unchanged. If navigation is asynchronous, presentation remains unchanged until the host renders the accepted state, and an older request must not override newer navigation.

A committed notification should fire only after geometry, visible pane, focus, and accessible values agree. It should identify the source and distinguish width changes, collapse changes, resets, and pane changes. Existing `pudl:md-resize` consumers must not receive a mobile pane switch disguised as a saved width of zero. Exact public names and payloads belong in the implementation specification before coding begins.

Pointer cancellation, lost capture, removal, and a breakpoint transition during a drag must cancel pending animation and keyboard notifications and restore the starting requested state. They must not save a preference or emit a successful-change notification. Unrelated layouts must have independent gesture state.

## Interaction and focus

In opt-in desktop mode, Enter should collapse or restore, arrows should resize in physical directions with RTL accounted for, and Home and End should reach the documented bounds. Double-click can retain desktop reset. Collapse threshold and expanded minimum need separate definitions: crossing the threshold collapses, while other widths clamp to the expanded minimum. Hosts can choose a smaller expanded minimum to reproduce Parks Computing's behavior.

At narrow widths, a completed directional drag requests the other pane. Short gestures and cancellation do nothing. Enter requests a toggle. Arrow and Home/End behavior must be specified and tested as an additional navigation convention rather than described as desktop pixel resizing. Instructions and value text must change with the interaction mode.

Before an accepted transition hides a pane containing focus, move focus to the persistent handle unless the host supplies a valid visible destination. Focus already on the handle stays there when it changes position. Reopening must not steal focus from another visible control. Hidden content stays mounted and cannot receive focus or pointer interaction; restoring it must preserve any pre-existing host restrictions.

The [WAI-ARIA window splitter guidance](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) supports a focusable separator with values, a pane label, and collapse/restore through Enter. That guidance also identifies its own incomplete example review. The implementation still needs assistive-technology checks, especially where the narrow handle switches between fixed presentations.

## Defaults and acceptance

Retain the existing 640-pixel layout breakpoint, 260-pixel desktop default, 180-pixel expanded minimum, and 16/64-pixel keyboard steps unless the host configures them. Parks Computing's 300-pixel default, 40-pixel collapse threshold, and 24-pixel gesture distance can remain host settings. Final threshold defaults require an interaction check; they should not become universal merely because one site uses them.

Use a target at least 24 CSS pixels wide for the new persistent mode, independently of the visible rule. An 18-pixel host override needs a target-size assessment. [WCAG's target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) permits specific exceptions, including an equivalent control, but a toggle does not necessarily provide equivalent continuous resizing. The initial design must also supply a pointer-operated alternative to dragging for users who cannot drag; keyboard support alone does not meet the [dragging-movement requirement](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

Acceptance checks must cover cancellation, RTL, container-only resizing, breakpoint changes during a gesture, host refusal, asynchronous navigation, focused content being hidden, and mounted content preservation. They must also cover URL restoration, disabled return-to-detail requests, legacy behavior without opt-in, light and dark themes, forced colors, touch targets, and keyboard instructions. Site test results described in the proposal do not establish these component guarantees.

The next step is an implementation specification for the request/commit API and state representation, followed by the opt-in sidebar implementation and its host-adoption example. No runtime changes are included in this review.
