# Menu-bar standardization implementation

This design implements the [menu-bar conventions](../MENU-BARS.md) in PUDL 0.40.0. It preserves existing explicit applet menu definitions while supplying a migration for legacy fallback menus. The canonical architectural principles remain in `C:\Users\paul\OneDrive\Documents\Architectural Principles.md`.

## Contract decisions

Host source titles accept `data-menubar-id`. Standard IDs are `site`, `go`, `applets`, `view`, `window`, and `help`. Applet title descriptors accept `id`, with `file` and `edit` identifying their standard working menus. IDs are independent of labels. For migration, undeclared English standard labels are recognized and the first host title is the site identity. Explicit IDs take precedence. Custom IDs must not reuse standard IDs for another purpose.

Applet `into` keys resolve by host ID first, with existing exact host labels as a compatibility fallback. Only `go`, `view`, and `help` accept contributions. A host declares an empty shared slot with an empty `ul`; it is shown only when commands exist. A missing or disallowed slot produces a diagnostic. Duplicate IDs are rejected. Standard titles are ordered according to the conventions; custom site menus go between Applets and View. The first applet title remains its identity, and File and Edit precede domain menus.

Commands retain their source owner when merged, including nested commands. Applet-owned shortcuts require focus inside that applet's content even when their rows appear in the site bar. Host shortcuts retain site scope. An open popup records its source context; a source replacement, removal, or active-window change closes it and refreshes the bar. Invocation checks source validity synchronously so a DOM removal immediately followed by a click cannot execute stale commands.

Legacy `commands()` results move into a separate Actions menu. Their identity menu contains supported page, sharing, and window-close commands. Generated article menus put Print under File and use Copy link to this content and Close window. Explicit `menus()` definitions are not rewritten semantically; site authors migrate them using the adoption guide. Existing translation attributes remain supported, with additional defaults documented in the contract.

## Window commands

`pudlWindows.menuCommands(key)` returns fresh standard window command descriptors with `id`, `label`, `run`, and optional `items`, `checked`, or `danger`. An omitted key selects the visible front window. Missing windows return an empty array. The descriptors exclude applet commands and the `pudl:window-menu` extension hook. Native window menus and the site bar use the same capability checks, including content-sized and docked windows. Descriptors bind to their original window element and recheck command availability before executing.

A host Window title opts into generated management commands with `data-menubar-windows`. Its ID must be `window`. Host-authored entries remain first, followed by active-window layout commands, bulk actions, and the open-window list. Identity operations (page, sharing, and close) stay in the applet identity or window chrome and are excluded from the generated site list. Bulk close calls the existing close API for each captured window so cancellation still applies. Hosts omit their own duplicate management rows when adopting generation.

## Verification

Regression coverage must exercise translated labels, ID routing and legacy routing, empty slots, invalid contributions, command fallback preservation, generated article menus, scoped nested shortcuts, target removal and replacement, generated Window menus, and content-sized capability restrictions. Existing pointer, keyboard, touch, window, and sharing suites continue to apply. Tests must verify actions and URL results as well as rendered labels.
