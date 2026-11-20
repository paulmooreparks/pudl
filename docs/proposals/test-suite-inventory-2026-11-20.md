# Test suite inventory, 20 November 2026

This inventory describes documentation revision 8d8430a9f9cab57694856b3655616f8df1ccae16 (Rdoc), before the audit changes. It covers all 192 top-level suites and twelve nested build test files by source inspection. It records coverage and isolation requirements, not new execution acceptance or measured runtime. No browser suite was run for this inventory. Implementation owns this document; the lead owns integrated runner, package and workflow changes.

## Findings and proposed consolidation

The baseline matrix repeats 192 entries in Chromium, Firefox, WebKit and minified Chromium. One entry is entirely browser-independent, two entries delegate to nested Node/browser tests, and 189 directly exercise browsers. A repeated browser assertion retains value when it measures engine behavior or the minified delivery. A source read does not by itself make a test static: several suites read scripts or CSS to serve them to a real browser, and expenses reads an actual downloaded CSV.

| Change | Retained coverage and boundary | Source evidence |
| --- | --- | --- |
| Run token freshness once outside browser enumeration. | Keep the identical generator check and failure exit in the required static command. Its inputs do not depend on engine or minification. | tests/tokens.test.js:4-7 |
| Split pure palette generation/math from the palette browser wrapper. | Keep generator freshness and every palette math case once; retain computed palette/focus/chrome checks in every engine/form. The first catalogue-validation case in the browser file can also move once. | tests/palette-themes.test.js; build/palette-themes.test.js; build/palette-themes.browser.test.js:11-14 |
| Move static skin admission out of the nested browser file. | Preserve the registry, compiled-byte and SHA admission checks once, while keeping material paint, geometry, forced-colors/print and Glass fallback behavior per engine/form. | build/skin-materials.browser.test.js:240-250 |
| Split the static prefix of components. | Preserve unique IDs, grammar kinds, required files, variant selector and contract-table membership checks once. Keep rendered template/category checks in both themes per engine/form. Selector text checks establish declared source membership only. | tests/components.test.js:15-53 |
| Split category and diff token math from rendering. | Preserve all contrast, Oklab/CVD separation and derived-token checks once. Retain computed CSS slot/forced-color and rendered diff sign, tint, gutter, selection and alignment assertions per engine/form. These math cases are related to companion palette tests but should only merge after comparing their distinct input domains and thresholds. | tests/category-palette.test.js:37-77; tests/diff.test.js:22-36 |
| Move UTF-8 source assertions out of title-separator. | Keep the readable CSS/JS mojibake guards once. They read the same source even under PUDL_MIN. Keep computed pseudo text, accessible labels and custom separators per engine/form. | tests/title-separator.test.js:40-46 |
| Retire the standalone stale-date diagnostic from default enumeration. | The activation suite already caches the same 09:30 row, refreshes source/min to 10:00 and rejects its callback without events. It additionally asserts native validity, focus, active identity and subsequent input handling. Preserve the standalone reproduction as an opt-in diagnostic. | tests/date-picker-stale-repro.test.js:2; tests/date-picker-activation.test.js:7-11 |
| Consider grouping row-action fixtures without dropping cases. | Geometry/touch activation, native Tab/reverse Tab and dynamic naming are distinct contracts. A shared browser bootstrap could save startup while retaining separate fixtures, named assertions and artifacts. | tests/row-actions.test.js; tests/row-actions-visible.test.js; tests/row-actions-naming.test.js |
| Keep date/combo race cases; share setup only. | Authored relocation, native validation, reset, stale activation and post-close reentrancy cover different ownership boundaries. Similar fixture names do not establish redundant assertions. | tests/date-*.test.js; tests/combo-*.test.js |
| Map migration parity before moving it to a targeted lane. | window-selector-parity compares old/new CSSOM and computed styles and therefore is a browser check. Its migration-specific cases could move only after their ongoing guarantees are accounted for by shared-docks, shared-docks-edges and window-menu-style coverage. No complete replacement is established here. | tests/window-selector-parity.test.js |

The name pinned-section-mockup does not identify disposable diagnostic code. Its assertions cover current pin/menu/keyboard behavior. general-fixes-combined also provides a cross-module integration case. Neither should be deleted on naming or superficial overlap. Historical files under tests/output are outside the runner's top-level discovery; deleting those records would not shorten this matrix.

## Isolation and concurrency

