# Proposal: splitters between snapped windows

Status: accepted 2026-10-20, with the decisions recorded at the end, and released in PUDL 0.67.0 with specification 0.27.0. Building it changed two rules, which "As built" at the end records. The request was for a splitter that resizes two windows docked next to each other, left and right or top and bottom, and for the same idea across PUDL's other arrangements, such as four windows in the corners or two on one side and one on the other.

## Which windows this is about

PUDL has two ways for windows to sit side by side, and only one of them needs anything new.

A window docked at an edge of the workspace already resizes along its free edge, and everything in the inner area follows it, so the line between a dock and the windows beside it is a splitter today. Two docks never meet along a line both of them can move: a left dock and a right dock have the inner area between them, and a top or bottom dock spans the whole width, so the line it shares with a side dock is its own free edge.

Windows snapped to zones are the case this proposal is for. Two windows snapped to the left and right halves meet along the middle of the inner area, and neither can be resized, because a snapped window does not resize from its frame. The reader who wants the left one wider has to float both and arrange them by hand, which loses the snapping. The request's examples (halves, quarters, two on one side and one on the other) are all zone arrangements, so I read "docked next to each other" as "snapped next to each other". If the request meant the edge docks, the first two paragraphs answer it and the rest can be set aside.

## The idea: the grid's lines move

A zone is a rectangle on a grid of sixths: the halves are three sixths wide, the thirds two, and the quarters three sixths each way. The grid has seven vertical lines and seven horizontal lines, numbered 0 to 6, and today line *i* always sits at *i*/6 of the inner area.

The proposal lets the reader move a grid line. A splitter drawn where two snapped windows meet moves the line they share, and every snapped window with an edge on that line follows it, because each window still fills the same cells of the grid and only the grid has stretched. Dragging the line between left and right halves from the middle to 42% makes the left half 42% wide and the right half 58%. Nothing about either window's placement changes: the left one is still `left`, and the address still says so.

Moving lines rather than windows keeps three things PUDL relies on.

- Every arrangement still has one spelling, since a placement is still cells of the sixths grid. The layout picker, the snap targets, "open beside", and the rule that a half reads as `left` or `right` are untouched.
- Two windows are next to each other exactly when they have cells on either side of the same line, so finding where a splitter goes is a comparison of whole numbers rather than of measured edges.
- The arrangement still lives in the address, with one short parameter added for the lines that have moved.

### What it does for each arrangement

| Arrangement | Splitters | What a drag does |
|---|---|---|
| Left and right halves | One vertical, on line 3 | Widens one half and narrows the other |
| Top and bottom halves | One horizontal, on line 3 | Heightens one and shortens the other |
| Two on one side and one on the other (left half, top right, bottom right) | A vertical one on line 3, the full height; a horizontal one on line 3, across the right half only | The vertical one moves all three windows' shared edge; the horizontal one changes only the two on the right, since the left half has no edge on it |
| Four quarters | A vertical one and a horizontal one, crossing in the middle | Each moves its line across the whole area, so dragging the horizontal one changes all four windows' heights together; a handle where they cross moves both lines at once |
| Thirds | Two vertical ones, on lines 2 and 4 | Each moves the boundary between its two neighbours and leaves the third window alone |
| One third beside two thirds | One vertical, on line 2 | As for halves |

The four quarters show the limit of moving whole lines. A reader cannot make the top-left quarter taller than the top-right one, because the two share line 3 and the line moves as one. Allowing that would take a tree of splits, where each column divides on its own, and that is a different model from the sixths grid: the layout picker, snapping by dragging, the address and "open beside" would all have to learn it. I recommend accepting the limit. The cross handle makes the common wish, a bigger corner, one drag.

### Lines nobody moved

Only the lines a reader has moved are kept. A line that has not been moved sits evenly between the nearest moved lines on either side, or the edges of the inner area. Moving line 3 to 42% therefore puts lines 1 and 2 at 14% and 28%, and lines 4 and 5 at about 61% and 81%. This keeps the lines in order whatever the reader does, so a window snapped later to a third or a quarter always gets a rectangle with a width, and it means a single dragged line stretches the whole half of the grid it divides, which is what a reader who then snaps a quarter there would expect.

A moved line is forgotten when no snapped window has an edge on it any more, for example when one of the two halves is closed or floated. Without that, a reader who once dragged the halves apart would find every later half the wrong size with no visible cause. The next pair of halves starts from the middle.

### Limits

