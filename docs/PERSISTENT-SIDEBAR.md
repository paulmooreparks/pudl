# Persistent sidebars

PUDL 0.43.0 adds an opt-in persistent master-detail handle. Load `pudl.css` and `pudl-md.js` together. Add `data-md-persistent` to `.md-layout`; retain the usual `.md-body`, `.md-sidebar`, `.md-resize`, and `.md-detail` markup. Existing layouts and generic splitters keep their previous behavior.

## Rendered state

The host renders the requested expanded width as a CSS length in `--md-sidebar-w`, desktop collapse with the presence of `data-md-collapsed`, and narrow pane selection in `data-md-pane="list|detail"`. The default expanded width remains 260px. Neither collapse nor narrow presentation replaces the requested width with zero. PUDL stores no preferences. Hosts choose how to persist width and must render navigation state from their URLs.

The layout's content width determines narrow presentation at 640 CSS pixels or less. PUDL owns `data-md-narrow` and the derived `--md-effective-w` and `--md-requested-w`; hosts must not set them. The divider occupies `--md-target-size`, default 12px with a fine pointer and 20px with a coarse one (24px before 0.54.0), independently of `--md-rule-size`, default 2px. The visible pane fills the remaining narrow body. Collapsed content remains mounted and inert. PUDL restores the inert value that existed before it hid a pane.

Configure the layout with `data-md-default-width` (260), `data-md-min` (180), `data-md-max` (50%), `data-md-collapse-threshold` (40), and `data-md-gesture` (24). Values are CSS pixels except a percentage maximum, which is relative to body content width. Invalid values use defaults. Limits account for the track and available space. Collapse threshold is capped at the expanded minimum; expanded widths between the threshold and minimum clamp to the minimum. A host permitting 40px expanded sidebars can set `data-md-min="40"`. Saved requested widths survive temporary geometry constraints.

## Commands and requests

`pudlMd.state(layout)` returns a detached object with `width` (requested expanded pixels), `effectiveWidth`, `collapsed` (desktop preference), `narrow`, and `pane`. `pudlMd.refresh()` reconciles current markup. Container resizing, state attributes, and region replacement also refresh the component.

`pudlMd.command(layout, action)` accepts `toggle`, `expand`, `collapse`, `increase`, `decrease`, and `reset`. Buttons inside the layout can use `data-md-action` with those values. Use ordinary labelled buttons for a pointer-operated alternative to dragging. Toggle buttons receive `aria-expanded` and `aria-controls`; hosts supply their labels. In narrow presentation, expand/increase request the list, collapse/decrease request detail, and toggle/reset request the other pane.

`pudl:md-request` bubbles from the layout with `{ pane, source, requestId }`. The component does not change presentation on request. A host may decline by doing nothing, or complete navigation and call `pudlMd.setPane(layout, pane, requestId)`. That call returns false for a stale request, an invalid pane, or an unavailable component. Calling `setPane` without a request ID renders independent navigation and invalidates pending requests. Directly changing `data-md-pane` also invalidates pending requests. Breakpoint changes invalidate pending requests. Use request IDs for asynchronous completions, including Back/Forward reconciliation through the unconditional form.

`pudl:md-change` bubbles after a committed transition has updated geometry, focus, and accessibility. Its detail is `{ source, kind, state }`, where kind is `width`, `collapse`, `reset`, `pane`, or `presentation`. Pointer dragging previews width; release commits once. Each keyboard command commits immediately. Sources are `pointer`, `keyboard`, `button`, `api`, `host`, and `presentation`. Canceled gestures emit no commit. Direct host attribute edits refresh presentation without a commit event; use the command and pane APIs when a notification is needed. `pudl:md-resize` remains available for expanded desktop width changes and resets, but never represents collapse or a mobile pane switch. Persist requested width from the new event if temporary clamping must not overwrite a preference.

## Interaction and focus