The baseline runner creates a Node process per suite and each direct suite creates its own browser. Source inspection found no persistent shared browser profile or suite-owned listening server. Browser-local storage, routes and synthetic fixtures stay in those processes. The runner's single HTTP server reads the repository. Concurrent suites within that runner can share it; concurrent runner invocations require distinct PUDL_PORT values. Build owns empirical concurrency and timing conclusions.

Every independent run needs a new PUDL_RUN_OUTPUT. The runner assigns engine/suite output and screenshot directories. Without that setting, tests/lib.js writes to shared tests/output with engine-prefixed names, so simultaneous source/minified runs of the same engine can overwrite artifacts. Nested skin screenshots honor PUDL_OUTPUT_DIR. Generator freshness checks should finish before browser execution against an unchanged tree; regeneration during a run would invalidate that boundary.

| Hazard | Required boundary | Evidence |
| --- | --- | --- |
| Outer runners collide on port 8765. | Give each runner a distinct port, or use separate CI runners. | tests/run.js:23-25, serve() |
| Run or screenshot paths collide. | Allocate a new run directory; preserve per-suite original logs/result rows. | tests/run.js:29-34, runSuite(); tests/lib.js:10, out() |
| CPU/memory contention changes geometry/font/animation timing. | Benchmark bounded concurrency before adopting it; prefer isolated CI shards when preserving one suite at a time. | fonts, skins, axe, taskbar-stack-edges and chrome screenshot suites |
| Performance assertions measure work under load. | Retain operation-count/mutation assertions and compare outcomes under the proposed schedule. Do not infer a global serialization requirement merely from their names. | perf-churn, restyle-scope, window-scaling, list-writes, toolbar-work, menu-open-tracking |
| Nested wrappers multiply browser load. | Keep their Node concurrency bounded when increasing outer workers. | tests/skins.test.js; tests/palette-themes.test.js |
| Timeout kills only the direct child. | Retain the established process ownership/cleanup boundary for local experiments; child.kill() alone is not evidence that browser descendants exited. | tests/run.js runSuite() timeout |
| Discovery/filter changes omit cases. | Require an exact union of original suite identities across engine/form shards and reconcile each original child result/log. | tests/run.js discovery and queue; lead's new suite-plan helper |

The runner already has a worker queue and defaults to up to eight workers. CI's explicit jobs=1 is a policy choice above that implementation. This source review establishes isolation candidates, not the historical reason for that setting or a measured safe concurrency value. It does not establish a speed percentage. The runner continues taking queued suites after failures, so it collects broad failure evidence rather than failing fast.

## Complete baseline top-level inventory

Each row links to its suite source and names its useful behavior. B means browser behavior retained across engines/forms. M means mixed static/browser coverage with a split recommended above. W means a nested wrapper. S means a browser-independent check. D means a duplicate diagnostic that can leave default enumeration with its case retained elsewhere. All B/M/W entries require the output/process boundaries above. The perf and font/paint rows deserve contention checks, but no row is declared unsafe for parallelism solely by inspection.