A line can move only as far as every window with an edge on it can shrink, each down to its least size (`data-win-min`, or the layer's minimum), and never past the next moved line. Like the splitters in `pudl-split.js`, the limits are checked again when the inner area changes size, so a narrowing workspace pushes a line back toward the middle rather than squeezing a window below its least size.

### Where splitters appear

A splitter is drawn on the part of a line where two windows that can be seen meet: windows snapped to zones, not hidden, not minimised, and not covered by a maximised window. It runs only as long as the two windows share the line, which is why the horizontal splitter in the two-and-one arrangement covers the right half alone. A window with no neighbour across a line has no splitter there; its edge against empty space is not a boundary between two windows. A floating window over the arrangement covers the splitter as it covers the windows. On a narrow screen, where every window is maximised, there are no splitters.

## How a reader uses it

The splitter has the look and the keys of PUDL's existing splitter (`.split-handle` in `pudl-split.js`), since a reader who has used one should recognise the other.

- **Pointer.** Dragging moves the line, and both windows follow live. A drag across the cross handle moves both lines. The cursor is the platform's column or row resize cursor, and the cross handle's is the move cursor.
- **Keyboard.** Each splitter is a focusable separator in the ARIA window-splitter pattern. The arrow keys along its axis move the line by 1% of the inner area, and by a sixth with Shift; Home and End go to its limits; Enter returns the line to where the grid puts it, which forgets it. The splitters come in the tab order after the windows they divide. Its value is the share of the inner area on its left or above it, spoken as a percentage, and it controls both windows.
- **Double-click** returns the line to its place on the grid, as Enter does.
- **The window menu** gains nothing. A splitter belongs to the boundary rather than to either window, and the keyboard reaches it directly.

## The web implementation

- **The address.** A new layer parameter, `grid`, lists the moved lines as an axis and a line number with a position: `grid=x3:0.42,y3:0.6`. It is absent when no line has moved, so every address written today stays valid and unchanged.
- **Drawing.** Placements are unchanged. Where `setPlacement` now turns a zone's sixths into `--zone-x` and the rest by dividing by 6, it would look each line up in the warped grid instead. The drag ghost that shows where a window will land uses the same lines, so a window dragged to the left edge previews the left half as it now is.
- **The splitters** are elements the script draws in the layer, one per shared stretch of line, rebuilt in `apply` alongside the dock's tabs. They are positioned from the same line positions, above the snapped windows and below floating and docked ones.
- **Events.** `pudl:windows-change` already reports the state when a drag ends; its detail gains `grid`. `pudlWindows.state().grid` gives the moved lines, and `pudlWindows.grid(axis, line, position)` moves one from script, with `null` to forget it.
- **Server rendering.** A server that writes the windows without script writes `--zone-x` and the rest from the warped lines, as it now writes them from sixths.

## The specification

The windows section's paragraph on snap zones gains the moving grid: that a reader can move a line shared by two snapped windows, that every snapped window with an edge on it follows, that unmoved lines space themselves evenly between moved ones, and that a line is forgotten when nothing uses it. Its states table gains the splitter, its interaction section the keys, and its accessibility section the separator. Chapter 7's list of what an arrangement restores gains the moved lines, held as shares of the inner area like everything else.

## What to test

- Halves, top and bottom halves, two and one, quarters, thirds, and one third beside two thirds, each in the three engines: the splitters are where the table above says, and a drag and the keys move what it says.
- The cross handle moves both lines.
- A window snapped after a line moved fills the stretched cells, and the drag ghost shows them.
- Closing or floating one of two halves forgets the line, and the address loses `grid`.
- Limits: no window goes below its least size, lines never cross, and a narrowing workspace pulls a line back.
- An address with `grid` restores the arrangement exactly, and one without it is unchanged from today.
- No splitter on a narrow screen, behind a maximised window, or beside empty space.
- Both themes and forced colours; the separator's name, value and keys in an accessibility tree check.

## Decisions, 20 October 2026

1. **Whole grid lines move.** There is no tree of splits; the four quarters share their middle lines, and the cross handle moves both.
2. **A moved line is forgotten when no snapped window has an edge on it.**
3. **A lone snapped window's edge against empty space is not draggable,** for now.
4. **A double-click on a splitter returns its line to the default position on the grid,** which also forgets it, as Enter does. The section on how a reader uses it already provides it.

## As built, 20 October 2026

Two rules above changed when the tests ran against them.

- **When a line is forgotten.** "No snapped window has an edge on it" kept the middle line after one of two halves was floated, since the remaining half still has an edge there, which left that half narrow with no splitter to put it back. A line is now forgotten once no two snapped windows meet across it, whether or not they are shown at the moment, and also once it lies where the grid would put it anyway, so a returned line leaves nothing in the address.
- **The other lines hold still.** Spreading unmoved lines evenly made moving the edge between the first two thirds move the edge between the last two as well, which the table above says it must not. While a line moves, every other line that divides two snapped windows on the same axis is now held where it is drawn. Lines that divide nothing still spread evenly, so a window snapped later still gets a sensible rectangle.

A window's `z-index` is now twice what it was, so that a splitter can lie just above the windows it divides and below the next window up.
