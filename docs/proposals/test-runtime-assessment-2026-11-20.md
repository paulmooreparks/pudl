# Retained test runtime and sharding assessment

Build and Release prepared this assessment for assignments 11037, 11038 and 11039 on 20 November 2026. The audited checkout is documentation commit `8d8430a9f9cab57694856b3655616f8df1ccae16`. Only this document was written. No browser experiment, workflow dispatch, release operation or test deletion ran.

## Recommendation

Start with two isolated hosted runners per browser/form, retaining `PUDL_JOBS=1` inside every shard and the existing nested skin serialization. Use a deterministic, disjoint suite partition and a required aggregate check. Compare the first complete hosted execution against the retained baseline before adopting four shards. Raising same-machine worker count is a separate experiment with weaker relevance to this proposal.

The retained documentation run predicts a reduction from about 20m20s to 10m29s for the longest job with two balanced shards. Four balanced shards predict about 7m38s when the observed slow minified installation repeats. These are scheduling estimates, not measured improvements or evidence that parallel execution is safe. Runner availability, queue delay, changed setup time and contention can erase the gain.

## Evidence and measurement scope

All paths below are relative to `C:/Users/paul/source/repos/pudl`, where original evidence remains preserved. The audit worktree does not contain copies of these artifacts.

| Retained source | Use |
|---|---|
| `tests/output/row-actions-01081-documentation-same-attempt-once-20261120/data/artifact-14575983791/ci-chromium/results.json` | 192 original source Chromium suite timings |
| Same data root, `artifact-14577631649/ci-minified/results.json` | 192 original minified Chromium suite timings |
| Same data root, `artifact-14578950399/ci-firefox/results.json` | 192 original Firefox suite timings |
| Same data root, `artifact-14578995454/ci-webkit/results.json` | 192 original WebKit suite timings |
| Same data root, `operation-0040/body.bin` | Original five-job metadata, step start/end times and job identities |
| `tests/output/row-actions-01081-first-tag-ci-once-20261119/data/artifact-*/ci-*/results.json` | Independent timing comparison at release H |
| `tests/output/row-actions-01081-canonical-acquisition-pr-version-once-20261119/data/artifact-*/ci-*/results.json` | Earlier main timing comparison at release H |
| `tests/run.js`, `tests/skins.test.js`, `.github/workflows/test.yml`, `docs/RELEASE-0.105.0.md` at the audited checkout | Scheduling, nested work, setup and serial-gate rationale |

Documentation Tests run `44620069563`, attempt one, used four separate Ubuntu runners with 192 suites each, `jobs=1` and a 300-second suite timeout. Each retained `secs` includes the child Node/browser lifetime observed by the runner. Summing those values measures serial suite work; it does not measure human effort. GitHub timestamps have one-second precision. Job duration includes setup and finalization but excludes any delay before `started_at`.

| Browser/form | Main suite sum | Tag suite sum | Documentation suite sum | Documentation job duration | Job duration less suite sum |
|---|---:|---:|---:|---:|---:|
| Chromium source | 498.289s | 551.734s | 570.466s | 603s | 32.534s |
| Chromium minified | 569.790s | 571.638s | 467.455s | 809s | 341.545s |
| Firefox source | 790.406s | 856.842s | 901.849s | 933s | 31.151s |
| WebKit source | 1164.966s | 1035.958s | 1182.889s | 1220s | 37.111s |

The documentation suite sum across all four forms is 3122.659s, or 52m03s of serial child work. These jobs already overlap. Their sums must not be added to claim a 52-minute workflow critical path. All five jobs started at 21:34:12Z or 21:34:13Z on 19 November; WebKit finished last at 21:54:32Z. Its observed job span was 20m20s. The generated-font job lasted 196s, including a 177s font check, and was outside this critical path.

The source browser jobs installed their selected Playwright browser in 21s, 17s and 28s respectively. The minified job spent 315s installing Chromium, then 467s in its runner step. This one retained installation is a material sensitivity, not a stable setup constant or an established diagnosis. The build skin freshness, build unit tests and minifier checks in that job each occupied at most one displayed second. Removing them cannot explain a multi-minute gain in this run. All five job durations sum to 3761s, or 62m41s of runner occupancy before billing rounding; this is distinct from elapsed workflow time.

## Long suites and nested work

| Browser/form | Longest outer suite | Duration | `skins.test.js` duration |
|---|---|---:|---:|
| Chromium source | `axe.test.js` | 25.375s | 17.300s |
| Chromium minified | `axe.test.js` | 19.958s | 13.339s |
| Firefox source | `axe.test.js` | 29.494s | 28.899s |
| WebKit source | `taskbar-row-height.test.js` | 52.522s | 26.280s |

WebKit's next longest suites were `taskbar-stacks-full.test.js` (41.182s), `taskbar-stack-edges.test.js` (34.491s) and `axe.test.js` (32.767s). Its ten longest suites consumed 309.120s, 26.1% of the total. A balanced partition helps; deleting a few fast checks cannot provide the proposed halving of wall time.

`tests/skins.test.js` launches seven build browser files with `node --test --test-concurrency=1`. That whole outer suite remains an indivisible shard task. The retained WebKit `webkit/skins/output.log` reports 11 nested outcomes and 26.218s total TAP time. Its material-skins live-content subtest consumed 11.647s, followed by Glass at 5.358s. The outer measurement was 26.280s. Firefox's 28.899s was the longest retained documentation skin wrapper, below the 52.522s WebKit outer-suite floor. There is no runtime argument here for changing nested concurrency or weakening skin coverage.

