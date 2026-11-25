# PUDL carryover

This record describes the PUDL lead's work as of 25 November 2026. The branch is fix/desktop-edit-menus-20261125 in C:/Users/paul/source/repos/pudl-desktop-edit-menus-20261125. The older lead checkout has unrelated preserved changes and is not the implementation worktree.

## Released baseline

PUDL 0.108.2 is the latest public release checked on 25 November. Its accepted main commit is ee4426740ab543d040893555c74880a062c19ef4 and its tree is e7d1161e290cc802763b277deab50024dbd54385. The release provides consistent 30px taskbar controls at normal text size, shared growth for enlarged text, visible stack edges and the pinned Playwright CI image. Independent review accepted all 760 browser outcomes and the public archive/CDN byte comparisons. Downstream installation has separate ownership and acceptance. See https://github.com/paulmooreparks/pudl/releases/tag/v0.108.2.

## Planned 0.109.0

The active design and acceptance contract is [desktop-edit-and-menu-contract-2026-11-25.md](docs/proposals/desktop-edit-and-menu-contract-2026-11-25.md). It covers six incoming fixes: closed menubar expansion state, lifecycle-safe remote searchable-select options, generic Edit and host clipboard support, display-only reserved shortcut labels, tooltip-only disabled reasons, and nested full-width flyouts. The new public APIs require a minor version under RELEASING.md.

The implementation engineer owns pudl-menubar.js, pudl-combo.js and their focused tests/fixtures. The lead owns pudl-menu.js, editing tests, shared docs and release metadata. Verification owns the independent review note. Build and Release owns generated copies and hosted validation/publication after source readiness. Everyone shares this worktree and must preserve the other owners' edits.

Implementation is complete at the lead's source-freeze boundary and independent review is active. The initial static check passed 27 Node cases plus tokens and generated palette freshness. Lead allocation7 passes six context/Edit runs across Chromium, Firefox and WebKit; final allocation11 passes the three strengthened Edit suites, including positive offscreen/copied-text checks and browser-fallback isolation. Earlier failed allocations and their distinct diagnoses remain in the release plan and output roots. Engineer-owned menu/combo lifecycle corrections have source-review closure and scoped passing normal-runner outcomes. Generated copies, final README integrity values, complete hosted validation, publication and installed acceptance remain pending. Existing passing 0.108.2 results do not validate this changed tree.

The editing draft uses a host text clipboard transport with both readText and writeText, post-dispatch handlesEdit ownership, and documented undo-preserving editing commands without a direct value/DOM mutation fallback. Independent source review closed the operation-ownership and event-policy findings. Native Undo/event behavior still requires cross-engine hosted proof. Firefox's physical Shift+right-click can bypass contextmenu dispatch, so page code cannot establish host suppression. Software Director accepted the email/number selection limit in message 11339, requiring disabled reasons, untouched native shortcuts, documented Select All and text/inputmode alternatives, and public release/issue disclosure. Those additions pass all six context/Edit source-engine outcomes in allocation14. The guide, changelog and issue 41 scope comment disclose them. Allocations12/13 remain failed with their test-readiness corrections recorded in the release plan. Final independent review remains pending. These limits must stay visible in the release disposition.

The proposed order is source fixes and focused regressions, independent review, one combined hosted candidate, unchanged-input main acceptance, release-byte verification, then downstream handoff. Neither a version number nor source readiness supplies release acceptance. Preserve failed original evidence and diagnose failures without hiding them behind retries or larger waits.

## Downstream and coordination

Software Director (workspace parkscomputing) oversees the software team leads at Paul's direction. #PUDL Team contains PUDL Team Lead, PUDL Implementation Engineer, PUDL Verification and PUDL Build and Release. Cross-product work uses #Dinah-GK Harmonization and #Software Team Leads.

Yavc.App uses guarded pudlClipboard and handlesEdit calls for its own transactional editors. Dinah owns the native clipboard adapter and disabling the webview's default context menu after both upstream releases are available. Installed checks in Dinah and GK Companion must verify actual native clipboard permissions and menu suppression. The shared text transport rejects denied operations without retrying another transport.

Paul requested a menu-height comparison on 23 November. The image mockup is complete and no implementation of that visual proposal was requested. Customer documents and screenshots must not become public test fixtures.

## Useful locations

The repository is https://github.com/paulmooreparks/pudl. The language specification is https://github.com/paulmooreparks/pudl-spec. The reference site is https://paulmooreparks.github.io/pudl/. Shared APIs are recorded in docs/CONTRACT.md and release rules in RELEASING.md. Current public intake is tracked in issues 40 and 41 at https://github.com/paulmooreparks/pudl/issues. No separate maintained board was confirmed on 25 November. The six-item 0.109.0 plan in this record and docs/proposals supplies the current roadmap.
