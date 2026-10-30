# PUDL 0.95.2 window status corrections

Paul confirmed implementation, validation and publication of this change on 31 October 2026. The canonical architectural principles remain at `C:/Users/paul/OneDrive/Documents/Architectural Principles.md`. The behavior below needs specification 0.52.2, which is published, and PUDL 0.95.2 vendors it.

## Plain rows

The rows PUDL generates in the Window status popover are a plain list with no bullets and no start indent. The change is scoped to the status popover, so a host's own lists are untouched. Because removing the bullets also removes the list role in some screen readers, the generated `ul` carries `role="list"`. A window with no execution state has no state row, so the list holds only the application's statuses.

## State detail

`data-win-state-label` stays the visible words. A new optional `data-win-state-detail` on the window holds a longer explanation that is never drawn. When the detail is non-empty after trimming, the accessible name and tooltip of every execution mark of that window read `label: detail`, where label is the visible label or, when none is given, the default word for the state. When the detail is absent or empty, the name and tooltip are exactly what they are today.

The same text replaces the state portion of the name and tooltip of the window's taskbar, dock and stack-popup controls, which keep their title, attention count and progress. Individual window rows in a stack popup therefore carry the detail. An aggregate stack mark and a stack button's counts carry none, because a stack stands for several windows. The attribute is observed like the other status attributes, so changing it refreshes the marks and an open popover.

## Status scroll region

The popover's rows sit in one generated region that is named with the layer's existing localized Window status text and is a tab stop, so a keyboard reader can scroll it with the native arrow keys and page keys. The region is created once with the popover and only its rows are replaced as status changes, so the focus target does not move while the popover is open. Dismiss stays outside the region, after it.

### Sizing contract

A window may set `data-win-status-rows` to a whole number from 1 to 6. PUDL reads it from the owning window each time the popover opens or refreshes. The value must be one decimal digit from 1 to 6 with nothing around it. A missing attribute, an empty one, and any other value (zero, negative, fractional, padded, signed, above six or non-numeric) are all treated as absent, and without the attribute the region sizes to its rows as it does now.

The execution row counts as one of the reserved rows when the window has an execution state, because it is the first row of the same list. A window with a state and three application statuses therefore needs `data-win-status-rows="4"`. The count is the host's to choose, and PUDL does not add a row to it.

With the attribute set, the region has a reserved block size calculated from that many row units plus the gaps between them, and it keeps that size whether the window currently shows fewer rows or the maximum, so Dismiss does not move as rows are added and removed. A row unit is `max(22px, 1.5em)` and the gap is the existing spacing step between rows. Each row has that size as a minimum and may grow and wrap inside the region. Content beyond the reservation, whether more rows or wrapped text, scrolls inside the region without moving Dismiss, and every part of it stays reachable. The reserved size is a basis the viewport can reduce, so a short viewport leaves room for the popover padding and Dismiss, and the region scrolls once that applies. Changes to the viewport or to the text metrics can legitimately change the reservation, because it is calculated from them.

The row unit is in `em`, so enlarged text grows the reservation and the rows together. The scroll position is kept when rows are replaced, and is clamped only when the content becomes shorter than the position.

### Focus and dismissal

Opening the popover explicitly focuses the region once the popover is open, without relying on the browser's default focus for an auto popover. Escape closes it and returns focus to the control that opened it, and a press outside closes it, both as today. Widening the window until the chips fit still closes the popover and focuses the header.

When the last status disappears while the popover is open, the popover closes. Focus returns to the control that opened it if that control is still showing, and otherwise to the owning window's header, but only when focus was in the popover or on its control. A reader who has moved focus elsewhere keeps it there.

## Pointer access

The generated popover is a child of the window layer, which lets the pointer through to the content beneath it, so the popover inherited that and its Dismiss button and wheel input reached the surface underneath. The popover now sets `pointer-events: auto` on itself, scoped to the status popover, so a click on Dismiss is received by Dismiss and the wheel scrolls the rows. At the start and end of the rows the wheel does not scroll the surface beneath, because the region contains its overscroll. This restores the interactive behavior the existing contract already describes, so it needs no specification change.

## Acceptance

Tests cover plain rows with their list role, the name and tooltip with and without a detail, an empty detail and the default label, the region's name, focusability, focus on opening and native scrolling, the stationary Dismiss button as one to six rows change, the execution row counting toward the reservation, invalid reservation values, rows beyond the reservation staying reachable, the scroll position through updates, enlarged text, a short viewport, a real mouse click on Dismiss that does not reach the surface beneath, and the mouse wheel inside the rows and at their ends. Chromium, Firefox and WebKit must pass before the release is published.