Desktop arrows resize by 16px, or 64px with Shift, in physical directions with RTL respected. Home collapses, End expands to the maximum, Enter toggles, and double-click restores the configured default. Collapse by dragging preserves the width from before that drag. Cancellation, loss of capture, removal, or a container geometry change restores the starting requested state and cancels the gesture.

A narrow drag requests a pane switch on release after the configured distance in the appropriate direction. It does not preview a drawer. Short and canceled gestures do nothing. Arrows request the corresponding pane, Home requests detail, End requests the list, and Enter or double-click requests a toggle.

Before a pane is hidden, focus inside it moves to the persistent handle. A host needing a different focus destination should focus a visible control before committing. Reopening does not move focus. Pane accessibility and toggle expansion state follow committed presentation, never a pending request.

The handle's `aria-label` names its pane. Translate `data-md-valuetext` (`{n} pixels wide`), `data-md-collapsed-text` (`Sidebar collapsed`), `data-md-list-text` (`List shown`), and `data-md-detail-text` (`Detail shown`) on the handle. Provide mode-specific instructions through `data-md-wide-help` and `data-md-narrow-help`; PUDL renders them as its title and accessible description. Narrow separator values are 0 for detail and 100 for list; desktop values use pixels.

## The sidebar's side

Since 0.52.0, `data-md-side="end"` on the layout puts the sidebar at the end edge of the writing direction: the right in a left-to-right page, the left in a right-to-left one. `start`, or no attribute, keeps it at the start. At the end edge the sidebar, its handle and its border are mirrored, and dragging and the arrow keys follow it as they follow a right-to-left page. The document order is unchanged, so the keyboard and assistive technology meet the sidebar first wherever it stands. Changing the attribute moves the sidebar at once, keeping its width and its collapsed state; a host that keeps the reader's choice sets the attribute before the first paint, as it renders `--md-sidebar-w` and `data-md-collapsed`. The side applies to plain master-detail layouts too, and a narrow layout, which shows one pane, ignores it.

## Peeking at a collapsed sidebar

Since 0.52.0, `data-md-peek` on a persistent layout lets the reader look into a collapsed sidebar without expanding it. Resting a pointer on the handle for 200ms opens a peek; a pointer that only crosses the handle opens nothing. Focusing the handle from the keyboard opens it too, Down on the handle moves into the list, and Escape closes it with focus back on the handle. The peek draws the sidebar over the detail pane, from its edge, at its effective width, raised above the windows there, with the handle at its side; nothing behind it moves. It closes 300ms after the pointer leaves it, when focus leaves it, and when a link in it is chosen, and stays while one of its own popovers is open or a drag that started in it goes on.

A peek never sets `data-md-collapsed` or `--md-sidebar-w`, and it fires no `pudl:md-change` or `pudl:md-resize`. Pressing the handle of a peek, Enter on it, or any expand command expands the sidebar for good where the peek stood, through the usual commit. PUDL marks an open peek with `data-md-peek-open` on the layout and the handle's offset in `--md-peek-shift`; both are PUDL's, and a host must not set them. `pudl:md-peek` bubbles from the layout with `detail.open` true or false as a peek opens and closes. A peek applies only to a wide layout and to a pointer that can hover, `(hover: hover)`; touch and narrow layouts keep their own behaviour.

## Host adoption

An independently controlled window workspace must set `data-win-pane="off"` on its window layer. Otherwise the window manager owns `data-md-pane`, and the host must route requests through that existing policy. Do not give both components independent authority over pane selection.

The [persistent article reader](../samples/persistent-sidebar.html) demonstrates URL pane state, Back/Forward, refusal when detail is unavailable, and pointer buttons. It preserves mounted content. Parks Computing can replace its divider and gesture handlers while retaining its commands and window adapter. If restoration depends on a saved window set, represent enough state in the URL to reconstruct it, or preserve canonical window state while changing only pane presentation.

The target can be styled to match a host, but smaller targets need an accessibility assessment. Keep a click/tap alternative for resizing and switching panes. Test real touch and assistive technology in addition to the automated browser checks.
