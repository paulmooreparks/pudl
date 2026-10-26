# Title-bar status chips

A window may show application-owned status text between its title/detail and its window buttons. Load the usual `pudl.css`, `pudl-windows.css`, `pudl-menu.js` and `pudl-windows.js`. Put one `.win-statuses` group directly in `.win-head`, with a `.win-status` span for each state:

```html
<header class="win-head">
  <h2 class="win-title">Conversation</h2>
  <div class="win-statuses" role="group" aria-label="Window status">
    <span class="win-status strong">Working</span>
    <span class="win-status">Background 2</span>
    <span class="win-status">Subagents 3</span>
  </div>
  <nav class="win-chrome" aria-label="Window">
    <button class="win-btn" data-win-action="close" aria-label="Close"></button>
  </nav>
</header>
```

The group belongs after `.win-title` and optional `.win-title-detail`, before `.win-chrome`. Status spans contain readable text and may include decorative `.glyph` spans with `aria-hidden="true"`. They do not contain links, buttons or inputs. A status reports state; an action belongs in a separate control.

The chips inherit the title bar's foreground, use a transparent background and a 1px currentColor outline, and have no shadow. They retain the same treatment in active and inactive windows and forced colours. The `strong` variant uses weight 700 for in-progress work. Ordinary statuses use weight 500. Their words identify the state without relying on colour. Existing `.chip` and `.badge` components elsewhere retain their own appearance.

## Compact layouts

PUDL measures only the local header and status group. If the full chips would truncate the title or overflow the header, it replaces the group visually with a standard glyph button named **Window status**. Vertical collapsed headers always use this compact control. The button opens a read-only popover listing every visible status in full, with a Dismiss button. Enter or Space opens it; Escape or a press outside closes it. The ordinary popover placement keeps it inside the viewport.

Widening restores the chips when they fit. If the compact control or its popover held focus, widening closes the popover and focuses the header. Once status has compacted, the title can still truncate if the title and mandatory window controls alone do not fit.

Every window with statuses also gains a **Window status** command in its window commands. This opens the same popover even when a shared dock hides the individual header. Dock tabs, rail tabs and taskbar tabs can supply its anchor. A page that suppresses all window-menu access must provide another way to reach the window commands when its headers are hidden. The existing `data-win-running`, `data-win-attention` and `data-win-progress` attributes remain separate ways to mark tabs, rails and taskbar; they do not carry arbitrary status text.

## Updates and ownership

Applications own the status text, counts and timing. Update the existing span's text, add or remove `.win-status` spans, or set `hidden` on an individual span. PUDL refits and refreshes an open status popover. An empty group disappears. Provide the group when the window is adopted; adding a previously absent group to an already adopted window is not supported.

PUDL adds no live region. An application may announce meaningful transitions through its own restrained live region, without announcing every intermediate count. The generated compact button, popover and compact-state attributes belong to PUDL and must not be modified by applications. Status presentation does not enter URL state.

Menu and popover labels use the layer's existing localization mechanism: `data-win-text-status` replaces "Window status", and `data-win-text-status-dismiss` replaces "Dismiss". A theme must provide sufficient contrast for the title bar's own foreground and background. The chips inherit that contrast; PUDL cannot repair an invalid host palette.
