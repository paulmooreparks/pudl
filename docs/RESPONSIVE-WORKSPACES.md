# Responsive workspaces in PUDL

PUDL 0.41.0 adds an opt-in narrow-window placement policy, compact chrome, larger splitter tracks, and mounted single-pane presentation. Menus use the available visible viewport height and show independent arrows when more commands lie above or below the current scroll position.

Update `pudl.css`, `pudl-menu.js`, `pudl-menubar.js`, `pudl-windows.css`, `pudl-windows.js`, and `pudl-split.js` together. Existing windows retain their placement behavior unless they opt in. Splitter tracks now occupy six pixels of layout space by default, so the second pane has six fewer pixels than before. Remove host negative-margin or overlapping-hit-target workarounds when adopting the new track sizing.

## Narrow placement

Put the policy on each participating window, including server fragments and window templates. Set its breakpoint on the layer:

```html
<div class="win-layer" data-win-layer data-win-menu data-win-narrow-width="640">
  <section class="win" data-win="reader" data-win-narrow="maximized">
    <!-- Render the usual title bar and window body. -->
  </section>
</div>
```

At or below 640 CSS pixels, the reader fills the workspace remaining after unrestricted docks. The default breakpoint is 640; a positive finite number overrides it. PUDL measures the layer before subtracting dock strips. Container resizing activates the policy even when the browser viewport has not changed. An opted-in dock suspends its strip while restricted. Content-sized windows ignore the policy and issue a console warning.

The URL continues to hold the requested placement, dock assignment, minimization, and activation. Resizing changes neither the URL nor history. Widening displays the saved placement again without remounting the window or its applets. A direct URL can change that placement while the window remains restricted.

`pudlWindows.state()` returns canonical state. `pudlWindows.effectivePlacement(key)` returns a detached placement object reflecting the current policy, or null for an unknown key. For example, a reader can have `state().place.reader.mode === 'dock-left'` while `effectivePlacement('reader').mode === 'maximized'`. Do not persist the derived result as a replacement for the URL placement.

Restricted windows can minimize, restore visibility, share, open as a page, run content commands, and close. Their menus show a disabled **Restore to floating** command. Move, resize, snap, dock, undock, and placement reset are unavailable. Script calls to `snap()` and `dock()` are no-ops while restricted, and previously captured menu callbacks recheck availability. These calls retain their existing undefined return value. `menuCommands()` descriptors can now include `disabled: true`; hosts rendering those descriptors must honor it.

A policy transition cancels a placement gesture and closes placement menus. `pudl:windows-policy` bubbles from the layer after presentation updates. Its event has no state payload; read the inspection APIs as needed. Hosts must not use this event to write effective placement into the URL. The `data-win-restricted` attribute and rendered `data-win-mode` belong to PUDL.

Hosts can translate the new wording through `data-win-text-restore-floating` and `data-win-text-head-restricted` on the layer. The latter accepts `{title}` as the existing title-bar wording does.

## Compact chrome

Set `data-win-chrome="compact"` on a window to retain its title and window-menu button while hiding secondary chrome buttons. PUDL creates the menu button even if the layer lacks `data-win-menu`. Load `pudl-menu.js` for menu placement and keyboard navigation. The window menu retains all applicable commands.

Size the button target independently of its glyph:

```css
@media (max-width: 640px) {
  .win[data-win-chrome="compact"] {
    --win-button-size: 40px;
    --win-glyph-size: 20px;
  }
}
```

The default target is 24px with a 12px glyph, or 20px with a 10px glyph when docked. Docked title bars grow to fit larger targets. Compact chrome is independent of placement policy, so a host can use either option separately.

## Splitters and pane presentation

Set `--split-target-size: 18px` on `.split` for YAVCHN's wider target. The track occupies space between the panes and does not cover their scrollable content. `--split-rule-size` controls the visible line independently and defaults to 2px. Both options work with horizontal and `.stacked` layouts. Keyboard controls, focus indication, and minimum/maximum attributes retain their existing roles.

