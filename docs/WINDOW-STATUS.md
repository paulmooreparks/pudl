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

Every window with statuses also gains a **Window status** command in its window commands. This opens the same popover even when a shared dock hides the individual header. Dock tabs, rail tabs and taskbar tabs can supply its anchor. A page that suppresses all window-menu access must provide another way to reach the window commands when its headers are hidden. The existing `data-win-running`, `data-win-attention` and `data-win-progress` attributes remain separate ways to mark tabs, rails and taskbar; the running attribute now maps to the shared Working state.

## Updates and ownership

Applications own the status text, counts and timing. Update the existing span's text, add or remove `.win-status` spans, or set `hidden` on an individual span. PUDL refits and refreshes an open status popover. An empty group is visually hidden while retaining its reserved layout space. Provide the group when the window is adopted; adding a previously absent group to an already adopted window is not supported.

PUDL adds no live region. An application may announce meaningful transitions through its own restrained live region, without announcing every intermediate count. The generated compact button, popover and compact-state attributes belong to PUDL and must not be modified by applications. Status presentation does not enter URL state.

Menu and popover labels use the layer's existing localization mechanism: `data-win-text-status` replaces "Window status", and `data-win-text-status-dismiss` replaces "Dismiss". A theme must provide sufficient contrast for the title bar's own foreground and background. The chips inherit that contrast; PUDL cannot repair an invalid host palette.

## Neutral counts

Set `data-win-count="3"` on a window to show a plain count in its taskbar item, dock tab or rail and generated window-selector rows. The count uses the neutral badge appearance. It has no warning glyph and does not replace `data-win-attention`; when both are present, attention comes first. A positive safe integer is required, using the same numeric conversion as the attention count. Zero, absent, negative, fractional and nonfinite values show no badge and reserve no space. The tab grows when a count appears.

A rail keeps its fixed width. A tab with a neutral count lays out its glyph, counts and execution mark vertically, growing as needed. Long count values wrap between digits so their full value remains visible. A tab without a neutral count keeps its existing rail layout.

A taskbar entry with a neutral count keeps enough width for its complete content. Under pressure, the taskbar folds labels and uses its existing horizontal scroll path instead of clipping count digits. A taskbar containing a neutral count also grows its shared entry height when enlarged badge text needs more room; the usual size is unchanged.

An optional `data-win-count-label="busy"` makes the accessible count phrase and tooltip read `3 busy`. The visible badge shows only `3`. Without a suffix, the accessible phrase is the number alone. The host supplies localized suffix text; surrounding whitespace is trimmed, and the value is treated as plain text.

Applications own the count and its meaning. For example, a host may count every open chat that has work running, regardless of the list group it appears in. PUDL does not infer activity or add a live region. Changes to either count attribute refresh existing controls and open selector lists. Whole-window updates copy or remove these attributes; body-only updates preserve them. Counts do not enter URL state or storage.

The separate Ctrl+Tab switcher keeps its existing icon, title and detail rows. The dock strip's More tabs menu keeps its title and state rows. Neither gains count badges. Selector rows that already expose attention through the shared window-mark renderer also expose the neutral count.

A stack adds the valid counts of its represented windows. Its accessible phrase uses the common suffix when every contributing window has the same trimmed suffix. If those suffixes differ, the aggregate phrase is the bare total. Each row in the stack list retains its own count and suffix. Windows with no positive count do not affect the common suffix.

## Execution states (0.95.1)

Set `data-win-state="working|waiting|stuck|idle"` on the window. An optional `data-win-state-label` supplies localized words and a reason, such as "Waiting for approval". An explicit valid state takes precedence over `data-win-running`; invalid explicit values render no execution state. The legacy running attribute maps to Working when no explicit state is present. Removing both attributes leaves the slot empty. These marks do not represent unread counts, provider connection, presence, or closed/retired lifecycle states.

PUDL generates a fixed-size title chip and reserves a 16px mark slot in taskbar and dock controls even without a state. Since 0.96.0, Working uses a solid right-pointing Play triangle (`play`), Waiting uses Pause bars (`pause`), Stuck uses the warning triangle (`warning`), and Idle uses a solid Stop square (`square`). Their paints derive from accent, warn, danger and text-muted; taskbar paints mix semantic colours toward text for contrast on raised and selected surfaces. Every execution mark stays static with either motion preference, including legacy running marks. Forced-colour state marks use CanvasText on a Canvas backing, including selected tabs. The title mark has a surface background to preserve its contrast against active chrome. The older `working`, `flag`, `ring` and octagonal warning-sign `stop` glyphs remain available for other uses.

