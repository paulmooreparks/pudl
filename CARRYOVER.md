# PUDL carryover

## Current 0.110.1 patch candidate

The 0.110.1 launcher placement patch has prepared metadata and generated copies on fix/launcher-placement-20261127 from main 8e25327b14817ca1347d9ef678d566e0db79dc8c. The frozen source has 45 passing original outcomes across three browser engines. Hosted PR and main validation, immutable packaging and public-byte acceptance remain pending. The patch has not been published. The held 0.111 skin migration is separate.

The published baseline is 0.110.0, with annotated tag 0be9c893cdc84c85a45762c4b5d33233c7e48a3d at release commit be15ce340d4549625bdc091db9ead8fded5069ce. The later diagnostic main 8e25327b14817ca1347d9ef678d566e0db79dc8c adds host failure evidence and required teardown propagation without changing product bytes or issuing a release.

Firefox [issue 43](https://github.com/paulmooreparks/pudl/issues/43) remains open with an unknown cause, and [issue 44](https://github.com/paulmooreparks/pudl/issues/44) remains open with investigation stopped. PUDL maintainers own closure. Sites serving Firefox visitors should not adopt 0.110.1 until both defects close. New passing outcomes establish no cause or closure. Downstream installed-host acceptance remains separate from library publication.

The earlier preparation records below are historical. Their pending 0.110.0 steps were subsequently completed. Their evidence and qualifications remain preserved and do not describe the current patch status.

## Historical 0.110.0 candidate preparation

The active candidate combines neutral window counts and a launcher-backed ribbon row on feat/window-neutral-count-20261126. Final source and rendered clearance was recorded on 27 November at 09:53:55 Singapore in tests/output/verification-count-ribbon-20261127/review.md. The generated copies, 0.110.0 metadata and all 25 local README integrity values are prepared under tests/output/lead-generation-20261127. Static checks and generated-copy checks pass. Independent metadata review, hosted PR/main validation and publication have not occurred. The released baseline remains 0.109.0 at main f8f7f21ab4479fd5acc5edbe9f8dcc7c13bfb90c.

The Firefox host-launcher opening regression remains open as [issue 43](https://github.com/paulmooreparks/pudl/issues/43), owned by the PUDL maintainers. Sites serving Firefox visitors should not adopt 0.110.0 until this defect is closed. The retained diagnostic times out on the first site-hamburger click in Firefox. Chromium and WebKit passed the eight relevant baseline suites. The cause is unconfirmed, and investigation continues after release on a separate branch. This single open check does not cover any other failure or waive release integrity verification.

The candidate also requires the visible wide-ribbon hamburger correction, a passing actual-folding chooser regression, and enlarged-count containment evidence. The original enlarged-text check changed the root font without changing the fixed badge token. Its claim was withdrawn. The replacement asserts computed 11px and 22px badge text and exposed taskbar clipping, which is being corrected before freeze. Failed and superseded originals remain retained.

The chooser fixture correction now constrains its owning topbar and passes without a product change or extended wait. The count correction passes enlarged-text and narrow-scroll checks in all three engines. Combined allocation neutral-count-ribbon-combined-20261126-1 retains an additional Firefox window-state-presentation timeout while waiting for a grouped taskbar execution glyph. It is tracked separately in [issue 44](https://github.com/paulmooreparks/pudl/issues/44), owned by the PUDL maintainers. Later diagnostic and affected-CSS refresh passes establish no cause. Its diagnosis is stopped. The release disposition permits these two specific Firefox checks to remain open, while their actual failed outcomes remain visible. No other failure or integrity check is excepted. Sites serving Firefox visitors should wait until both open Firefox defects are closed.

The launcher beforetoggle guard, synchronous regression and permanent enlarged-count taskbar regression are written. Final LF allocation neutral-count-corrections-20261127-2 passes all twelve affected outcomes across Chromium, Firefox and WebKit with unchanged source hashes. The initial CRLF attempt and its whitespace failure remain retained. Independent review accepted both corrections, the chooser setup and count layout against the nine recorded LF inputs. Normal generated-byte, hosted, immutable-asset and public-byte verification remain required.

## Earlier work record

The remaining sections preserve the work record from 25 November 2026. Their pending 0.109.0 steps were subsequently completed and do not describe the current candidate.

## Released baseline

PUDL 0.108.2 is the latest public release checked on 25 November. Its accepted main commit is ee4426740ab543d040893555c74880a062c19ef4 and its tree is e7d1161e290cc802763b277deab50024dbd54385. The release provides consistent 30px taskbar controls at normal text size, shared growth for enlarged text, visible stack edges and the pinned Playwright CI image. Independent review accepted all 760 browser outcomes and the public archive/CDN byte comparisons. Downstream installation has separate ownership and acceptance. See https://github.com/paulmooreparks/pudl/releases/tag/v0.108.2.

## Planned 0.109.0

The active design and acceptance contract is [desktop-edit-and-menu-contract-2026-11-25.md](docs/proposals/desktop-edit-and-menu-contract-2026-11-25.md). It covers six incoming fixes: closed menubar expansion state, lifecycle-safe remote searchable-select options, generic Edit and host clipboard support, display-only reserved shortcut labels, tooltip-only disabled reasons, and nested full-width flyouts. The new public APIs require a minor version under RELEASING.md.

The implementation engineer owns pudl-menubar.js, pudl-combo.js and their focused tests/fixtures. The lead owns pudl-menu.js, editing tests, shared docs and release metadata. Verification owns the independent review note. Build and Release owns generated copies and hosted validation/publication after source readiness. Everyone shares this worktree and must preserve the other owners' edits.

PR42 is open at c9886638fde40c37ee36b559b8df93d2984c75bc, tree a6c78e1f35bd5caac1f9028da24d97e49470cbf7. Generated metadata was independently cleared, and its first ordinary Tests run 45559934103 passed all 772 original outcomes across four forms. Rendered acceptance is withheld because all four RTL nested-menu images show the leaf turning back over the root invoker despite ample outward room. The successful original run and withheld disposition are retained unchanged. The candidate must not merge on that execution result alone.

The lead has corrected shared beside placement to prefer text direction for the first flyout and continue the resolved physical side through deeper levels, with viewport fallback. The engineer strengthened the regression to require measured outward room and ancestor hit visibility, and preserved the expected failure against old placement. Corrected-source allocation tests/output/desktop-edit-rtl-lead-20261125-1 passes all nine maintenance/context/Edit outcomes across Chromium, Firefox and WebKit. The lead inspected the three RTL outward images and WebKit RTL constrained fallback. Independent corrected-source review, regeneration and README integrity review, a normal new source-triggered hosted PR result, main acceptance, publication and installed acceptance remain pending. The delivery plan records exact current hashes and ownership. Earlier failed local allocations remain retained.

The editing draft uses a host text clipboard transport with both readText and writeText, post-dispatch handlesEdit ownership, and documented undo-preserving editing commands without a direct value/DOM mutation fallback. Independent source review closed the operation-ownership and event-policy findings. Native Undo/event behavior still requires cross-engine hosted proof. Firefox's physical Shift+right-click can bypass contextmenu dispatch, so page code cannot establish host suppression. Software Director accepted the email/number selection limit in message 11339, requiring disabled reasons, untouched native shortcuts, documented Select All and text/inputmode alternatives, and public release/issue disclosure. Those additions pass all six context/Edit source-engine outcomes in allocation14. The guide, changelog and issue 41 scope comment disclose them. Allocations12/13 remain failed with their test-readiness corrections recorded in the release plan. Final independent review remains pending. These limits must stay visible in the release disposition.

The proposed order is source fixes and focused regressions, independent review, one combined hosted candidate, unchanged-input main acceptance, release-byte verification, then downstream handoff. Neither a version number nor source readiness supplies release acceptance. Preserve failed original evidence and diagnose failures without hiding them behind retries or larger waits.

## Downstream and coordination

Software Director (workspace parkscomputing) oversees the software team leads at Paul's direction. #PUDL Team contains PUDL Team Lead, PUDL Implementation Engineer, PUDL Verification and PUDL Build and Release. Cross-product work uses #Dinah-GK Harmonization and #Software Team Leads.

Yavc.App uses guarded pudlClipboard and handlesEdit calls for its own transactional editors. Dinah owns the native clipboard adapter and disabling the webview's default context menu after both upstream releases are available. Installed checks in Dinah and GK Companion must verify actual native clipboard permissions and menu suppression. The shared text transport rejects denied operations without retrying another transport.

Paul requested a menu-height comparison on 23 November. The image mockup is complete and no implementation of that visual proposal was requested. Customer documents and screenshots must not become public test fixtures.

## Useful locations

The repository is https://github.com/paulmooreparks/pudl. The language specification is https://github.com/paulmooreparks/pudl-spec. The reference site is https://paulmooreparks.github.io/pudl/. Shared APIs are recorded in docs/CONTRACT.md and release rules in RELEASING.md. Current public intake is tracked in issues 40 and 41 at https://github.com/paulmooreparks/pudl/issues. No separate maintained board was confirmed on 25 November. The six-item 0.109.0 plan in this record and docs/proposals supplies the current roadmap.
