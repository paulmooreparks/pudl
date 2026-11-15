# Independent stale-picker correction review

## Disposition

The held candidate requires revision. It closes the original stale-row defect, but an activation can still overwrite newer host state after synchronous picker-close or date focus-return callbacks. This remaining failure reproduces in source and minified forms across Chromium, Firefox and WebKit. Packaging remains blocked pending lead disposition.

This review covers `pudl-date-picker-fixes`, branch `fix/date-picker-activation`, against the frozen corrected date overlay. Candidate source SHA256 is `46abbb3a5e3748dea50103963d3409ee8124e5877d1d308dcfaa1d6e6e458bbf`; minified source is `5d3d594b24d5c1fa2baa542ba155912a0705db3783d8b46c4cc3b7ea3fc8c72d`; map is `b114001689839cb5aa6ef9f83919bfd2927809df8300915d27fb2cfb2b3b93cb`. The complete held manifest and incremental diff were independently checked before execution and copied to `tests/output/verification-picker-activation-20261113-2220`.

## Original defect and closure

The original observational probe remains untouched. Its frozen date source is `025aaa26e149911691f56d9e2da72f800445612e299a501942eb402bccd74471`. In a separately served control, open a time source at `09:00`, retain the `09:30` node, set source value and minimum to `10:00`, call public refresh, and invoke the retained node. All three frozen controls still commit `09:30` and emit `input` then `change`.

The candidate adaptation deliberately retains the old node before refresh and invokes its actual listener using `old.click()`. It does not wait for the removed row through the original locator. Source and minified candidate both retain `10:00`, its refreshed query/echo and zero value events in all three engines. These six closure observations are separate from the three intentionally defective controls and the later failures.

## Remaining synchronous callback race

For time, open the ordinary picker at `09:00`. Add a one-shot `beforetoggle` listener to its panel. When closing begins, the listener changes the authored minimum to `10:00` and calls `pudlDate.refresh(source)`. Click the ordinary `09:30` row with Playwright's actual pointer action.

The candidate first approves the row, then calls `close(false)`. Native `hidePopover()` synchronously invokes the host listener. Refresh updates generation and query/echo under the new minimum. The old activation then resumes and commits `09:30`, overwriting the refreshed query/echo and emitting one `input` followed by one `change`.

The same path exists for calendar selection. Begin with source `2027-01-11`, click January 12, and change minimum to January 15 plus refresh in the panel's close listener. The old activation still writes January 12. A separate date case performs the same host update from the query's focus listener during `close(true)`; it also resumes the stale commitment.

| Case | Source observations | Minified observations | Result |
| --- | --- | --- | --- |
| Time close listener | 3 failures | 3 failures | `09:30` commits below `10:00` |
| Date close listener | 3 failures | 3 failures | January 12 commits below January 15 |
| Date focus-return listener | 3 failures | 3 failures | January 12 commits below January 15 |

Chromium 153.0.8010.12 and Firefox 155.0 report native invalidity after these writes. WebKit 26.6 uses effective text inputs for authored date/time and reports native validity, but the semantic minimum is violated in every case. The evidence records source, minimum, authored/effective type, native validity, query, echo, event sequence and hook count. Each host callback fired once. These are real native popover/focus events and actual pointer actions, with deliberate host mutations to expose the race.

The source mechanism is bounded. `pickerAllowed()` checks authority before `close()`, but both date/time selection and date Clear continue to `commit()` after close/focus work. `commit()` increments generation, writes source and emits events without checking whether that earlier activation was superseded. Row reconciliation and the pre-close guard cannot cover this later boundary.

## Required correction

Capture an activation ticket before close, including the instance generation and source identity. Immediately before source mutation, after all synchronous host-visible close/focus callbacks, reject a superseded activation. Recheck current semantic constraints, effective locks, connection/coherent placement, form and available containing owner. The post-close eligibility check must not require the picker still to be open or its row still connected, because ordinary close changes those conditions itself.

Refusal must preserve whatever source/query/echo the host callback established and emit no source value events. Apply the rule consistently to date rows, time rows and calendar Clear. Cover nested reentrant activation, disable/detach/reparent and owner closure, without reopening an owner or adding delayed retries. A valid accepted commit still writes its source before its normal `input`/`change`; a host listener acting after that write must not cause retroactive rollback.

No full calendar reconciliation, autofocus transfer or new focus API is required for this correction. Those remain separate contract work.

## Evidence accounting and limits

The completed independent collector has 27 records. Three controls confirm the frozen defect, six candidate observations confirm original closure, and 18 candidate observations fail the new refusal requirement. Its terminal exit is 1. The collector's PASS lines for frozen controls mean reproduction matched the known defect; they do not mean the frozen product passed.

The first collector attempt stopped after its Chromium records because its static server tried to read a directory for an unrelated resource path, producing `EISDIR` and terminal exit 1. Its script, log and captures remain retained. The second attempt changes only server file checking and uses separate capture/output paths; it completes the same assertions in all engines. No assertion, wait or candidate was changed to obtain a different result.

The existing candidate tests cover pre-activation constraints, captured stale callbacks, retained disabled active options, navigation and fresh valid selection, min/max/step/overnight, effective lock/first-legend/form/connection states and capture-phase refresh. Their passing results cannot close a host callback that occurs later inside close/focus.

The independently run focused regressions passed 21/21 source suite executions in 70 seconds and 21/21 minified suite executions in 71 seconds. Both terminals exited 0. All 42 individual result records have raw and effective exit 0, with zero printed failures and timeouts. The serial command was `node tests/run.js chromium firefox webkit date-picker date-authored-relocation date-nearest-owner date-validation date.test`, using `PUDL_JOBS=1`, checked ports 8911/8912 and separate output directories; the latter form used `PUDL_MIN=1`. These include all matching activation, stale-repro, owner, nearest-owner, relocation, validation and date suites. `regression-audit.json` records exact accounting. Passing these suites does not override the independent collector's exit 1 and 18 failures.

The source review supports stable time-value row IDs, identity reuse and chronological insertion of a retained disabled active row, with query focus and scroll preserved by reconciliation. Date calendar body replacement remains outside this correction. Native fractional-step and effective-text capability limits, direct-source reporting and documented host-refresh requirements remain. No screen-reader, physical touch or OS focus claim follows from this work.

The new independent race probe specifically varies constraints and refresh during close/focus. It does not exhaust every post-check disable, detachment, reparenting, form change or reentrant activation permutation. Those are required follow-up ticket checks for the correction; existing pre-check coverage cannot establish their post-callback safety.

All 15 held manifest entries still match after execution, including runtime, generated files, documentation, existing tests and fixtures. `held-before.json` and `held-after.json` retain independent measurements. No runtime or existing test was edited. All owned runners and probe browsers/servers exited; no matching owned Node process or listener on 8911/8912 remains. `cleanup.json` records the final check. Execution ownership is returned to the lead with this REVISE finding, with no packaging, release or installation performed.
