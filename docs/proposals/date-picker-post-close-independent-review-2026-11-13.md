# Independent post-close picker revalidation

## Scoped disposition

The post-close repair passes this scoped independent verification. It closes the previously recorded activation races in the source/minified replay, and no remaining defect was observed in the bounded additional cases or focused regressions. I recommend lead acceptance of this correction for the separate packaging decision. This review preserves the earlier REVISE record and does not authorize packaging or publication.

The held worktree is `C:/Users/paul/source/repos/pudl-date-picker-fixes`, branch `fix/date-picker-activation`. Source SHA256 is `db9b1f24dffce54dbb874d9233eb3372ef4ca1969b9e91cc8cb8e654c9073dcf`; minified source is `550f6697f2c4f45b8332c66c8fa244e62afafd37142f3e9970ac0df7ed386bbd`; map is `6ef1ddf9d8ddac514210e48b6ca6b2fe68d8b7668a6031327f3162d8eb95386c`. All entries in the final held manifest matched independent measurement before execution.

Evidence is retained under `tests/output/verification-picker-post-close-20261113-2235`. Earlier scripts, captures, failure aggregates and frozen packages remain untouched.

## Unchanged independent replay

The collector is byte-identical to the previous completed independent collector, SHA256 `3566698fc6071d46223c5a815703c7d712474bbf9108d80ceb5a5ab752396d6f`. It uses separate output and captures. It completed 27 expected observations with terminal exit 0 and zero failures.

| Group | Observations | Meaning |
| --- | --- | --- |
| Frozen date control | 3 | The immutable old source still commits `09:30` below a refreshed `10:00` minimum. |
| Original candidate stale-row closure | 6 | Source/minified forms retain refreshed source/query/echo with no value events when the retired callback runs. |
| Post-close and focus-return repair | 18 | Date/time close and date focus-return callbacks supersede the old attempt in all three engines and both forms. |

Frozen control PASS lines indicate successful reproduction of a known defect. They do not certify the old product. The 18 repaired observations preserve the source, query and echo established by the host callback and emit zero `input` or `change` events. Prior red evidence remains in `verification-picker-activation-20261113-2220` and its historical review.

## Additional independent cases

The new `additional.cjs` uses an isolated loopback server and actual native picker actions. Its SHA256 is `5376097851abb275f6ec4f179ef7f9fbc495cc073cbbc78826214493d54b6bd1`. Seven scenarios run in source/minified forms across Chromium, Firefox and WebKit, for 42 cases. All pass with terminal exit 0 and zero captured page errors.

| Scenario | Observed result |
| --- | --- |
| Date focus callback opens a new picker and selects January 21 | The newer valid activation commits once, with one input/change pair; the older January 12 attempt cannot overwrite it. |
| Time close callback invokes a newly disabled row | The newer refused activation invalidates the older ticket; the source remains `09:00` with no events. |
| Time close callback moves the complete source/proxy/echo cluster into another form | The old attempt refuses even though source parent identity remains unchanged; form identity changes to the new form. |
| Host change listener sets `12:00` and refreshes | The accepted change emits its normal pair, and the newer source/query/echo remain `12:00`. |
| Host input listener moves the complete cluster, sets `11:00` and refreshes | The newer form and source/query/echo survive; no old post-event bookkeeping overwrites them. |
| Date Clear focus callback sets required without refresh | Clear refuses and retains the existing date with no value events. |
| Ordinary valid Clear | The source becomes empty and emits one input/change pair. |

The two post-commit cases distinguish a valid source write from later host authority. They require no rollback and do not suppress the accepted notification pair. Form movement here preserves the generated cluster; it independently complements supplied tests that move only the source and then check stale placement.

## Source assessment

The implementation separates open-row eligibility from proposal eligibility after intentional closing. An activation ticket captures serial, generation, source value, refresh hook, parent, form, containing surface and current constraint attributes. A newer activation advances the serial even when refused. This prevents an older attempt from resuming over a newer interaction.

Date choice, time choice and Clear all use that ticket. Close rechecks after native `hidePopover()`, before focus return and after focus return. The final `commit(v,ticket)` performs another authority check immediately before generation advance and source assignment. Post-close checks deliberately do not require an open panel or connected row, since normal closing changes those conditions.

Current authority includes semantic required/min/max/step/base/overnight constraints, effective disabled and readonly state, source connection, source/proxy/echo adjacency, current form association, instance marker/refresh hook, containing owner identity and availability, inertness and rendered field visibility. Attribute fingerprints invalidate changed constraints even without observer delivery. A host refresh invalidates generation; a source value change invalidates the captured value. The supplied focused tests exercise no-refresh constraints, disabled/readonly/fieldset/inert, detach/reparent, form reassociation, instance invalidation and source changes for both date and time.

The accepted write still happens before source `input` and `change`. `commit()` has no state-writing continuation after the notification pair. The independent post-event cases confirm that a host's refreshed source and feedback remain authoritative. The candidate has no public disposal API; supplied instance-marker invalidation models stale-instance refusal, without claiming an invented disposal method. Full calendar reconciliation and the proposed focus/autofocus API remain outside scope.

## Regression gate and limitations

The focused regression command is `node tests/run.js chromium firefox webkit date-picker date-authored-relocation date-nearest-owner date-validation date.test`. Each form ran serially with `PUDL_JOBS=1`, checked ports 8915/8916 and fresh output; the minified run additionally set `PUDL_MIN=1`. Source passed 24/24 suite executions in 91 seconds. Minified passed 24/24 in 99 seconds. Both terminals exited 0; all 48 individual records have raw/effective exit 0, with no printed failures or timeouts. `regression-audit.json` records the independent complete-log accounting.

Chromium 153.0.8010.12 and Firefox 155.0 use effective native date/time types in these probes. WebKit 26.6 uses effective text fallback. Semantic checks and refusal behavior pass on that fallback independently of native validity. Native fractional-step, direct-source reporting and documented host-refresh limits remain, as do the separate calendar focus-reconciliation proposal and original failed evidence.

This evidence establishes bounded regression closure. It does not prove arbitrary host script, physical touch, screen-reader speech, OS keyboard ownership or a future focus API. No delivered archive, consumer file, runtime or existing test was edited by Verification.

All 16 held manifest entries independently match before and after execution. The candidate source/min/map and existing tests remain unchanged. `held-before.json`, `held-after.json`, `probe-audit.json`, `provenance.json` and `cleanup.json` retain the checks. All owned runners, browsers and loopback servers exited; no matching owned Node process or listener on 8915/8916 remains. Execution ownership is returned to the lead with this scoped PASS recommendation and its stated limits.