## Two-shard and four-shard estimates

For each browser/form separately, I sorted suites by descending retained duration with suite-name tie breaking, then assigned each suite to the currently least-loaded shard. The numbers below are maximum shard loads. A simpler alternative assigns sorted suite names round-robin. Both retain all 192 outer suites; no suite is split. Neither simulation executes tests.

| Browser/form | Two balanced shards | Four balanced shards | Two name-round-robin shards | Four name-round-robin shards |
|---|---:|---:|---:|---:|
| Chromium source | 285.25s | 142.63s | 285.58s | 173.85s |
| Chromium minified | 233.90s | 116.88s | 235.26s | 144.17s |
| Firefox source | 451.79s | 226.70s | 451.26s | 255.07s |
| WebKit source | 591.80s | 295.76s | 608.06s | 334.91s |

Adding each form's observed non-suite job duration to its maximum balanced load gives an estimated critical path of 628.91s for two shards and 458.43s for four. Name-round-robin predicts 645.17s and 485.72s respectively. Thus two simple shards are already close to the balanced estimate; a new timing database is unnecessary for the first change. The four-shard estimate is limited by the minified setup observation. With 37s setup for every form, four balanced shards would instead predict roughly 333s. That is only a sensitivity calculation.

If every extra shard repeats the same setup/finalization cost, balanced two-shard occupancy becomes about 4203s (70m03s), and four-shard occupancy about 5088s (84m48s), including the unchanged font job. This buys elapsed-time reduction with more runners and repeated setup. It assumes enough hosted capacity to start eight or sixteen browser/form jobs together; capacity and queue effects have not been measured. A measured hosted comparison must report queue time separately from setup, suite work, finalization and total elapsed time.

## Isolation and completeness requirements

The release 0.105.0 record explicitly retained two parallel WebKit attempts with tooltip/focus/scroll failures and unassigned causes. Focused serial passes established non-reproduction only. Keeping one worker per runner preserves the relevant serial execution condition while moving independent partitions onto separate machines. That is a reason to prefer isolated sharding; it is not proof that every shard order is harmless.

The current runner owns one static server, defaults to port 8765, spawns a separate child for each suite, and can place logs/screenshots under a fresh `PUDL_RUN_OUTPUT`. The skin wrapper passes the environment through its serial nested children. Separate hosted checkouts isolate fixed ports, generated files, screenshots and process trees across shards. Same-machine runner invocations would additionally need distinct ports, output paths and verified ownership. Increasing `PUDL_JOBS` within one invocation does not provide that isolation.

The lead's sharding change should meet these conditions before acceptance:

- Every shard retains `PUDL_JOBS=1`, unchanged assertions, failure classification and timeout policy.
- Every shard records commit, browser/form, partition identity and the full expected suite list, with unique artifact and output names.
- A required summary runs after all shard dispositions, rejects failed/cancelled/missing shards and checks exact expected suite identity coverage, including duplicates, omissions, foreign rows and per-row failures.
- The summary verifies nested skin results and raw failure output as well as aggregate exit codes; a missing artifact cannot become a skipped success.
- The partition is deterministic from the complete suite list, so substring filters cannot silently select extra suites or omit similarly named suites.
- Generated-font and build/minifier checks remain represented once in the required gate, with ownership for static deduplication taken from the independent coverage assessment.

The current workflow uses `if-no-files-found: ignore` for artifact upload. A new required summary must independently reject absent evidence even when upload itself returns success. The current runner's substring OR filters are useful for a small probe, but they are insufficient as an exact shard manifest contract without explicit enumeration checks.

## Bounded experiment and present limit

A representative supplementary Windows probe can use WebKit `axe.test.js` and `skins.test.js`, whose retained combined outer duration was 59.047 seconds. Enumerate the two exact suites before execution and do not expand the selection. Run once at jobs one and once at jobs two, in fresh outputs on distinct new ports, without overlapping another browser owner. Preserve original output and failures, compare expected identities and stop after either condition's failure or uncertain cleanup. Do not change waits or retry a failed condition. Node 24.4.1 locally versus CI Node 22 must be recorded.

No such probe ran during this assessment. Lead message 11041 identified `tests/output/row-actions-01081-two-root-preparation-20261119/owned_job.py` and `rendered.py`. Inspection confirms creation-time Windows job containment, but the reviewed entry's fixed plan, prerequisites, port checks and factory belong to the historical release experiment. It is not an audit command or a global browser-ownership acquisition. Adapting its sealed driver and establishing exclusive current browser ownership would exceed a bare invocation of the current runner. Per the lead's instruction, I did not add that driver or start a new process framework. The runner's ordinary `child.kill()` timeout alone does not demonstrate descendant cleanup.

The decisive benchmark remains the first complete hosted two-shard gate at one unchanged revision. It should retain all original rows and raw logs, compare coverage against the expected manifest, and report measured job/queue/setup totals. A local jobs-two pass would be supplementary and could not validate hosted sharding performance. This assessment supplies a prediction and a bounded validation plan; it supplies no new execution acceptance.