| Baseline suite | Kind | Actual coverage |
| --- | --- | --- |
| [accessibility](../../tests/accessibility.test.js) | B | Forced colors, focus outlines, reduced motion and print/PDF rendering |
| [actions](../../tests/actions.test.js) | B | Manifest action schemas, request verbs, execution and ask dialogs |
| [annotations-focus](../../tests/annotations-focus.test.js) | B | Annotation collision, keyboard dismissal and focus restoration |
| [applet-requests](../../tests/applet-requests.test.js) | B | Request discovery, unavailable actions and window/request instances |
| [applet-start](../../tests/applet-start.test.js) | B | Lazy startup, idle restore and concurrent startup ownership |
| [applets](../../tests/applets.test.js) | B | Applet lifecycle, address, state and content integration |
| [axe](../../tests/axe.test.js) | B | Automated accessibility rules on reference and sample pages in both themes |
| [category-palette](../../tests/category-palette.test.js) | M | Token palette math plus computed CSS slots and forced colors |
| [child-windows](../../tests/child-windows.test.js) | B | Parent/child address, selection and floating-parent behavior |
| [code](../../tests/code.test.js) | B | Copy, download, language selection and idempotence |
| [combo-authored-relocation](../../tests/combo-authored-relocation.test.js) | B | First-legend relocation, form association, draft and detach/reinsert |
| [combo-open-reset-ownership](../../tests/combo-open-reset-ownership.test.js) | B | Reset and reentrant close retire old list/filter activation ownership |
| [combo-query-navigation](../../tests/combo-query-navigation.test.js) | B | Query intent, editing/browsing keys and modifier close |
| [combo-query-settlement](../../tests/combo-query-settlement.test.js) | B | Reset, refresh and unfocused query settlement |
| [combo-update-continuity](../../tests/combo-update-continuity.test.js) | B | Option mutations retain query caret, focus and rows |
| [combo-validation](../../tests/combo-validation.test.js) | B | Native validity, reporting, custom errors, form/fieldset/reset and serialization |
| [combo](../../tests/combo.test.js) | B | Autocomplete filtering, keyboard selection and native source values |
| [command-bar](../../tests/command-bar.test.js) | B | Command groups, ribbon folding, title menus, names and shortcuts |
| [command-menu-update-continuity](../../tests/command-menu-update-continuity.test.js) | B | Open command menu survives redraw and updates checked state |
| [command-row-host-bindings](../../tests/command-row-host-bindings.test.js) | B | Host chord ownership, ambiguity, dynamic bindings and execution |
| [command-row-shortcuts](../../tests/command-row-shortcuts.test.js) | B | Accessible shortcut metadata and current enabled direct/folded rows |
| [compact-taskbar-popups](../../tests/compact-taskbar-popups.test.js) | B | Popup toggles, ArrowUp, pin context and modified native activation |
| [compact-taskbar-return](../../tests/compact-taskbar-return.test.js) | B | Launcher/taskbar return focus and title toggles |
| [compact-taskbar](../../tests/compact-taskbar.test.js) | B | Narrow taskbar fit, current entry, folding and pin focus |
| [components](../../tests/components.test.js) | M | Catalog schema, source/contract checks and rendered template grammar |
| [consistency](../../tests/consistency.test.js) | B | Tabs, current state, status compatibility and theme control consistency |
| [context-menu](../../tests/context-menu.test.js) | B | Pointer and keyboard context menus, placement and command dispatch |
| [contract-hooks](../../tests/contract-hooks.test.js) | B | Folded anchor placement and public hooks |
| [danger-glyph](../../tests/danger-glyph.test.js) | B | Generated warning glyph and custom icon override |
| [date-authored-relocation](../../tests/date-authored-relocation.test.js) | B | Date source relocation, form association, draft and detach/reinsert |
| [date-nearest-owner](../../tests/date-nearest-owner.test.js) | B | Nested date/time/modal ownership, Escape and reopening |
| [date-observer-dependencies](../../tests/date-observer-dependencies.test.js) | B | First-legend and external-form dependency changes |
| [date-picker-activation](../../tests/date-picker-activation.test.js) | B | Stale rows, refreshed constraints, generations and current activation ownership |
| [date-picker-owner](../../tests/date-picker-owner.test.js) | B | Owner close and relocation without invalid focus return |
| [date-picker-post-close](../../tests/date-picker-post-close.test.js) | B | Post-close and reentrant callbacks preserve the latest activation generation |
| [date-picker-stale-repro](../../tests/date-picker-stale-repro.test.js) | D | Retired 09:30 row cannot overwrite refreshed 10:00 source or emit events |
| [date-pristine-boundaries](../../tests/date-pristine-boundaries.test.js) | B | Quiet rejected empty drafts versus native/custom validation errors |
| [date-pristine-presentation](../../tests/date-pristine-presentation.test.js) | B | Pristine invalid presentation, blur/reset/report and authored errors |
| [date-validation](../../tests/date-validation.test.js) | B | Draft/source validity, constraints, reset, step bases and overnight time ranges |
| [date](../../tests/date.test.js) | B | Date proxy, labels, calendar/time picker, parsing and commits |
| [defaults-links](../../tests/defaults-links.test.js) | B | Default windows, bare URLs and region links inside windows |
| [desktop-menubar](../../tests/desktop-menubar.test.js) | B | Host shortcuts, mnemonics, function keys and field scope |
| [dialog-bands](../../tests/dialog-bands.test.js) | B | Pinned dialog headers/actions, scrolling and separators |
| [diff](../../tests/diff.test.js) | M | Token contrast math plus rendered signs, gutters, tints and selection |
| [disabled-buttons](../../tests/disabled-buttons.test.js) | B | Disabled appearance and behavior across control kinds |
| [dock-overflow](../../tests/dock-overflow.test.js) | B | Dock overflow count, metadata and selection |
| [dock-tab-menu](../../tests/dock-tab-menu.test.js) | B | Clipped dock tab menu visibility and caret |
| [docked](../../tests/docked.test.js) | B | Edge geometry, grips, resize and URL state |
| [doctabs-code](../../tests/doctabs-code.test.js) | B | Document tab roving/deletion and code/editor syntax behavior |
| [expenses](../../tests/expenses.test.js) | B | Sample sorting, filters, paging, bulk actions, CSV and responsive layout |
| [fields](../../tests/fields.test.js) | B | Progress, meter, slider, number, password and avatar semantics/keys |
| [files](../../tests/files.test.js) | B | Folder tree, path, grid and file opening integration |
| [flow-controls](../../tests/flow-controls.test.js) | B | Disclosure, zoom groups and RTL window controls |
| [focus-race](../../tests/focus-race.test.js) | B | Asynchronous window fetch preserves user focus |
| [fonts](../../tests/fonts.test.js) | B | Demand font loading, subsets, shaping and system-font avoidance of downloads |
| [forms-tabs-pages](../../tests/forms-tabs-pages.test.js) | B | Form help/required/invalid states and tab/page styling |
| [general-fixes-combined](../../tests/general-fixes-combined.test.js) | B | Cross-module toolbar/link/value/date-owner integration smoke |
| [grammar](../../tests/grammar.test.js) | B | Native component grammar, placeholder contrast and control geometry |
| [hardening](../../tests/hardening.test.js) | B | Transformed dragging, deferred placement and content isolation |
| [hidden-toggles-titlebar](../../tests/hidden-toggles-titlebar.test.js) | B | Hidden/until-found controls, pressed state and title bar focus |
| [host-launcher](../../tests/host-launcher.test.js) | B | Host catalog, splitter and window studies |
| [launcher-browse-focus](../../tests/launcher-browse-focus.test.js) | B | Touch/API browse focus and mouse search behavior |
| [launcher-escape](../../tests/launcher-escape.test.js) | B | Layered Escape ownership across menus, popups and modals |
| [launcher-feedback](../../tests/launcher-feedback.test.js) | B | Once-only actions, deferred feedback, cancellation and reduced motion |
| [launcher-header](../../tests/launcher-header.test.js) | B | Accessible header, settings URL restore and narrow buttons |
| [launcher-resize](../../tests/launcher-resize.test.js) | B | Bounded popup and splitter resizing |
| [launcher](../../tests/launcher.test.js) | B | Independent instances, pins, disabled actions and destroy/reinitialize |
| [layout](../../tests/layout.test.js) | B | Stack and auto-grid order, gaps and alignment |
| [list-writes](../../tests/list-writes.test.js) | B | No-op list attribute writes, tree keys, insertion and labels |
| [listbox-rich](../../tests/listbox-rich.test.js) | B | Rich rows, groups, checkboxes and native source keyboard behavior |
| [listbox](../../tests/listbox.test.js) | B | Native select proxy, multiselect, labels and keyboard behavior |
| [menu-fit](../../tests/menu-fit.test.js) | B | Zoomed menu content fits without scrolling |
| [menu-open-tracking](../../tests/menu-open-tracking.test.js) | B | Moving openers, scroll, replacement and avoidance of closed-menu scans |
| [menu-title-tip](../../tests/menu-title-tip.test.js) | B | Title tooltip suppression while a menu is open |
| [menubar-application](../../tests/menubar-application.test.js) | B | Host/document menu composition and owner shortcuts |
| [menubar-choices](../../tests/menubar-choices.test.js) | B | Markup choices, opaque values, cancellation and disabled items |
| [menubar-freshness](../../tests/menubar-freshness.test.js) | B | Current commands and numeric identifier string handling |
| [menubar-glyph](../../tests/menubar-glyph.test.js) | B | Pointer/touch glyph toggles, return focus and context menus |
| [menubar-item-icon](../../tests/menubar-item-icon.test.js) | B | Icon projection preserves command words |
| [menubar-launcher](../../tests/menubar-launcher.test.js) | B | Launcher identity/title, keyboard use and canceled host requests |
| [menubar-pins](../../tests/menubar-pins.test.js) | B | Pinned title/groups, layout and overflow |
| [menubar-ribbon](../../tests/menubar-ribbon.test.js) | B | Ribbon tabs, tools and group folding |
| [menubar-site-references](../../tests/menubar-site-references.test.js) | B | Tear-off references, choices, removed sources and ribbon popups |
| [menubar-standard](../../tests/menubar-standard.test.js) | B | Standard identifiers, composition, order and translated headings |
| [menubar-surface](../../tests/menubar-surface.test.js) | B | Menubar button surfaces in both themes |
| [menubar-toggle](../../tests/menubar-toggle.test.js) | B | Click toggle, hover exchange and layout changes |
| [menubar-update-continuity](../../tests/menubar-update-continuity.test.js) | B | Open menus/submenus/ribbon dropdowns survive updates |
| [menubar](../../tests/menubar.test.js) | B | Composition, roving focus, submenus and dispatch |
| [menus](../../tests/menus.test.js) | B | Opening, anchors, upward placement, second press and keyboard behavior |
| [mono-ligatures](../../tests/mono-ligatures.test.js) | B | Characterwise monospace code/editor rendering |
| [native-window](../../tests/native-window.test.js) | B | Native chrome, host state, capabilities, fullscreen, ribbon and RTL |
| [opener-filter-topbar](../../tests/opener-filter-topbar.test.js) | B | Opener placement inheritance, filters and topbar integration |
| [outline-resize](../../tests/outline-resize.test.js) | B | Outline preview, stable content, commit/cancel and placement history |
| [page-patterns](../../tests/page-patterns.test.js) | B | Filters, regions, settings, disclosure, toast and page composition |
| [palette-themes](../../tests/palette-themes.test.js) | W | Generator and pure palette math plus nested rendered palette checks |
| [path-bar](../../tests/path-bar.test.js) | B | Ellipsis, current last segment and overflow/wrap behavior |
| [perf-churn](../../tests/perf-churn.test.js) | B | Unrelated DOM changes avoid PUDL mutations, scans and geometry work |
| [persistent-sidebar](../../tests/persistent-sidebar.test.js) | B | Phone edge grips and persistent sidebar geometry |
| [phone](../../tests/phone.test.js) | B | Narrow sample/reference overflow, topbar wrapping and controls |
| [pinned-section-mockup](../../tests/pinned-section-mockup.test.js) | B | Current pin projection, compact menus, tear-off commands and keyboard behavior |
| [popover](../../tests/popover.test.js) | B | Split-button anchors, native popover placement and activation |
| [reference-links](../../tests/reference-links.test.js) | B | Pointer/keyboard reference navigation, URL/scroll and menu dismissal |
| [regions](../../tests/regions.test.js) | B | Region swaps retain window DOM, state, scroll, focus and form/link behavior |
| [reorder](../../tests/reorder.test.js) | B | Pointer/keyboard reorder, fixed items, events and disabled state |
| [responsive-launcher](../../tests/responsive-launcher.test.js) | B | Desktop/compact sizing, preference/URL, focus and late completion |
| [responsive](../../tests/responsive.test.js) | B | Narrow window and chrome adaptation |
| [restore-meta](../../tests/restore-meta.test.js) | B | Minimize/restore, front window, URL and wrapping metadata |
| [restyle-scope](../../tests/restyle-scope.test.js) | B | Local restyle operation counts, trace scope and status/row updates |
| [ribbon-tab-tips](../../tests/ribbon-tab-tips.test.js) | B | Overflow chooser, tips and focus recovery |
| [row-actions-naming](../../tests/row-actions-naming.test.js) | B | Blank, unresolved, authored and later action labels |
| [row-actions-visible](../../tests/row-actions-visible.test.js) | B | Native Tab/reverse Tab, insertion and disabled/hidden/inert action behavior |
| [row-actions](../../tests/row-actions.test.js) | B | Action geometry, anchors, toggles and touch activation |
| [samples-features](../../tests/samples-features.test.js) | B | Sample listing, minimize/restore and wrapping metadata |
| [seg-menu](../../tests/seg-menu.test.js) | B | Phone segment collapse, choices and native current links |
| [select](../../tests/select.test.js) | B | Native-backed select surface, caret and accessible behavior |
| [shared-docks-edges](../../tests/shared-docks-edges.test.js) | B | Shared edge strips, tab moves, per-edge URL and retained layout |
| [shared-docks](../../tests/shared-docks.test.js) | B | Shared dock selection, slideout and pointer retention |
| [shortcuts-unfocused](../../tests/shortcuts-unfocused.test.js) | B | Front-window command scope without active focus |
| [sidebar-head](../../tests/sidebar-head.test.js) | B | Sticky filter/chips and header fitting |
| [sidebar-side-peek](../../tests/sidebar-side-peek.test.js) | B | End-edge/RTL sidebar collapse and peek |
| [sidebar](../../tests/sidebar.test.js) | B | Sidebar splitter keys, pointer and URL behavior |
| [skin-alloy-bold](../../tests/skin-alloy-bold.test.js) | B | Standard/Alloy Bold palette, title geometry and text contrast |
| [skin-title-chrome](../../tests/skin-title-chrome.test.js) | B | Alloy Bold focus/execution chrome contrast across palettes |
| [skins](../../tests/skins.test.js) | W | Seven nested browser families and static catalogue admission |
| [snap](../../tests/snap.test.js) | B | Snap zones, dragging, hints, API and URL geometry |
| [split-docks](../../tests/split-docks.test.js) | B | Window split dragging and tab transfer |
| [split](../../tests/split.test.js) | B | Splitter role, keyboard/pointer limits and RTL |
| [stack-lifecycle](../../tests/stack-lifecycle.test.js) | B | Popup sizing, long-title caps, status columns and narrow UI |
| [stack-state-chip](../../tests/stack-state-chip.test.js) | B | State chip glyph/color, menu height and names |
| [start](../../tests/start.test.js) | B | Start menu composition and host state |
| [status-area](../../tests/status-area.test.js) | B | Topbar status groups and native popup interaction |
| [status-fold](../../tests/status-fold.test.js) | B | Reserved widths, individual/all folding, live count and focus |
| [stepper](../../tests/stepper.test.js) | B | Done/current/future steps, links and responsive glyphs |
| [tab-rules](../../tests/tab-rules.test.js) | B | Shared tab geometry and current/open rules across ribbon/dock |
| [tabbed-surfaces](../../tests/tabbed-surfaces.test.js) | B | Window/dialog panel sizing, keyboard and current state |
| [tables-notices-keys](../../tests/tables-notices-keys.test.js) | B | Sortable headers, glyphs, notices and keycap grammar |
| [taskbar-arrange-toggle](../../tests/taskbar-arrange-toggle.test.js) | B | Arrange toggle by pointer/keys, outside cancellation and compact mode |
| [taskbar-folding](../../tests/taskbar-folding.test.js) | B | Priority folding, fallback glyphs and authored controls |
| [taskbar-fonts](../../tests/taskbar-fonts.test.js) | B | Late font readiness triggers width remeasurement |
| [taskbar-menu-order](../../tests/taskbar-menu-order.test.js) | B | Stable command ordering and separators across pin/stack/live states |
| [taskbar-pin-commands](../../tests/taskbar-pin-commands.test.js) | B | Pin/unpin command transitions across taskbar and window menus |
| [taskbar-pinned-section](../../tests/taskbar-pinned-section.test.js) | B | Pin references, restore/providers, tear-off focus and narrow layout |
| [taskbar-pins](../../tests/taskbar-pins.test.js) | B | Pin activation, minimize/restore, persistence and no duplicate nodes |
| [taskbar-provider-rows](../../tests/taskbar-provider-rows.test.js) | B | Lazy provider row resolution, caches and stale focused menus |
| [taskbar-providers](../../tests/taskbar-providers.test.js) | B | Dynamic providers, errors, pictures, native navigation and overflow |
| [taskbar-reorder](../../tests/taskbar-reorder.test.js) | B | Draft/committed order, pointer/keys, RTL, history and cancellation |
| [taskbar-row-height](../../tests/taskbar-row-height.test.js) | B | Link and stack-button row height/line-height parity |
| [taskbar-stack-edges](../../tests/taskbar-stack-edges.test.js) | B | Skin/theme/RTL stack paint, hit area, focus, depth, fonts and touch |
| [taskbar-stacks-full](../../tests/taskbar-stacks-full.test.js) | B | Stack thresholds, hysteresis, deferred menu refit and dock widths |
| [taskbar-stacks](../../tests/taskbar-stacks.test.js) | B | Stack membership, aggregate state, pin mirrors, focus and bulk actions |
| [theme-empty-structure](../../tests/theme-empty-structure.test.js) | B | Empty structures, system theme and cross-tab/prepaint state |
| [title-separator](../../tests/title-separator.test.js) | M | Computed title/taskbar separator and static UTF-8 source guards |
| [toast-action](../../tests/toast-action.test.js) | B | Once-only callbacks, sticky actions and dismissal |
| [token-field](../../tests/token-field.test.js) | B | Token chips, keys, separators, custom entry and native values |
| [tokens](../../tests/tokens.test.js) | S | Browser-independent token generator freshness |
| [toolbar-fields](../../tests/toolbar-fields.test.js) | B | Field-native keys versus toolbar roving focus |
| [toolbar-fold](../../tests/toolbar-fold.test.js) | B | Group fold order, overflow menu and width changes |
| [toolbar-linked-ribbon](../../tests/toolbar-linked-ribbon.test.js) | B | Inactive/folded ribbon native segment links |
| [toolbar-linked-segments](../../tests/toolbar-linked-segments.test.js) | B | Native link attributes, modified activation, keys and live current state |
| [toolbar-linked-state](../../tests/toolbar-linked-state.test.js) | B | Dynamic disabled/hidden/current state and delegated focus |
| [toolbar-refit](../../tests/toolbar-refit.test.js) | B | Deferred folding while menus are open and refit on close |
| [toolbar-work](../../tests/toolbar-work.test.js) | B | No-op label work, text invalidation and choice glyph changes |
| [topbar-fitting](../../tests/topbar-fitting.test.js) | B | Intrinsic fitting, hidden/no-script controls and RTL |
| [topbar-tabs](../../tests/topbar-tabs.test.js) | B | Section tab current/open rule |
| [tray-compact-priority](../../tests/tray-compact-priority.test.js) | B | Individual tray compact priority without aggregation |
| [tree-grid](../../tests/tree-grid.test.js) | B | Tree groups, roving, path/grid, glyphs and drop behavior |
| [tree-indent](../../tests/tree-indent.test.js) | B | Host indentation/padding CSS contracts and rendered geometry |
| [win-bar](../../tests/win-bar.test.js) | B | Minimize/restore/close all, taskbar glyphs and toasts |
| [window-api](../../tests/window-api.test.js) | B | Retitle, cancel close, host pane and queued requests |
| [window-focus](../../tests/window-focus.test.js) | B | Raise/focus, autofocus and selection |
| [window-icon](../../tests/window-icon.test.js) | B | Icon propagation/fallback across dock, taskbar and switcher |
| [window-menu-style](../../tests/window-menu-style.test.js) | B | Invoker paint/open state, compact mode and API close |
| [window-menu](../../tests/window-menu.test.js) | B | Current command menus, snap/dock, close and submenus |
| [window-open-result](../../tests/window-open-result.test.js) | B | Async opened/existing/failure results and held request ownership |
| [window-region-runtime](../../tests/window-region-runtime.test.js) | B | Window parameters, region reload, segments and pictures |
| [window-restore-race](../../tests/window-restore-race.test.js) | B | Restore listener placement/state changes preserve latest intent |
| [window-scaling](../../tests/window-scaling.test.js) | B | Operation counts for front/isOpen/serialization on large pages |
| [window-selector-parity](../../tests/window-selector-parity.test.js) | B | Old/new selector CSSOM and computed-style migration parity |
| [window-sharing](../../tests/window-sharing.test.js) | B | Share URLs, clipboard and native workspace history |
| [window-sizing](../../tests/window-sizing.test.js) | B | Content fitting and min/max resize limits |
| [window-stack](../../tests/window-stack.test.js) | B | Canonical order, detached state, edge bands and fragment restore |
| [window-state-presentation](../../tests/window-state-presentation.test.js) | B | Execution state projection across generated surfaces |
| [window-state-title-layout](../../tests/window-state-title-layout.test.js) | B | Folded/compact status chip and title geometry |
| [window-states](../../tests/window-states.test.js) | B | State compatibility, aggregation and frame stability across skins/themes |
| [window-status-detail](../../tests/window-status-detail.test.js) | B | Status detail popover rows and names |
| [window-status-dock](../../tests/window-status-dock.test.js) | B | Hidden-header shared dock status follows state |
| [window-status-region](../../tests/window-status-region.test.js) | B | Named scroll region, Tab behavior and live status rows |
| [window-status](../../tests/window-status.test.js) | B | Title contrast, folding, compact focus and command availability |
| [window-switcher](../../tests/window-switcher.test.js) | B | Recent/back window switching, long notices and disabled rows |
| [window-updates](../../tests/window-updates.test.js) | B | Scoped form/reload requests and placement |
| [windows](../../tests/windows.test.js) | B | Open URLs, drag, stack, focus, back and close |
| [zone-splitters](../../tests/zone-splitters.test.js) | B | Snap grid boundary dragging, limits and named keyboard zones |

