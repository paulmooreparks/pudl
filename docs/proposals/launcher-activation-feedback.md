# Launcher activation feedback

This proposal records two shared-control findings from content-launcher review. The behavior was approved for implementation on 6 November 2026. Implementation is isolated from the unfinished taskbar-pinning candidate. The updated [launcher contract](../LAUNCHER.md) defines immediate execution and deferred dismissal. The taskbar-pinning candidate remains unreleased.

## Heading spacing

The shared Start heading currently has horizontal padding and no vertical inset. Give `.start-menu .start-heading` `padding-block: var(--space-3) var(--space-2)` while retaining its current horizontal spacing. Verify the heading and count with categories on either side, in narrow layouts, and in both popup and sidebar presentation. This belongs in the shared Start stylesheet.

## Recommended activation policy

An accepted plain destination activation should mark its row with a static selection background for 180 ms. The original action executes synchronously through its existing event and handler. PUDL defers its own popup dismissal until the feedback interval ends. It must not synthesize a second click or defer a host action by default.

The shared controller should expose a documented way for a managed destination to confirm activation and identify its action element. Existing calls to `activated(root)` must remain valid when there is no catalog row, such as a link on the desktop background. Hosts should not need independent timers or click replay to cooperate with dismissal feedback.

The feedback applies to pointer and keyboard activation. Disabled items do nothing. While a row's accepted activation is pending, a second plain destination activation must not execute another action. Auxiliary row actions, filtering and category changes must not be mistaken for destination activation. Modified clicks, middle clicks, downloads and explicit new-context links preserve their native behavior and are excluded from the deferred-dismissal path.

Pinned launchers show the same confirmation without collapsing. Destination activation still clears the temporary intention to return to a popup on unpin. A static background has no animation; reduced-motion preferences must not introduce a flash, fade or repeated pulse.

Explicit close, dismissal, presentation changes and destruction cancel pending feedback and remove its marker. A stale timer must never dismiss a reopened launcher or a newly pinned sidebar. Dismissal must preserve focus that the original destination has already moved into its window or dialog.

## Limits and tradeoff

Immediate execution preserves operations that depend on the original user gesture. It also means a same-tab navigation may replace the document before a visible feedback interval completes. A destination opening a modal may supersede the launcher immediately. The shared contract must state these limits rather than promise a visible 180 ms pause for every destination.

If feedback must finish before execution for a particular operation, that requires an explicit host opt-in for an action safe to defer. Such a policy cannot become the default for arbitrary links or commands, and it must not rely on transient user activation surviving a timer. That extension is outside this recommendation.

## Verification required

Focused tests must observe the selected background while the popup remains open, exactly one synchronous host execution, eventual dismissal, and preserved destination focus. They must cover keyboard activation, disabled and repeated activation, auxiliary actions, pinned presentation, cancellation followed by reopening, native link exclusions and reduced motion in Chromium, Firefox and WebKit. Layout checks must cover the heading and count in both category placements and narrow presentation.

The upstream report includes a beta screenshot and host-side browser evidence. The attachment had changed since sending when reviewed; it now includes its delivery record. The isolated implementation is in the `fix/launcher-feedback` worktree at `C:/Users/paul/source/repos/pudl-launcher-feedback`. It changes the Start stylesheet, launcher controller and host demo adapter. It does not include the taskbar-pinning implementation. Verification results are recorded below.

## Verification checkpoint

All 12 source suite runs and all 12 minified suite runs passed in Chromium, Firefox and WebKit. The batches cover `launcher-feedback`, `launcher`, `host-launcher` and `menubar-launcher`. Evidence is retained under `tests/output/feedback-verified-source/` and `tests/output/feedback-verified-minified/`. The generated distribution passes the minifier freshness check and whitespace checks pass.

The focused tests verify synchronous execution, the dismissal interval, preserved destination focus, rejected and disabled actions, duplicate suppression, pointer and keyboard paths, auxiliary controls, managed header actions, pinned presentation, stale timer cancellation, destruction, native link exclusions, reduced motion and heading padding in both category placements at wide and narrow widths. The existing interactive host scenarios pass after awaiting the new feedback boundary.

Earlier host-demo runs failed because their next interaction assumed immediate dismissal. Those logs remain under `tests/output/feedback-source/`. The tests now wait for the feedback marker to clear before starting another destination interaction. No whole-project matrix or manual assistive-technology check was run. The candidate is committed for review without a release tag or publication.