Compact marks expose state words through an accessible name and tooltip. Stack popup rows and folded Window status rows also show the words; since 0.96.4 a stack row draws its state as the execution-state badge, `.badge[data-state]`, which a host may also use in rows of its own with words of its own inside (see [TASKBAR-STACKS.md](TASKBAR-STACKS.md)). Long reasons are truncated within reserved space, with their full text retained in the accessible name and tooltip. State transitions do not resize buttons, move their controls, or change the fold threshold. The generated shell remains reserved for a window with no state; its empty popup cannot be opened.

Stacks use the highest-priority represented state: Stuck, Waiting, Working, then Idle. Their accessible names and tooltips give counts for all represented states. Unmarked windows contribute no state. Layer attributes `data-win-text-state-working`, `-state-waiting`, `-state-stuck` and `-state-idle` localize default names. `data-win-text-state-count-working` and the corresponding other three names localize count phrases using `{n}`. These replace the old stack-running text override.

A window that has no execution state may still have something to say about itself, such as that its session is closed. `data-win-lifecycle` (0.96.5) gives that word. A stack row and the folded Window status draw it as a plain badge with no glyph, in the place the state would take, and the row's accessible name and tooltip include it. The compact marks on the title bar, taskbar and docks draw nothing for it, and it adds nothing to a stack's count of states. An execution state, explicit or legacy running, takes its place while it is set; removing the state gives the word back. Changing or removing the attribute is followed live.

The folded popover preserves a host chip's decorative glyph and words. An inherited title-bar foreground becomes the popover foreground; a distinct custom chip or glyph foreground is retained. It creates read-only output without copying IDs, event handlers or interactive controls. Hosts remain responsible for a custom chip foreground's contrast against the popover surface.

## Plain rows, state detail and the status region (0.95.2)

The Window status popover lists its rows with no bullets and no start indent, and the list keeps its list role for assistive technology. A window with no execution state has no state row.

An optional `data-win-state-detail` on the window gives a longer explanation of the state. The visible words stay the label from `data-win-state-label`, or the default word for the state. When the detail is non-empty after trimming, the accessible name and tooltip of the window's execution marks, and the state part of the name and tooltip of its taskbar, dock and stack-popup controls, read `label: detail`. Without a detail they read as before. A stack's own name and counts never include an individual window's detail.

The popover's rows sit in a region named with the same localized Window status text. The region is a tab stop and takes focus when the popover opens, so the keyboard scrolls it natively. It is made once, so it keeps focus and scroll position while the rows change. Dismiss stays below it.

Set `data-win-status-rows="1"` to `"6"` on the window to reserve that many rows, counting the state row when the window has a state and title execution presentation is enabled. The value must be a single digit from 1 to 6 with nothing around it, and anything else means no reservation. The region keeps that size, calculated from a row of at least `max(22px, 1.5em)` plus the gaps, however many rows it shows, so Dismiss does not move. Longer content scrolls inside the region, and a short viewport reduces the reservation so the popover and Dismiss stay on screen. Enlarged text grows the reservation with the rows.

When the last status goes away while the popover is open, it closes. Focus goes back to the control that opened it, or the window's header, only when focus was inside the popover or on its control. The popover receives pointer input itself, so Dismiss and the mouse wheel work, and the wheel does not scroll the surface beneath at the ends of the rows.

## Host title chips (0.96.0)

Set `data-win-state-title="none"` on a window when the host supplies its own title status chip. PUDL removes its generated title execution chip and its execution row in Window status, freeing the title slot. Host `.win-status` chips, including their glyphs and words, remain present and fold normally. Taskbar, dock, stack rows and stack aggregation continue to use `data-win-state` without change. Omitted, empty and unrecognized values retain the default title presentation.

The switch can change live and is copied or removed by whole-window updates. Toggling it refits the title bar and refreshes an open popover, including one opened from a shared dock with a hidden header. Execution-state changes keep geometry stable in either presentation. The switch does not replace mounted content, move the window, discard edits or alter URL state. A suppressed execution row contributes nothing to the row reservation. If suppression leaves no host statuses, the group uses no title space and its open popover closes with the existing focus-return rules.
