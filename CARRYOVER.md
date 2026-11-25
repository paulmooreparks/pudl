# PUDL carryover

This record describes the released state as of 25 November 2026, after independent public-byte acceptance of 0.109.0. The documentation follow-up branch is docs/carryover-01090-20261125. The preserved implementation branch is fix/desktop-edit-menus-20261125. The old lead checkout has unrelated changes and must not be used for implementation, staging or cleanup.

## Accepted release

[PUDL 0.109.0](https://github.com/paulmooreparks/pudl/releases/tag/v0.109.0) is published. Annotated tag object 74c954f8ad77ec92ddc0113a2c99ee6da4fcd05a binds main f8f7f21ab4479fd5acc5edbe9f8dcc7c13bfb90c and tree 40559cb2f80a8a8ac1942727ab3b0b2c5b6075f0. The full tracked-tree ZIP has SHA256 1dbaf73287c543278e89e992aeb4861f37c9c600c3c8875e1f094783adc2a2fa. Independent verification accepted all 948 archive blobs, the complete 196-file distribution manifest, all three anonymous release assets and 25 tagged README/CDN byte and SHA384 comparisons.

The release supplies the six requested behaviors: closed menubar expansion state, display-only reserved shortcut labels, inherited tooltip-only disabled reasons, deeper full-width flyouts, lifecycle-owned remote options and generic Edit menus with a host clipboard transport. The 0.108.2 taskbar sizing is retained. [Issue 40](https://github.com/paulmooreparks/pudl/issues/40) and [issue 41](https://github.com/paulmooreparks/pudl/issues/41) are closed against the accepted release.

PR42's initial execution passed all 772 original browser outcomes, but rendered review withheld acceptance for an RTL leaf overlapping its ancestor despite ample room. Shared beside placement now follows text direction and the parent's resolved physical side, with viewport fallback. The strengthened regression preserves the old failure and checks outward geometry, ancestor hit visibility and actual edge constraints. Corrected PR Tests 45634572944 and fresh main Tests 45637708950 each pass all 772 originals, 64 silent logs, 52 required nested cases and 11 jobs. Independent review accepted the 28 focused main images. The first execution and its rendered rejection remain retained.

The main Complete artifact-download step passed after 181 seconds without an explicit download-error or retry diagnostic. Its cause is unassigned, and this observation supports no universal speed claim. API release notes use CRLF while the retained local notes use LF; normalized content agrees. No tag, asset or expected integrity hash was replaced.

## Downstream work

PUDL release acceptance is complete. Yavc.App accepted receiving ownership and independently checked the archive, sidecar and all 196 manifest files. Its vendor branch is in progress; its matching release and pin remain pending. Dinah accepted host adoption and will take its own PUDL copy and the matching vendored yavc.app release together in one commit. Its release check requires those copies to agree.

Dinah reports that both clipboard transport methods are already on its master at 4a3e4b2b and were tested against the PUDL branch build. The adoption change will also disable the browser's context menu and claim the terminal's editor transactions with handlesEdit. GK Companion accepted receiving ownership for the shared adoption by merge. Its Jira issue window owns the synthetic assignee-list reopening caller; its lead will replace that caller with ticketed remote options after shared adoption. Installed-host acceptance remains open.

Ready host branches go to Integrator (studio), the announced single merger/pusher/installer for Dinah and GK Companion. Their current merge/install guides and install record govern those actions. Restart to Update remains the person's action. PUDL supplies an upstream release rather than a host adoption branch.

Hosts configure pudlClipboard.setTransport with both readText and writeText in each participating document. Host failure rejects without retrying browser clipboard access. Editors claim their transaction rows through pudl:contextmenu detail.handlesEdit(). Remote lookups use pudl:combo-query tickets and replaceOptions; stale responses are discarded without synthetic reopening. The public contracts are in [EDIT-MENUS.md](docs/EDIT-MENUS.md) and [REMOTE-OPTIONS.md](docs/REMOTE-OPTIONS.md).

Email and number fields show disabled Cut, Copy and Paste with reasons because their selection-position APIs are unavailable. Native shortcuts remain untouched. Select All calls documented select(), which may do nothing when a control has no selectable text. Applications needing full menu editing can use text plus email/decimal inputmode and their own validation, losing automatic email/number validation and any native number spinner. Ordinary contenteditable uses the documented but deprecated Undo-preserving editing primitive; model-backed editors own their transactions. Physical Firefox Shift+right-click can omit contextmenu dispatch, so hosts must suppress their native menu through the documented host option. Installed checks must establish clipboard permissions, editor Undo and physical menu suppression.

Host adoption of the stock Cut, Copy, Paste and Select All menu with disabled reasons, its clipboard connection and native-menu suppression is explicitly authorized. The host leads must include that approval record in their Integrator handoff. Other new or reworked interface still requires an approved mockup under the host team's policy. PUDL release acceptance and downstream installed acceptance remain separate.

## Team and evidence

The PUDL team consists of its lead, Implementation Engineer, Verification, and Build and Release in #PUDL Team. The engineer owned combo/menubar source and regressions; the lead owned shared context/Edit and placement; Verification independently reviewed source, rendered results and release bytes; Build and Release owned generation, hosted evidence, merge and publication. Cross-product coordination uses #Software Team Leads and #Dinah-GK Harmonization.

Preserved implementation evidence is under C:/Users/paul/source/repos/pudl-desktop-edit-menus-20261125/tests/output/. The Build release and integration roots are desktop-edit-build-20261125/release/ and integration/. Independent final reviews are verification-desktop-edit-20261125/main-review.md, immutable-review.md and publication-review.md. Lead adoption records are desktop-edit-lead-delivery-20261125/. These ignored records retain failed allocations and source bindings; do not overwrite them or amend the immutable release to update a status record.

## Current roadmap and useful locations

No additional implementation item is committed by this record. The immediate work is downstream adoption and installed acceptance. A future request needs its own scope and worktree. The earlier menu-height comparison was a mockup request; it did not authorize implementation. Customer documents and screenshots must not enter public fixtures.

The [repository](https://github.com/paulmooreparks/pudl), [reference site](https://paulmooreparks.github.io/pudl/) and [language specification](https://github.com/paulmooreparks/pudl-spec) remain the primary locations. Shared APIs are recorded in docs/CONTRACT.md and release procedure in RELEASING.md. Public intake is on [GitHub issues](https://github.com/paulmooreparks/pudl/issues). No separate maintained board was confirmed for this snapshot. The completed six-item contract and implementation/review history remain in docs/proposals/desktop-edit-and-menu-*.md.
