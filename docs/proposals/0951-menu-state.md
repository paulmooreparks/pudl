# PUDL 0.95.1 menu and execution-state corrections

Paul authorized implementation, validation and publication on 30 October 2026. The canonical architectural principles remain at `C:/Users/paul/OneDrive/Documents/Architectural Principles.md`.

## Menu freshness

The menu bar reads current front-applet commands when opening a menu and before invoking a command. Changing the front window or its title must update the bar. Commands that appear or disappear within the same front applet must follow on the first opening, without a host refresh workaround. An old menu or ribbon control cannot invoke a removed or disabled command. Keyboard shortcuts use the current command set. Applets can signal a command-set change to refresh an already-open menu or ribbon; plain JavaScript state changes cannot be observed automatically.

## Execution states

`data-win-state` accepts working, waiting, stuck and idle. `data-win-state-label` optionally supplies the localized state words and reason. An explicit valid state takes precedence over legacy `data-win-running`, which maps to working. Windows with neither attribute have no execution mark. Invalid explicit values do not claim a valid state.

Working uses an open arc and accent; Waiting uses a flag and warn; Stuck uses a warning triangle and danger; Idle uses a hollow circle and text-muted. Working animation stops under reduced motion. Compact marks reserve a fixed slot and expose words through their accessible name and tooltip. Stack popup and folded Window status rows show glyph, colour and words. Controls keep their positions as labels change. Stack aggregation selects stuck, waiting, working, then idle and exposes per-state counts.

The same renderer supplies title status, taskbar buttons, dock marks and popup rows. Folded status content keeps its meaning without copying interactive controls or duplicate IDs. Native forced colours retain distinct glyphs.

## Taskbar row height

Every entry in one taskbar row is the same height: a stack, an ordinary window and a docked window all measure alike, across skins and themes, execution states, normal and narrow layouts and enlarged text, and when the taskbar switches between individual windows and stacks. A stack is a native button and an ordinary entry is a link, so `.win-tab` sets its line height to inherit, which gives both the same line height instead of leaving the button on the browser's default. Heights come from the text size and padding, with no fixed pixel height that could clip enlarged text.

## Acceptance

Tests cover front-window changes, same-chat running and queued state changes, retitling, stale invocation, keyboard shortcuts, ribbon controls, open-menu refresh and focus. Status tests cover all states, legacy compatibility, aggregate priority/counts, mutation, compact and folded rendering, RTL, reduced motion, forced colours, stable controls and skin/theme combinations. Chromium, Firefox and WebKit must pass before the release is published. Dinah removes its workaround only after its parked integration regression passes against the release.
