# Provider and picture beta candidate

The implementation is accepted for PUDL 0.103.0. Publication is authorized. Earlier candidate checkpoints below retain their original verification and hold conditions; consumer production promotion remains separate. The supported contract is [TASKBAR-PINS.md](../TASKBAR-PINS.md).

## Accepted beta candidate for taskbar menu ordering

The accepted frozen candidate is `providers-21c2ce57949f`, following the menu-order regression reported in message 5290. It supersedes `providers-243eb522365d` for beta integration and retains base commit `4e14a198a0816eb65ac15cd547277d8f382614b4`. The beta owner accepted it after real-host verification in message 5292. At that checkpoint, commits, publication and production promotion were paused.

The deployed host build is `providers-21c2ce57949f-4681a789513f`, retaining server image `sha256:e3e7777ed2ec570fa3c288d6e46cd40c13e70a18db9f4df7a3a600835b3eebc5`. The owner reports all 565 archive files and 193 source/deployed assets matching the manifest. All 15 fresh host runs pass across Chromium, Firefox and WebKit for menu order, launcher-row pins, taskbar pins, categories and window ordering. The original WinDragSens regression passes with separator groups and ordered labels stable through Pin/Unpin. Ordinary/pinned live updates, dormant revalidation and ordinary/pinned Terminal stacks pass. Evidence is retained under the host's `.local/beta/providers-21c2ce57949f/` directory.

The attached real-host regression source was reviewed. Its dormant revalidation check reopens the menu if a pending provider lookup replaces its link; menu retention during revalidation is not claimed. The earlier WebKit real-site modified-link and manual assistive-technology limits remain unchanged. Production was verified unchanged by the beta owner. This accepts the frozen taskbar correction; subsequent launcher-header authoring changes below are separate working-tree changes and are not in that archive.

### Launcher header authoring follow-up

Paul requested removal of the repeated launcher title and guidance for useful header actions. The shared controller already supports an accessible name without a visible heading. The working examples now omit the redundant heading, preserve an explicit accessible catalog name, and provide a real Settings destination using PUDL's window control and theme select. The default Start component template also omits its redundant heading. No automatic removal of host-authored content or new account/quit implementation is introduced.

The launcher guide recommends Settings with Sign In or Account for web hosts, and Settings with Quit plus the application name for native desktop hosts, including Quit Dinah. It also covers account-free content, suites and shared-session hosts, optional actions, permission/unsaved-work safeguards and narrow layouts. These authoring changes are included in 0.103.0; no consumer deployment is performed by the shared owner. Their focused source checks and screenshots are retained under `tests/output/launcher-header-readable-20261107/`.

The artifacts are in `C:/Users/paul/source/repos/pudl-taskbar-pins/tests/output/taskbar-menu-order-beta-handoff-20261107/`. Bus-shareable copies are in `C:/Users/paul/source/repos/pudl/tests/output/taskbar-menu-order-beta-handoff-20261107-21c2ce57949f/`.

| Artifact | Value |
| --- | --- |
| Archive | `pudl-taskbar-providers-21c2ce57949f.zip` |
| Archive size | 7,200,498 bytes |
| Archive SHA-256 | `73072605fc1668a3c6d47e9d517c3309927b1e2e838ec976d51a35fc445bdc76` |
| Source snapshot SHA-256 | `21c2ce57949f8c73d2aacf0ef556e6565496276fc65840442ba0845a927ec37b` |
| Patch | `providers-21c2ce57949f.patch` |
| Patch SHA-256 | `4788fc0310e8998a16fccf3a3667b05857a823bab20887f2e5655b437788c31e` |
| Evidence | `evidence-providers-21c2ce57949f.zip` |
| Evidence SHA-256 | `259053bc415f019fd402602d48ef996483aa3593ea0f6f4e991dffb34900e1e7` |
| Manifest | `manifest.json`, with all 565 archive file hashes, all 193 distribution hashes and 54 passing focused results |

The shared correction uses one grouping helper and ordering path for ordinary entries, running singleton pins, dormant pins and stack menus. The leading taskbar group puts Taskbar order first when enabled, followed by applicable New window and Pin/Unpin controls. Window, layout and content actions keep their existing relative order, and Close stays last. Dormant entries place Open after the taskbar group. Ordinary context menus now participate in the same live refresh path as pin and stack menus. Initial and refreshed ordinary-stack menus also use one composition function.

