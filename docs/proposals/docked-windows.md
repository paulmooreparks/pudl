# Proposal: docked windows

Status: accepted 2026-09-30, docking released in 0.30.0 for pudl.bytecode.news to try; the tabbed dock is specified here and not yet built. It came from pudl.bytecode.news's Site window, a floating window at the foot of the workspace that other windows cover.

## The idea

The workspace, the area windows occupy, has a frame, and a docked window is part of it. A docked window holds one edge of the workspace, the top, bottom, left or right. It takes that strip away from every other window: a maximised window fills what is left and ends where the dock begins, a snapped half is half of what is left, and a floating window cannot be dragged over it. Nothing covers a docked window, because nothing is allowed into its strip.

A docked window is still a window. It has a title bar, it can be closed, it can be resized along its free edge, and dragging its title bar away from the edge undocks it, back to where it floated before. That is what distinguishes it from a footer. A footer that never moves or closes is page layout, and belongs below the window host, not in it.

The same mechanism serves two uses that look different: standing furniture that a page opens by default, such as a site's links and version at the foot of the workspace, and a tool the reader keeps beside their work, such as a terminal docked at the bottom or a colour mixer docked at the side.

## The rules

These are the language's rules, true on any platform.

1. **An edge holds docked windows, and shows one at a time.** The edge's strip is the size of the window showing there. When a second window docks to an edge that already has one, both stay docked and the newer shows; the other waits behind it and is reached from the dock of open windows. The tabbed dock, below, gives an edge with several windows a tab for each.
2. **The strip is taken from the workspace.** Top and bottom docks span the workspace's whole width; left and right docks span the height between them. Every other window is laid out in what remains.
3. **A docked window is flush.** It has no shadow, no rounded corners and no frame band, because it is part of the frame rather than something lifted off it. A hairline separates it from the workspace on its inner edge.
4. **Its title bar is thin.** Just a comfortable margin around the title, with smaller buttons, since a dock is meant to give the workspace as much room as it can.
5. **Minimising a docked window collapses it to its title bar,** in place, rather than sending it to the dock of open windows. A collapsed footer stays where the reader expects it, one click from open again. A collapsed side dock is a narrow strip with its title running vertically.
6. **It resizes only along its free edge,** the one facing the workspace, and never below its title bar and a little content, nor above most of the workspace.
7. **It docks and undocks by pointer and without one.** Dragging a window's title bar to the bottom edge of the workspace docks it there; dragging a docked window's title bar away undocks it. A window may carry a dock button that docks it at the bottom, or undocks it when it is docked, so that docking never depends on dragging. Its title bar's keys still work: Enter undocks a docked window, and Shift with an arrow key resizes it along its free edge.
8. **On a narrow screen a side dock becomes a bottom dock,** since a phone has no room beside the content.
9. **Docking is part of the state a reader can return to and share,** like every other arrangement of windows.

## The tabbed dock (specified, not yet built)

An edge holding more than one docked window shows a row of tabs at its inner edge, one per window, in the order they docked, in PUDL's notebook style. The tab of the window showing is current; choosing another tab shows that window. Each tab carries the window's title and, on hover or focus, a close button, as document tabs do. The row replaces the windows' own title bars while there is more than one, so the edge still has one line of chrome. Dragging a tab away from the edge undocks that window; dragging a window's title bar onto an occupied edge adds it as a tab. With one window left, the row goes and the window's own title bar returns.

Rule 1 already keeps several windows on an edge, so adding the tabs changes what the reader sees and nothing a project relies on.

## The web implementation

- **Modes.** A window's mode may be `dock-top`, `dock-bottom`, `dock-left` or `dock-right`. In the address, a placement gains an optional fifth number, the strip's size as a fraction of the workspace's height (top and bottom) or width (left and right): `p.site=dock-bottom:0.06,0.05,0.55,0.75,0.22`. The four numbers before it stay the floating geometry to return to on undocking, as they do for a maximised window. A placement without the fifth number takes a size of 0.25.
- **Markup.** A window docks from its markup with `data-win-mode="dock-bottom"` and, optionally, `--win-dock-size: 0.22` in its style. A default window docked at the bottom is how a page gets standing furniture that is also a window.
- **The strips.** The script sets `--dock-top`, `--dock-bottom`, `--dock-left` and `--dock-right` on the layer, as lengths, and marks each docked window with `data-win-edge`, the edge it shows on, which is its mode's edge except that a side dock on a narrow screen shows at the bottom. A server rendering docked windows without script writes the same: the layer's properties, and `data-win-edge` on each docked window.
- **The dock button** is `data-win-action="dock"` in a window's chrome, drawn with `--glyph-dock`, and `--glyph-undock` while docked.
- **Script.** `pudlWindows.dock(key, edge)` docks a window at `"top"`, `"bottom"`, `"left"` or `"right"`, and `pudlWindows.dock(key, null)` undocks it.