## Nested build checks

The two baseline wrappers preserve inherited PUDL_BROWSER/PUDL_MIN/output settings. skins invokes seven browser files with Node test concurrency one. palette-themes first checks generation, then invokes its pure and browser files. The following inventory includes all twelve build/*.test.js files at Rdoc, including static checks already invoked directly by CI.

| Nested file | Actual coverage | Recommended execution |
| --- | --- | --- |
| build/field-enlargement.browser.test.js | Rendered baseline/enlarged fields, text fitting and canvas metrics | Per engine/form through skins |
| build/palette-themes.browser.test.js | Pure complete opaque palette definitions, then rendered category contrast, focus and Glass chrome | Move pure first case once; retain rendered case per engine/form |
| build/palette-themes.test.js | Pure companion palette math across IDs/themes, category/status/accent and simulated color vision | Once per source |
| build/skin-css.browser.test.js | Effective cascade, selection, geometry, host overrides, forced colors and print | Per engine/form through skins |
| build/skin-css.test.js | Deterministic compiler/nonmutation, scope, geometry, materials and invalid inputs | Once per source |
| build/skin-definition.test.js | Bounded schema acceptance, CSS escape/unknown-token and malformed/out-of-domain rejection | Once per source |
| build/skin-gel.browser.test.js | Gel preview geometry, controls and theme screenshots | Per engine/form through skins |
| build/skin-glaze.browser.test.js | Glaze preview geometry, controls and theme screenshots | Per engine/form through skins |
| build/skin-host.browser.test.js | Host-owned appearance and storage access/host-state rules | Per engine/form through skins |
| build/skin-materials.browser.test.js | Three rendered material/forced-color/print/Glass cases and one pure admission case | Keep rendered cases per engine/form; move admission once |
| build/skin-runtime.browser.test.js | Observer/no-op redraw, removal, skin availability, content/focus/history/media/disabled sheets | Per engine/form through skins |
| build/suite-result.test.js | Printed failure overrides zero; process failure/timeout; silent success and harmless prose | Once per source |

The workflow also checks fonts.py --check, skins.js --check --release and minify.js --check. These are source/generated-byte gates and belong once per unchanged revision. They do not replace rendered font, skin or minified asset tests. Reading CSS and injecting it into browser tests is behavior coverage, even when the test uses fs.readFileSync.

## Audit delta and review at 10:03

The lead's first delta preserves the baseline mapping above. tokens.test.js becomes tokens.check.js in required test:static, and date-picker-stale-repro.test.js becomes the opt-in date-picker-stale-repro.js. The browser discovery count becomes 190. The palette wrapper keeps the browser test file, while generation and pure palette tests move to test:static. The pure first case inside palette-themes.browser.test.js and pure admission inside skin-materials.browser.test.js remain candidates for a later small split; they are still reachable now.

Source review of tests/suite-plan.js and build/suite-plan.test.js finds no coverage loss in the current partition helper. The runner sorts before selection; modulo partitions preserve that order, filter first, reject empty selections and reject malformed/unsafe/out-of-range shard identities. The controls compare the union to actual discovered names for two/four shards and filtered selection. Scheduling preserves each suite's contents. The required workflow aggregate still needs to enforce exact revision, engine/form, shard plan, raw/effective child results and nested wrapper completeness; partition arithmetic alone cannot prove execution completeness.

This document was checked against the exact Rdoc Git tree for all 192 table identities. That check reads source and document structure only. Lead-reported static execution is separate from this source-only inventory. No product files, tests, index or Git objects were changed by the inventory work.

## Shard checker handoff

Implementation added tests/verify-shards.js and build/verify-shards.test.js under the subsequent 10:03 assignment. The checker derives the current top-level suite set and uses the reviewed partition helper, requiring eight exact artifact directories and their explicit plans. It checks revision, jobs=1, the 300-second guard, engine/form/shard identity, total suite count, exact aggregate and child identities, successful raw/effective returns and original logs. Missing logs reject; zero-byte originals are permitted for successful silent children. The lead corrected the runner to create those logs exclusively before dispatch.

The checker separately requires all eleven named skins outcomes and both named palette outcomes, completed and passing with no skip/cancel/todo, rather than accepting only wrapper exit zero. It supports the retained TAP shape and Node spec output. A real retained WebKit skin TAP transcript from tests/output/release-01072-receipt-ci-20261115/attempt1/artifacts/output-webkit/ci-webkit/webkit/skins/output.log is embedded in the focused controls, with its source recorded there. Negative controls cover incomplete nested output, wrong identities, duplicate or missing suites, foreign artifacts, revision/form/engine mismatch, altered policy, failed raw/effective returns, printed failures, timeouts and missing originals. The synthetic artifact fixture constructs its partition independently of the production helper.

node --test build/verify-shards.test.js passed two control groups, including their negative variants, in about three seconds locally. The first run exposed a faulty negative fixture that changed only a TAP Subtest comment, leaving the actual outcome unchanged. The fixture now changes both occurrences; the second run passed. No assertion was weakened. No full browser matrix, network request or product mutation ran for this handoff. Independent review of the checker and integrated workflow remains the next action. This is checker-control acceptance only; it does not establish that eight real CI artifacts have passed.