The new `taskbar-menu-order` regression reproduced the reported displacement before the fix. It compares ordered labels and separator positions across pinning, exercises ordinary and pinned live updates, dormant entries, ordinary/pinned stacks and instance-row menus, and checks the leading taskbar group and trailing Close action. The first post-fix run reached the final instance-row assertion but used the wrong selector value for the existing boolean stack-row attribute; that harness selector was corrected without changing the ordering assertions.

Nine suites passed in readable and minified distributions across Chromium, Firefox and WebKit, for 54 fresh suite runs. They were `context-menu`, `dock-tab-menu`, `menus`, `taskbar-menu-order`, `taskbar-pin-commands`, `taskbar-pins`, `taskbar-provider-rows`, `taskbar-stacks` and `taskbar-stacks-full`. Final evidence is under `tests/output/taskbar-menu-order-readable-20261107/` and `tests/output/taskbar-menu-order-minified-20261107/` and copied into the evidence archive. A rendered pinned-stack context menu was inspected. All archived files were read back and hash-verified. Minifier consistency, JavaScript syntax, whitespace and reverse patch applicability checks pass.

The pre-fix failure is retained under `tests/output/taskbar-menu-order-before-20261107/`; the selector failure is retained under `tests/output/taskbar-menu-order-first-20261107/`. Earlier candidate evidence below retains its original scope and is not counted as a fresh run of this follow-up. The beta owner should adopt the frozen assets and rerun the real-host WinDragSens menu-order reproduction, including initial and live-refreshed paths. Shared ownership remains with the PUDL owner until that integration is accepted.

## Unopened launcher row checkpoint

The unopened-row checkpoint is `providers-243eb522365d`. It superseded `providers-77d2d8336df2` and is now followed by the menu-order candidate above. No commit, publication or production promotion occurred. The original snapshots remain unchanged as historical evidence.

### Real-beta verification complete

The beta owner accepted and deployed the replacement in message 5289 as host build `providers-243eb522365d-405471be4686`, retaining server image `sha256:e3e7777ed2ec570fa3c288d6e46cd40c13e70a18db9f4df7a3a600835b3eebc5`. The owner verified the archive checksum, all 560 archived files and all 193 source/deployed assets against the frozen manifest. No mutable shared worktree assets were copied.

The original unopened Conway reproduction passes. The attached real-host test source was reviewed; it gates the actual metadata request, checks that the disabled resolving row and focused element survive resolution, pins two different unopened article rows, checks that no unrelated destination is requested or article window opened, preserves the popup, excludes a row without lookup, and reloads saved references into dormant picture-bearing pins. The beta owner reports these checks passing in Chromium, Firefox and WebKit. Picture lifecycle, standard taskbar and popup/pane/intervening-selection regressions also pass against the replacement in all three engines. A signed-in row pin persists its reference and dormant picture after reload, and the original test-account preferences were restored.

The retained host evidence is `C:/Users/paul/source/repos/paulmooreparks/parkscomputing/.local/beta/providers-243eb522365d/`. The host's `Architecture/taskbar-pins-beta-integration.md` and `Architecture/pudl-adoption.md` record the deployment. These are independent host-reported execution results; the shared owner reviewed the attached test and integration record without rerunning the deployed host suite.

No further shared failure was found in the requested row integration. The earlier WebKit real-site modified-link probe remains unclaimed, and manual assistive-technology verification remains unperformed. The predecessor's unit, authorization and readiness results retain their original scope and are not counted as fresh replacement runs. Production's image and distribution were verified unchanged by the beta owner.

The candidate is ready for Paul's review at `https://beta.parkscomputing.com`. Shared implementation ownership remains with the PUDL owner for any follow-up; the beta owner retains host ownership. Commits, public publication and production promotion remain paused pending Paul's review.

The replacement artifacts are in `C:/Users/paul/source/repos/pudl-taskbar-pins/tests/output/provider-rows-beta-handoff-20261107/`. The bus-shareable copies are in `C:/Users/paul/source/repos/pudl/tests/output/provider-rows-beta-handoff-20261107-243eb522365d/`.

