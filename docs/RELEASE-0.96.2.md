# PUDL 0.96.2

This point release corrects dropdown continuity during background updates. The implementation is based on candidate 64f3adfe09a12a629efd1ab2a989f356c44dd71c. Version metadata changes after that candidate do not change its tested JavaScript.

Menu-bar, ribbon and command menus retain surviving controls and focus while updating command state. Command identity remains stable when distinct commands have identical labels. Custom input panels survive sibling updates. Removed owners and unavailable focused commands use surviving enabled controls, with fallback rows brought into view. Combo lists follow source-option changes and reject stale or disabled choices.

## Validation

Focused readable and minified runs each passed nine suite executions across Chromium, Firefox and WebKit, with 41 menu-bar, 32 command-menu and 11 combo assertions per engine. The readable family run passed 99 suite executions. Independent full-log audit found no printed failures or raw/effective result discrepancies in all 117 records. Nine silent family executions have successful metadata. All 44 generated copies and maps passed freshness checks.

Evidence is retained outside this repository, in .diagnostics/fix8/run-40, run-41-min and run-42-family directories. Their served.txt files record selected-input provenance, not every served dependency. The focused manifests contain 13 inputs each; the family manifest contains four readable scripts. Recorded hashes match immutable 9a77efc blobs and the unchanged final candidate inputs. The final candidate commit changes only its implementation notes. Independent audit records reside under tests/output/menubar-continuity-64f3adf-independent-evidence-audit in the PUDL workspace.

The release was completed from the current focused evidence, without another broad behavioral gate. No additional full matrix, fresh all-section reference review or new negative control is claimed for this release. Wider dropdown coverage belongs to batch-end regression. The previous release's retained light/dark appearance evidence is unchanged by this JavaScript correction; it does not establish new visual coverage.

## Limits

Commands added while an owner-drawn fold menu is open appear on its next opening. Existing command rows refresh while open. A host that removes a command owner must call pudlCommands.changed(); focus repair occurs on that redraw. Duplicate labels without stable IDs are matched in occurrence order. Composition coverage uses synthetic events and does not establish native IME interoperability. Dropdowns that a host application draws itself are outside this upstream patch.

The retained intermittent sidebar and status-wheel CI failures from 0.96.1 remain unresolved historical findings; this release does not claim to diagnose them. Skin and palette admission limits remain those documented in the prior release. The held 0.96.0 tag remains unchanged.

## Publication

Independent source closure and full-log evidence audits pass for 64f3adfe, with no remaining concrete blocker in the corrected scope. The source closure is retained in tests/output/menubar-continuity-64f3adfe-independent-source-closure.md. Publication identity verification follows the immutable tag. The release archive will contain the tagged files and checksum. Public download and CDN checks must match the tag before adoption. The tagged README retains verified 0.96.1 CDN examples; main will receive verified 0.96.2 examples after publication.

The release is now public at https://github.com/paulmooreparks/pudl/releases/tag/v0.96.2. Its immutable commit is c66353df0db146b3b48432327f0111e505ad0b5f and annotated tag object is 1efcbe029f5ce5625b031c6a70a768757c739446. The reproducible archive contains 403 files including all 180 dist files, occupies 6178915 bytes, and has SHA-256 86bda308804e9e305d2fd15485d32431a244b805a058e1059b009206a7ee6bc9. Unauthenticated public downloads of the archive and checksum match; every archived blob and the ZIP commit comment match the tag. All 97 versioned CDN CSS/JS files match their tagged bytes. Main's 24 CDN examples now use those verified versioned hashes.

The push automatically started CI runs 41312476108 and 41312476041 at the release commit. They were still running during publication. They are follow-up evidence, and publication does not claim they passed. The release proceeds on the accepted focused evidence, within the reduced testing scope described under "Validation". Adoption by consuming applications remains pending.
