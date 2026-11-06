# PUDL 0.101.0

Window layout addresses preserve every logical open window's bottom-to-top order through `z.order`. The public `pudlWindows.state().zOrder` snapshot is detached and independent of taskbar order. Parents remain below contiguous children, the active family moves to the front, and docked windows retain their separate rendering band. Minimized and hidden dock members retain their logical positions. Old addresses remain compatible.

Restoration stages connected, measurable windows until geometry, stack and selection are applied. Fragment arrival order does not determine the visible stack. Region navigation preserves the new state. Hosts already saving the window layout address need no additional stack store or manual Z-index changes. Update the window script, window stylesheet and region script together. The [contract and working sample](WINDOW-STACK.md) describe normalization and lifecycle behavior.

Start's queued open notification preserves focus that has already moved to a destination. Previously that notification could move focus back into a launcher just before feedback dismissal. Hosts using Start or the launcher should also update `pudl-start.js`. Destination actions still execute immediately through the original event.

## Verification

The focused window suites passed all 36 distinct minified runs across Chromium, Firefox and WebKit. The eight core source suites passed all 24 runs; the dock/API/region source group passed 14 of 15. The failed Firefox run timed out waiting for a reload's load event. Traced baseline and candidate split-dock runs subsequently passed every dock edge; the original cause remains unproven and its evidence is retained.

The launcher correction passed all 12 source and 12 minified focused runs across those engines. The public stack sample preserved its stack and active window across reload in both themes. Component inventory, region navigation and dock overflow passed nine additional focused source runs after the contract and navigation assertions were updated for the new URL state.

Consumer integration against frozen candidate `09bb8ab` passed in Edge with readable and minified assets. Fresh browser contexts restored a saved editor and overlapping chats through the consumer's workbench and UI-state path, including delayed readiness and intervening activation. Public stack, active window and rendered overlap were preserved, with no startup editor-focus event. The native bridge was stubbed; this was not a native executable restart. Explicit delayed host activation remains a separate integration concern.

The candidate's complete CI matrix is checked before publication. Retained failures and evidence locations are recorded in [the verification record](review/window-stack-candidate.md). No manual assistive-technology or native desktop installation check is claimed. Taskbar pinning and folded launcher labeling are deferred. The specification remains 0.52.3.