| Artifact | Value |
| --- | --- |
| Archive | `pudl-taskbar-providers-243eb522365d.zip` |
| Archive size | 7,184,833 bytes |
| Archive SHA-256 | `f5e0156254abf4ff679a18ac65af5c48afe539e8008630697f0ad12b212c7bde` |
| Source snapshot SHA-256 | `243eb522365d206426148add18a29ad3e2699f52e9537f6af4b9687f025864cd` |
| Patch | `providers-243eb522365d.patch` |
| Patch SHA-256 | `2a8042ce73e6f14bda070f2af826056e9afa5eef424abd967076b56b165b456f` |
| Evidence | `evidence-providers-243eb522365d.zip` |
| Evidence SHA-256 | `00a0d744fdfc01269bbde1ee10f0c10d211ae5bcab86a79778059625d7cdb075` |
| Manifest | `manifest.json`, with all 560 archive file hashes, all 193 distribution hashes and 24 passing focused suite results |

The replacement closes the gap reported in message 5284. An unopened launcher row carries `data-win-destination-provider="articles"` alongside `data-win-pin-target="article-id"`. Its normal row-actions or context-menu request discovers and resolves only that reference. The open shared menu updates from disabled Resolving destination to Pin while retaining focus. Pinning saves its provider reference without opening the item or dismissing the launcher. A row's `data-win-pinnable="false"` skips lookup and shared actions. Static registered rows remain compatible.

The replacement passed `taskbar-provider-rows`, `taskbar-providers`, `taskbar-pins` and `taskbar-pin-commands` in readable and minified distributions across Chromium, Firefox and WebKit, for 24 suite runs. These are fresh checks of the replacement. The earlier 60-run matrix below belongs to the predecessor and was not counted as a fresh replacement run. The new row suite verifies lazy discovery, no startup enumeration, separate requests for two unopened articles, live focused menu updates, reference persistence, exclusions, cache reuse, retry, popup retention and stale-principal rejection.

Evidence is retained under `tests/output/provider-rows-readable-20261107/` and `tests/output/provider-rows-minified-20261107/` and copied into the replacement evidence archive. A rendered popup/context-menu screenshot was inspected. Archive contents and hashes, minifier consistency, reverse patch applicability and Git whitespace checks pass. Real-host row-menu integration remains with the beta owner, alongside the previously requested category, permission and picture checks.

### Host report received in message 5287

The beta owner reports that predecessor `providers-77d2d8336df2` is deployed as host build `providers-77d2d8336df2-1bc62ad626cc`, image `sha256:e3e7777ed2ec570fa3c288d6e46cd40c13e70a18db9f4df7a3a600835b3eebc5`, with all 559 archived files and 193 deployed distribution assets verified. The reported host checks cover automatic content-category identities, scoped guest/account preferences and authorization changes, repeated article pins, running/dormant/restored pictures, exclusions, unavailable removal, broken pictures, independent readiness and window ordering in all three engines. The reported unit result is 140 passing tests and six skips. These are host-reported results for the predecessor, not independent shared-owner verification of the replacement.

The host reports native modified article links passing in Chromium and Firefox. Its WebKit real-site probe stalled, so that end-to-end result remains unclaimed. Production and commits remain unchanged.

The attached Firefox reproducer requests the unopened Conway row's context menu with About open and the launcher presented as a pane. Its authored `data-win-pin-target` and `data-win-destination-provider="content"` already match the replacement contract. The remaining shared-code handoff is message 5286's frozen replacement above; host adoption and rerunning this reproducer remain pending.

## Original provider and picture checkpoint

The shared implementation is frozen as `providers-77d2d8336df2` on 7 November 2026. This is an uncommitted beta snapshot based on `4e14a198a0816eb65ac15cd547277d8f382614b4`, which follows the published 0.102.0 release. At that checkpoint, commits, publication and production promotion were paused. Distribution version headers retain 0.102.0; the candidate ID and manifest identify this additional implementation.

## Frozen artifacts

All artifacts are in `C:/Users/paul/source/repos/pudl-taskbar-pins/tests/output/providers-beta-handoff-20261107/` and are marked read-only.

| Artifact | Value |
| --- | --- |
| Archive | `pudl-taskbar-providers-77d2d8336df2.zip` |
| Archive size | 7,182,019 bytes |
| Archive SHA-256 | `6c8d8e7473117d4c55ac35450a16bfaf12d6b3cfb7abae3f4ef10f46c9131eb8` |
| Source snapshot SHA-256 | `77d2d8336df2a2f5f55cf11a2376ab260757865c96f0ac923fdbe65688c694b5` |
| Patch | `providers-77d2d8336df2.patch` |
| Patch SHA-256 | `4cc2a55288c8658e3019b845d8ac82c4bcee9ade67ea77a89dbdfae138a4f9f5` |
| Evidence | `evidence-providers-77d2d8336df2.zip` |
| Evidence SHA-256 | `bf42b577722a7060f23e0495de58153c4ca01c2892035b60a7f63bf766fb2683` |
| Manifest | `manifest.json`, with all 559 archive file hashes, all 193 distribution asset hashes and 60 passing suite results |

