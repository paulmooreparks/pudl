# Always-visible row-actions held handoff

The candidate is ready for independent review in `C:/Users/paul/source/repos/pudl-row-actions-visible`, branch `fix/row-actions-always-visible`, based on freshly fetched remote main `ad46b82c7dbe78b627b38f8bcb0e1d9b7a96a6c7`. Remote main still matches that commit and remote v0.107.3 is absent. No commit, staging, publication or consumer change occurred. The engineer retains candidate custody until review acceptance.

## Result and scope

Row-action buttons stay visible at rest and participate in ordinary sequential navigation. Menu initialization removes the old tabindex and aria-hidden exclusions, preserves authored naming attributes and text, and labels otherwise empty buttons Actions. The mutation observer now processes every affected insertion subtree in a batch. CSS removes conditional hiding while preserving size, margins, alignment, pressed appearance and inherited ancestor visibility. Menu placement and activation paths remain unchanged.

The delivery changes six runtime/generated files, README, docs/CONTRACT.md and the original row-actions test. It adds the owned visible-actions test and implementation record. This handoff is an additional documentation artifact. `tests/output/row-actions-visible-20261116/scoped.diff` contains the complete delivery diff, including the new test and implementation record. `delivery.json` lists their hashes. `baseline-blobs.json` records all 910 baseline blobs; the initial filesystem capture matches them. `tracked-delta.json` records the nine tracked changes. All other tracked baseline files remain unchanged.

| Asset | SHA256 |
| --- | --- |
| dist/pudl-menu.js | c6a4a0db53b1fec7a1010ce24d7b8431dc9ca1e857348913aeeebbca37e2b50a |
| dist/min/pudl-menu.js | 0f56ed148794d10dbc95f8d4c7c5d8a041a62086e1d17ced7b25c1cfca9eeb4b |
| dist/pudl.css | 050f2d8a21120d81a1bab0e7855e5a06da0aa523992d47efbe465f198ef0dc97 |
| dist/min/pudl.css | ccee6ec56d4a695b70409c32b05afc3b3d4a8f33603b0926edaedbd0f81e281d |

The matching maps are included in delivery.json. `final-manifest.json` seals the delivery, handoff and evidence without including itself. Its hash is supplied in the bus handoff.

## Verification and accounting

The final affected source and minified runs each passed 27/27 child executions across Chromium, Firefox and WebKit, serially. The suites were row-actions, row-actions-visible, context-menu, menus, menu-fit, menu-open-tracking, tree-grid, tree-indent and taskbar-provider-rows. The completed owned suite then passed six additional source/minified executions after adding full forward/reverse Tab coverage, separate existing-container insertion coverage and screenshots. Runtime bytes were unchanged throughout these final runs.

The original menu geometry, table ownership, tree placement, second-press closing and Chromium long-press checks remain. Both themes have visibility and geometry assertions. Real Tab and Shift+Tab reach every list, tree and table action. Enter and Space open menus, Escape restores button focus, and roving handlers leave action buttons alone. Dynamic boxes, authored naming, and disabled/hidden/inert traversal controls pass. Chromium light/dark screenshots were visually inspected; all six engine/form combinations retain theme screenshots.

The initial run passed 5/6 and failed the new WebKit reverse-link assertion. That failure is retained. The final test explicitly qualifies WebKit's observed default link-skipping policy and independently proves button traversal in both directions. The total ledger contains 66 executions, 65 passing and one retained initial failure. The final affected and completion runs contain 60 passing executions. Raw exits and effective results agree; there are no null exits or runner timeouts. Child-printed counts, silent-success cases and runner summaries are reconciled in accounting.json. Menu-open-tracking produces no output log on silent success, which the audit records explicitly. An initial audit assumed every child produced a log and stopped; the completed audit handles that documented silent case without changing any test result.

All 48 generated copies pass build/minify.js --check. JavaScript syntax checks and git diff --check pass. The baseline and current generated changes are limited to the menu and base CSS assets and their maps. The tests use the repository's existing dependencies; environment.json records Node, Playwright and Windows identity. Browser focus and naming evidence do not establish manual assistive-technology verification. No broad release gate was run.

## Cleanup and requested action

All owned test runners exited and closed their browsers and server. Port 25351 is clear. No unrelated process was terminated. The primary checkout and all other held candidates remain untouched by the implementation; only a handoff/evidence mirror is copied into the primary workspace for bus access.

PUDL Team Lead should assign independent review of the held bytes and evidence before release assembly. Build owns any later version allocation and release work. The prior release evidence and unresolved receipt-CI failure remain separate.
