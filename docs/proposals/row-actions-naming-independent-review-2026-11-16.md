# Row-actions naming correction independent review

I recommend scoped PASS and release assembly from the reviewed bytes. The demonstrated naming defects are corrected without changing the accepted CSS or existing row-action behavior. This recommendation does not certify a complete release gate or authorize publication. PUDL Team Lead retains disposition; the engineer retains candidate byte custody.

This review answers assignment 10153 against `C:/Users/paul/source/repos/pudl-row-actions-visible`, based on `ad46b82c7dbe78b627b38f8bcb0e1d9b7a96a6c7`. Independent evidence is under `tests/output/verification-row-actions-naming-20261116-0920`.

## Preserved and corrected identities

The archived previous state verifies all 181 entries against manifest `a6e6407c490b7d03bc5b797ae94426a3d76319402202994ffb7cf2437e2a98a6`. The archive also contains that exact manifest, and its CRC check passes. `held-before.zip` has SHA256 `ff5dac387436da04452f9ae64d3130c0cb3da6610d80c443c8c4c3cc9ee297f5`.

The corrected 174-entry manifest remains `3f4aec7e1f1c7b201ae615b0b6b629bc476ab1eeca6c28e2cb2cee7875fd9664` before and after independent execution, with zero mismatches. Exactly six previous entries changed: menu source/minified/map, README, CONTRACT and the implementation record. The new naming regression is separately added. Accepted CSS source/minified/map and both existing row-action tests are byte-identical to the archived state. The incremental diff contains no unrelated runtime change.

| Corrected asset | SHA256 |
| --- | --- |
| dist/pudl-menu.js | 74193139b6897c2f1ed671006c33c8ae46596c2b15cc1cf2dfb8b2da1d6f4d03 |
| dist/min/pudl-menu.js | 912b9a490b2bad3fd9f337be69f0d07dc4e2eb8c59be01bb33490168b14afaa0 |
| dist/min/pudl-menu.js.map | c4bf728890366255b7e7d59a16ddd283eb421dec77635cb5141fe8b64e34b9da |

## Code and contract

Initialization now checks nonblank label/title/text and whether any labelled-by ID resolves in the button's owner document. Empty and whitespace-only inputs and wholly unresolved references permit the Actions fallback. The reference attribute remains intact. A target added later therefore takes its normal naming precedence, without a PUDL callback rewriting the author’s reference or label.

The documented rule is appropriately bounded. A resolving ID remains authored naming, including a mixed resolving/unresolved list, and the author remains responsible for its referenced content. The correction does not recursively compute accessible names or promise to repair every host naming error. This follows the distinction between resolving references and nonblank labels in [W3C Accessible Name Computation 1.1](https://www.w3.org/TR/accname-1.1/#mapping_additional_nd_te). No branch depends on the observed WebKit link traversal policy.

## Independent verification

All 36 affected regression children pass, raw/effective zero, across source/minified forms and Chromium, Firefox and WebKit. The suites cover naming, visible actions, original row actions, context menus, menus and menu-open tracking. There are no printed failures, null exits or suite deadlines. Six menu-open-tracking successes intentionally have no output log. Both runner summaries report 18/18.

The independent probe passes 108 checks across six engine/form runs. It covers the reproduced empty-label/title and unresolved-reference cases, whitespace-only variants, valid label/title/text/reference controls, mixed reference precedence and a target resolving after initialization. It also rechecks forward/reverse button traversal, both themes, stable 24px geometry, disabled/hidden/inert controls, dynamic insertion, native Enter/Space opening, Escape return and menu activation. Every demonstrated formerly unnamed case now has Actions; the later target supersedes it while the stored fallback and original reference remain intact.

Served menu and CSS response hashes match the held source/minified assets in every engine. Exact-path minified routing and CSS URL rebasing match the repository harness. The only request error is a retained favicon 404. Generated freshness checks all 48 copies, and whitespace checking exits zero.

I audited the engineer's 60 final records and 72 printed naming checks, including six silent successes. All raw/effective exits are zero without printed failures or deadlines. An initial independent ledger postprocessing assertion used a slash filter on Windows backslash paths; normalization corrected the accounting without changing logs or running browsers again. This is recorded in setup-notes.txt.

The earlier product failure, original WebKit reverse-link failure and the previous independent dependency, tree-order and menuitem-locator harness errors remain preserved separately. They are not relabelled as successful executions of the corrected candidate. The current independent probe uses the corrected DOM-order expectation and menuitem locator documented in the prior review. No wait was extended and no failed browser run was repeated in this revalidation.

All owned runners exited, browsers and servers closed, and ports 25371/25372 have no listeners. The index remains empty; no candidate edits, staging, commit, integration, publication or consumer changes occurred. No unrelated process was terminated. Manual assistive-technology speech and physical-input verification remain unperformed. Other held candidates and the prior release evidence remain outside this scope. The browser slot returns to the lead for scheduling release assembly or other explicitly assigned work.
