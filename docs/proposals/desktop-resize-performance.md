# Desktop tab discovery and resize performance

Paul reported slow restore and resize behavior in Dinah Desktop on 24 October 2026. The attached desktop contains several long chat histories, dock strips, a ribbon, side panels and a taskbar. The screenshot establishes the workload but cannot identify the expensive browser tasks.

## Tab discovery

Every menu title and ribbon tab keeps its full title as a tooltip through every folding stage. PUDL's tooltip script shows it after hover and immediately on keyboard focus. A native title supplies a mouse fallback when that script is absent. Glyph-only tabs retain their accessible names.

Touch users need a visible labeled route. The implemented Ribbon tabs chooser lists every available tab by its full name and identifies the selected tab. Choosing an entry selects that ribbon tab. The chooser is reachable from keyboard and touch, without a long-press gesture or a first tap that only explains a tab. It appears beside the tools in a menu-bar ribbon and beside the tabs in a standalone ribbon. Down Arrow opens it from keyboard focus, and Escape closes it and returns focus. Existing menu mode remains an alternative with labeled commands.

## Resize measurement

A Chromium stress test uses the split-dock fixture with 600 message sections per window across five mounted windows. Four windows occupy split side docks. Each section contains a heading, wrapping paragraphs and a command block. The test changes the viewport through 24 sizes and reads Chromium's documented performance counters. This synthetic workload is reproducible but does not reproduce Dinah's native host, content updates or installed build.

| Treatment | Layout time | Style time | Script time | Wall time |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 1,437 ms | 338 ms | 84 ms | 3,028 ms |
| Layout and style containment on window bodies | 1,585 ms | 388 ms | 97 ms | 3,362 ms |
| Off-screen message rendering skipped, with containment retained | 202 ms | 236 ms | 84 ms | 906 ms |

These are one run's measurements, not a performance guarantee. Run `tests/perf/resize-desktop.cjs` with `PUDL_ROOT` pointing to a static server for this checkout. The third treatment adds `content-visibility: auto` and `contain-intrinsic-size: auto 200px` to message sections. The estimated height is specific to this benchmark and must not become a library default.

## Proposed work

Dinah should first profile its installed build during restore and a continuous resize, with representative long histories and background message updates. Separate layout, style, paint, script and native-host time. Record long tasks and forced-layout call stacks. Browser benchmark results do not establish the cause of native-host delays.

The first application experiment should skip rendering off-screen message sections while retaining their DOM nodes. Message-level `content-visibility: auto` can reduce layout work without removing history from the accessibility tree. Pair it with remembered intrinsic sizes and a measured initial estimate. Verify scroll anchoring, streaming messages, browser Find, selection and copying across messages, keyboard focus, links, images, code blocks, printing and accessibility before enabling it. Do not apply it indiscriminately to complete window frames or size-by-content windows.

PUDL's folding code also deserves a trace. It resets fold stages and measures successive layouts as the width changes. Cache stable measurements where a trace shows repeated work, batch reads before writes, and avoid recomputing toolbar structure during a geometry-only change. Pointer resizing already schedules at most one pending animation-frame callback; adding another throttle alone does not remove the layout cost.

PUDL now offers opt-in outline resizing with `data-win-resize-mode="outline"` on the window layer. A window can override the layer with `outline` or `live` for its own frame and outer dock edge. Shared dock-pane dividers and snapped-window grid dividers use the layer setting. The outline follows the pointer while content keeps its previous size, then the new bounds apply once on release. Escape and pointer cancellation discard the preview without a history entry; release commits one entry. Keyboard resizing remains immediate. The split-docks sample has an Outline resize toggle. This option cannot solve native operating-system window resizing by itself.

Dock-pane divider pointer updates now run through one pending animation-frame callback, including the default live mode. This removes repeated redraws between frames without changing final pointer coordinates.

