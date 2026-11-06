# Taskbar pins beta candidate

This candidate is based on the published 0.101.0 distribution, with development starting at `c6a2572`. It is an unreleased build for host integration. Distribution version headers remain at the published baseline; the candidate commit and asset manifest identify the additional code. No release tag, public package or production promotion is part of this checkpoint.

## Included changes

The window control registers persistent destinations and projects their associated root windows onto a stable taskbar pin. It shares Pin to taskbar and Unpin from taskbar across standard window menus, the active Window menu and taskbar context menus. Dormant pins expose Open and Unpin; multiple instances use the existing stack chooser. Optional New window requests, asynchronous request tracking and failure settlement are documented in [TASKBAR-PINS.md](../TASKBAR-PINS.md).

The standard asynchronous window-open path now preserves an intervening active-window selection. The previous path guarded DOM focus but still assigned the newly loaded window as top. The regression delays a fetched fragment, activates another window, and verifies both top and DOM focus after the delayed window mounts.

The folded launcher action reads Open launcher with the shared app glyph. Hosts can localize it through `data-menubar-launcher-label`; the expanded identity retains its existing name and logo. The same invocation and cancellation path remains in use.

The generic markup radio choice event addresses GitHub issue [#34](https://github.com/paulmooreparks/pudl/issues/34). Its cancelable `pudl:menu-choose` event carries the source button and string value without requiring inline handlers. Existing source clicks remain unless canceled. Automatic generation of skin or theme menus is deferred. The [choice contract](../MENU-CHOICES.md) and sample demonstrate host-owned checked state.

## Host integration boundary

The host owns destination registration, authorization, routing, instance creation, application readiness, notifications and scoped preference storage. It must retain temporarily unavailable saved IDs outside the current rendered projection. The host's promise should settle after the application is usable, including initialization following fragment insertion. Rejection releases pending state and permits retry. Existing instances remain activatable while creation is disabled or pending.

The initial candidate accepts shared glyph names for dormant destinations. Hosts with picture icons should select a glyph fallback rather than patch generated DOM. Existing top-bar bookmark records require no migration into taskbar preferences. New window associations must come from explicit content metadata.

The beta owner will integrate the frozen assets, run host regressions and deploy an isolated beta build for live review. The host tests should cover real singleton tools, several instances, a document destination, account and guest preference isolation, expired sessions, failed and delayed fragments, initialization readiness, close vetoes, overflow, narrow layouts and all management menus. Production remains unchanged until review.

## Verification

The source checkpoint passed 33 suite runs, comprising 11 focused suites in Chromium, Firefox and WebKit. These cover pin lifecycles, command requests, ordering, both stack modes, complete window-stack restoration, window menus, launcher feedback, menu open tracking, folded launcher presentation and markup choices. Source logs and screenshots are retained under `tests/output/pins-beta-source-20261106/`.

The matching 33 minified suite runs also passed, with evidence under `tests/output/pins-beta-minified-20261106/`. An additional three source runs explicitly exercise the active Window menu in every engine, under `tests/output/pins-window-menu-source-20261106/`. The handoff manifest records the corresponding final minified check. `node build/minify.js --check` and Git whitespace checks pass. Rendered screenshots were inspected for narrow folded launcher presentation and normal taskbars in both themes.

Earlier development failures are retained under `tests/output/pins-menu-check-20261106/`, `tests/output/pins-command-check-20261106/`, `tests/output/pins-choices-check-20261106/` and `tests/output/pins-menu-three-20261106*`. The corrected tests use the real opt-in window menu and ribbon controls. The delayed-fragment harness configures the source before initialization rather than changing a cached source attribute afterward.

The checks use isolated browser contexts and a static test server under the shared browser lock. They do not establish deployed beta behavior, native desktop behavior or manual assistive-technology coverage. This checkpoint does not claim to resolve intermittent application responsiveness stalls.
