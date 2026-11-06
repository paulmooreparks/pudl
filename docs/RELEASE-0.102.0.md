# PUDL 0.102.0

PUDL 0.102.0 adds persistent taskbar destinations, shared pin management in standard menus, optional instance creation and asynchronous command tracking. Hosts supply stable identities, root-window associations, authorization and preference storage. Existing taskbar ordering and window-stack URLs retain their separate meanings. The [taskbar contract](TASKBAR-PINS.md) and [interactive sample](../samples/taskbar-pinning.html) describe the integration.

Window opening and replacement return a completion result after adoption. Concurrent requests for the same loading key share the result. Expected loading failures resolve as data, preserving callers that ignore the return value while allowing hosts to drive failure notification and retry. Independent application readiness remains a host responsibility. Delayed opening preserves a later active-window selection.

The folded launcher action reads Open launcher with a shared app glyph and a documented localized label override. Markup radio menus dispatch a cancelable choice event without requiring inline handlers; [the choice contract](MENU-CHOICES.md) and [example](../samples/markup-menu-choices.html) show host-owned state updates. Automatic skin or theme menu generation remains separate.

Update the window script and stylesheet, menu script and menu-bar script together, or replace the complete distribution. Pin preferences are opt-in and require no migration of existing bookmark stores. The specification remains 0.52.3.

## Verification

The initial candidate passed 33 source and 33 minified focused suite runs across Chromium, Firefox and WebKit, plus six explicit active Window-menu checks. The opening-completion follow-up passed 21 source and 21 minified runs, plus six final source checks of the sample adapter. Tests cover pending and failed opens, retry, instance stacks, ordering, window menus, focus, sharing, complete stack restoration, launcher feedback and markup choices.

Live beta integration verified all 193 assets against the candidate manifest. All three engines verified actual HTTP 503 settlement and retry within a five-second assertion, Terminal initialization readiness, preservation of intervening activation, existing-window results and taskbar regressions. A simulated-clock check verified that a stalled independent initializer clears pending state at the host deadline. The host's .NET suite passed 139 tests with six skips at the initial integration checkpoint.

The earlier public modified-click and cross-tab probe timed out and remains unclaimed. No native desktop or manual assistive-technology verification is claimed. Release preparation checks and publication evidence are recorded below when complete.

Release preparation passed 18 distinct focused source checks across the three engines, with the component inventory correction verified in its own three-run batch. The corresponding 18 minified checks passed. The initial inventory failure remains retained; it exposed a missing machine-readable taskbar-pin entry and mapping, both now corrected. The reference passed Start and launcher interactions with no page errors in both themes. Skin release validation, all 13 build-unit checks, minifier consistency, public-prose provenance and whitespace checks passed.

The first complete CI run exposed an outdated folded launcher expectation and a distinction between DOM focus recovery and explicit window selection. A popup returning focus to its opener must still let its requested window become active. An intervening explicit selection, including reselecting the already-active window, must remain in front. The correction tracks selection separately from popup focus recovery. All 15 focused source regressions passed across the three engines, including the original launcher row marker assertion. The first CI and intermediate failed correction are retained under `tests/output/release-01020-minified-ci.log` and `tests/output/release-01020-menu-correction-source/`.

The corrected assets passed all 144 complete source suites in Chromium and all 144 in Firefox on commit `c3230a5042c2b0eec21e94e6acaae6fd99544a0e`. Generated font validation passed. All 15 focused minified regressions also passed across the three engines, including normal popup focus recovery and intervening selection. The public taskbar and markup-choice samples passed their interactions in both themes, and served assets matched the corrected commit. The release commit changes only this verification record from that tested commit.

The WebKit and minified CI jobs were still installing their browsers at publication preparation. A fully green latest-tip CI run is not claimed. The corresponding focused local checks and the live beta checks passed; the pending CI jobs remain visible in [the full run](https://github.com/paulmooreparks/pudl/actions/runs/42249542545).