The Dinah Development chat owns the application-specific profiling and message-rendering changes. Its application fix is committed as `d7a3182` in the Studio repository and reported installed; the installed process needs restart. I verified the commit exists. PUDL's source remains independent of chat content, and no PUDL release or vendor change is part of that application commit.

Dinah's correctness tests found that unrestricted off-screen rendering broke exact persisted reading-position restoration. Its application fix keeps full layout for a log restored into scrollback or replaced while the reader is above the end, using `data-preserve-scroll-layout`. Jump to End removes that exception. Print disables off-screen skipping. This exception is application policy and does not belong in PUDL's generic window library.

Dinah Development reports alternating renderer resize measurements of 6.183 and 6.344 seconds before the message change versus 3.314 and 3.719 seconds afterward. Restore measurements show no improvement. These runs use four real histories, about 177,397 DOM nodes and 21,034 rows in an authenticated Edge renderer with the native saved-conversation API. They do not measure native WebView2 composition or active provider costs. The transcript exclusion from generic scroll discovery removed a sampled application hotspot, but startup remains unresolved. These application measurements and installation status are attributed to Dinah Development, not independently reproduced here.

## Local verification

Release checks also exposed readiness races in existing date and font tests. Date tests now await each delivered DOM wheel event before sending another input or inspecting the result. Font demand-loading probes force layout of the current text before awaiting the font set's readiness. Their behavioral assertions remain unchanged; no production date handler or font asset was changed. The targeted Firefox date and WebKit font suites pass with these explicit readiness checks.

The larger selector benchmark in `tests/perf/selector-resize.cjs` creates 21,000 synthetic rows and 189,118 DOM elements, settles insertion work, then instruments selectors across 24 viewport sizes. With only `pudl-menu.js` substituted from tag 0.83.1, the open-menu discovery query ran 46 times and consumed about 314.2 ms. With the local tracked-panel implementation, that query ran zero times. The largest remaining selector aggregates in this fixture were about 0.3 ms each. The fixture has no application ribbon, provider updates or native host, so it cannot establish that all remaining Dinah selector costs are outside PUDL. The instrumentation also perturbs execution; it is for caller attribution rather than unbiased wall-time comparisons.

Run with `PUDL_ROOT` pointing to the checkout server. Add `--baseline-menu` to substitute the tagged menu script without changing source files. Use the same checkout and workload for both runs. This isolates the menu script but does not provide alternating statistical trials.

A subsequent selector probe identified a full-document query in `pudl-menu.js` on each window or visual-viewport resize and scroll event: `.menu-panel:popover-open, .popover:popover-open`. In a synthetic 3,000-message page, 46 calls consumed about 12.2 ms of selector time. PUDL now tracks open panels through popover lifecycle events instead. The same probe made no calls to that selector after the change. This removes unnecessary work but does not attribute Dinah's reported 1.5 to 1.7 seconds of native selector time to this function. Menu positioning, scrolling, close and removal checks pass across Chromium, Firefox and WebKit.

The focused command-bar, ribbon-discovery, outline-resize, split-dock and grid-divider suites pass all 15 engine/suite runs on Windows and all 15 on Linux. Linux uses the minified assets. Checks cover unchanged content geometry during an outline drag, release, Back, Escape, per-window live overrides, all four outer dock edges, internal dock dividers, snapped-window grid dividers, hover and keyboard tips, touch activation and the selected-tab mark. A live-divider test now waits for its animation-frame update rather than assuming it completed inside the pointer event.

The sample was inspected visually with its chooser open. At widths of 800px and 380px the menu-bar ribbon falls back to its labeled menu presentation without document overflow. A broader Windows run timed out in the Firefox desktop keyboard suite; that suite passed in isolation with minified assets. Two other assertions from that run were resolved by correcting the outline test's covered hit point and awaiting the coalesced live-divider update.

## References

The documented behavior of [content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/content-visibility) permits skipping off-screen layout and paint while retaining content in the DOM and accessibility tree. [CSS containment](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Using) changes layout and painting boundaries, so its effects require checks beyond a timing improvement.
