# Row-actions naming correction held handoff

The bounded naming correction is ready for independent revalidation in `C:/Users/paul/source/repos/pudl-row-actions-visible`, branch `fix/row-actions-always-visible`, still based on ad46b82c7dbe78b627b38f8bcb0e1d9b7a96a6c7. No staging, commit, release assembly, publication or consumer change occurred. The engineer retains held-byte custody pending acceptance.

## Correction and preserved evidence

Menu initialization now permits the Actions fallback when an otherwise empty glyph button has no nonblank aria-label/title/text and no resolving aria-labelledby reference. It retains unresolved references. The browser gives a later target its normal precedence over the fallback. Valid labels, title, text and resolving reference lists are preserved. Authors remain responsible for reference content; this correction does not implement recursive accessible-name computation. The documented basis is [Accessible Name Computation 1.1 steps 2B and 2C](https://www.w3.org/TR/accname-1.1/#mapping_additional_nd_te).

The previous 181-entry manifest a6e6407c490b7d03bc5b797ae94426a3d76319402202994ffb7cf2437e2a98a6 was verified before editing. Its complete entries and manifest are preserved in `tests/output/row-actions-naming-20261116/held-before.zip`, SHA256 ff5dac387436da04452f9ae64d3130c0cb3da6610d80c443c8c4c3cc9ee297f5. Extract that archive to inspect the previous held bytes. The original evidence directory remains intact; its manifest describes the archived before state, not the corrected runtime files.

The incremental change consists of menu source/minified/map, README, CONTRACT, the implementation record and the new naming regression. Accepted CSS source/minified/map are byte-identical to the previous candidate. Existing row-action tests and other behavior are unchanged. `incremental-diff.patch` and `incremental-delta.json` record the before/after correction. The independent review and its evidence reference are retained separately. Its dependency setup errors, fixture expectations and locator errors remain separate from the reproduced product naming finding.

| Corrected asset | SHA256 |
| --- | --- |
| dist/pudl-menu.js | 74193139b6897c2f1ed671006c33c8ae46596c2b15cc1cf2dfb8b2da1d6f4d03 |
| dist/min/pudl-menu.js | 912b9a490b2bad3fd9f337be69f0d07dc4e2eb8c59be01bb33490168b14afaa0 |
| dist/min/pudl-menu.js.map | c4bf728890366255b7e7d59a16ddd283eb421dec77635cb5141fe8b64e34b9da |

## Verification

Final source and minified runs each passed 30/30 serial executions across Chromium, Firefox and WebKit. The ten affected suites cover naming, visible row actions, the original row-actions contract, context menus, menus, menu fit, menu-open tracking, taskbar provider rows, tree grid and indentation. The naming suite passes 72 printed checks across six engine/form combinations, including empty/whitespace labels and titles, unresolved/blank reference lists, valid authored names, mixed references and targets resolving later.

All 60 raw/effective exits are zero, with no printed failures, null exits or runner timeouts. Each runner reports 30/30. Silent menu-open-tracking successes retain their explicit missing-output-log classification. Full per-child printed counts and runner summaries are in accounting.json. No retry, wait change or failure suppression occurred in this correction. The earlier WebKit reverse-link failure and its separately proven complete button traversal remain in the preserved history.

All 48 generated copies pass freshness checking. Menu/test syntax and whitespace checks pass. Browser focus and accessibility snapshots remain browser evidence; manual assistive-technology speech verification was not performed. This is affected regression coverage, not a complete release gate.

## Cleanup and disposition

All owned runners exited and closed their browsers and server. Port 25351 is clear. No unrelated process was terminated. The index remains empty. Primary-workspace writes are limited to the handoff/evidence mirror for bus access. Other held candidates, released assets and consumer files remain unchanged.

The new final-manifest.json seals corrected delivery, this handoff, the archived before state and correction evidence. Its hash is supplied in the bus handoff. PUDL Team Lead should assign independent revalidation of these bytes before release assembly. Version 0.107.3 remains provisional.