Every archived file was read back and verified against the manifest inputs. The patch passes `git apply --check --reverse` against the current implementation. Only `dist/pudl-windows.js`, `dist/min/pudl-windows.js` and its source map differ from the base distribution. This handoff record is external to the frozen archive so recording its checksum does not change that archive.

## Implemented contract

The candidate contract is documented in [TASKBAR-PINS.md](../TASKBAR-PINS.md). The design decisions are retained in [the provider proposal](taskbar-destination-providers.md).

Providers register categories once and resolve arbitrary stable destination IDs from normal host metadata. Initial and fetched root windows carry `data-win-destination-provider` and `data-win-destination`; applet instances share their canonical application identity. Provider, descriptor and root exclusions preserve the proposed semantics. No per-item eligibility list is required.

The host saves provider `references` with membership and order, resolves dormant IDs directly, and retains unavailable references. Reconfiguration and refresh abort superseded lookup signals and ignore stale results. A non-secret configuration `scope` token forces invalidation when account or workspace context changes, even when callback objects and IDs are unchanged. Hosts must supply that token consistently. Static 0.102.0 integrations remain supported.

Destination descriptors accept `icon` with HTTP(S) or relative image URLs. Running and dormant aggregate pins, multi-instance stacks and taskbar overflow share the image and glyph fallback. Individual windows retain `data-win-icon`. Generated taskbar DOM requires no host patch.

Resolved links preserve native new-tab navigation. Command activation retains permission revalidation, synchronous `waitUntil` registration, observable fragment results, separate application readiness, suppression and retry. Scope invalidation does not cancel already accepted host commands; the host must guard their results if the principal changes during execution.

The candidate includes the published 0.102.0 popup focus correction beyond beta's former `8ed0119` baseline. The beta owner independently reported that the formerly failing Firefox popup ordering reproduction passes after adopting published 0.102.0. This shared snapshot does not claim a new real-host category or picture verification yet.

## Verification

The final readable and minified matrices each passed ten suites in Chromium, Firefox and WebKit, for 60 suite runs. The suites were `taskbar-providers`, `taskbar-pins`, `taskbar-pin-commands`, `window-open-result`, `menus`, `host-launcher`, `window-focus`, `window-icon`, `menubar-item-icon` and `dock-overflow`.

The provider suite exercises two independent articles without item registrations, including pinning the second after the first; dormant reload; application instance grouping; root and category exclusions; unavailable membership and removal; resolver failure and retry; stale-result rejection; explicit scope changes with reused callbacks; private metadata scrubbing; picture load and error fallback; real new-tab navigation; malformed input rejection; and picture-bearing overflow rows.

The final evidence directories are `tests/output/providers-readable-scoped-20261107/` and `tests/output/providers-minified-scoped-20261107/`. Their logs, result records and screenshots are copied into the frozen evidence archive. Dark, light, narrow and overflow screenshots were inspected. `node build/minify.js --check`, JavaScript syntax checks and Git whitespace checks pass.

Earlier failure evidence remains under `providers-source-first-20261107`, `providers-source-matrix-20261107`, `providers-native-check-20261107` and `providers-image-surfaces-20261107`. Harness corrections enabled forced right-click testing on an aria-disabled pin, replaced synthetic popup interception with a directly served native-link fixture, and limited the overflow fallback assertion to the affected provider rows rather than unrelated running tools. No failing result was counted toward the final passing matrices.

## Beta handoff

The beta owner should copy the frozen archive, verify its checksum and all distribution hashes, and integrate the finalized provider, reference, scope and icon contracts. Real-host checks still need to cover article and applet defaults, multiple articles after an initial pin, exclusions, guest/account isolation, permissions, dormant pictures and broken-image fallback, independent readiness, and the retained popup/pane ordering reproduction in all three engines.

The shared-control owner retains implementation ownership until the beta owner accepts the candidate. Host integration, deployment and real-host regression work remain with the beta owner. No production change or release is requested by this handoff.