PUDL measures the split's content box, excluding its border and padding, and subtracts the track before reserving each pane's minimum. When both minima cannot fit, each minimum becomes half of the remaining pane space. A percentage maximum refers to the split's content box before subtracting the track, but cannot consume the second pane's minimum. Pointer cancellation restores the value from before the drag and emits no completed-change event.

Set `data-split-pane="first"` or `data-split-pane="second"` on `.split` to show one pane. Remove the attribute to restore the split. PUDL keeps both panes mounted, hides the divider, preserves the stored split value, and suspends measurements that would overwrite it. Returning to split presentation remeasures and clamps against the available space. `pudlSplit.refresh()` remains available after other host layout changes.

The host owns pane names, the URL representation, and focus transfer before hiding the pane containing focus. For a reader with Original and Translation panes, render `data-split-pane` from that reader's URL state. PUDL does not store an additional pane-selection preference. Hosts also own any scroll restoration needed when navigating between reader states.

## Workspace taskbar

The taskbar can sit outside the detail pane and remain visible while the list is shown:

```html
<div class="workspace-taskbar">
  <button type="button" id="show-list">Show list</button>
  <nav class="win-dock" data-win-dock aria-label="Open windows"></nav>
</div>
```

Keep host controls beside `data-win-dock`. PUDL replaces the contents of the dock element when rendering its window tabs. A tab restores and activates its window, or minimizes it if it is already in front. Keep the taskbar container outside whichever pane the host hides.

Independent list/detail navigation remains a separate design item. `data-win-pane="off"` retains its existing meaning: the host owns the surrounding master-detail layout's pane state. It is not a new pane-navigation API. Do not treat minimizing every reader as the universal implementation of showing the list.

## Menu surfaces and overflow

Each menu group is one slightly raised surface in both themes, following the Parks Computing treatment. Its border and shadow establish the elevation. A topbar containing a menu bar uses `--surface` in the light theme. Component tokens can customize the groups; these values reproduce the defaults:

```css
.menubar {
  --menubar-group-bg: var(--recess-bg);
  --menubar-group-border-width: 1px;
  --menubar-group-border: var(--raise-border);
  --menubar-group-shadow: var(--raise-shadow);
}
```

The border width defaults to 1px and supports values from 0px through 2px, compensated by reducing group padding. Background, border, and shadow default to `--recess-bg`, `--raise-border`, and `--raise-shadow`. The background token supplies the fill color; the group's raised border and shadow determine its elevation. Menu text uses the current theme's text colors. These component tokens do not change dropdown rows or the global palette.

Overflow arrows appear independently above and below a menu and reserve gutters outside its commands. They do not intercept pointers. Menu placement follows `VisualViewport` resize and scroll events, uses safe-area insets, and falls back to the layout viewport when that API is absent. Replaced submenu content starts at its first row. No host scroll-arrow implementation is needed.

A panel with `data-menu-placement="beside"` opens beside the element identified by `data-menu-anchor`, choosing the side that fits. It uses the same height bounds and overflow cues. PUDL's desktop submenus use this placement automatically.

## Site adoption

YAVCHN should add the narrow policy to reader fragments, remove its competing maximize/restore workarounds, and render pane presentation from each reader's URL state. Its existing 640px breakpoint, 18px splitter target, 40px chrome target, and 20px glyph fit the new contracts. Move sidebar controls beside the generated dock before moving the taskbar to the workspace level.

Parks Computing can adopt menu overflow improvements with the updated files and opt individual applets into compact chrome or restricted placement where useful. Keep content-sized tools out of the narrow maximization policy. Both sites should retain the shared [menu-bar conventions](MENU-BARS.md) and [site adoption guidance](MENU-BAR-ADOPTION.md).

Browser tests cover the policy, stale commands, breakpoint transitions, dock restoration, mounted pane preservation, splitter geometry, and menu overflow across Chromium, Firefox, and WebKit. Real mobile keyboards, pinch zoom, and device safe areas still need device-level acceptance checks; browser viewport simulation does not reproduce every device behavior.
