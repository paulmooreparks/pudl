# PUDL 0.96.2

This point release corrects dropdown continuity during background updates. The implementation is based on Front End candidate 64f3adfe09a12a629efd1ab2a989f356c44dd71c. The lead owns integration and publication. Version metadata changes after that candidate do not change its tested JavaScript.

Menu-bar, ribbon and command menus retain surviving controls and focus while updating command state. Command identity remains stable when distinct commands have identical labels. Custom input panels survive sibling updates. Removed owners and unavailable focused commands use surviving enabled controls, with fallback rows brought into view. Combo lists follow source-option changes and reject stale or disabled choices.

## Validation

Focused readable and minified runs each passed nine suite executions across Chromium, Firefox and WebKit, with 41 menu-bar, 32 command-menu and 11 combo assertions per engine. The readable family run passed 99 suite executions. Independent full-log audit found no printed failures or raw/effective result discrepancies in all 117 records. Nine silent family executions have successful metadata. All 44 generated copies and maps passed freshness checks.

Evidence is retained in Studio's .diagnostics/fix8/run-40, run-41-min and run-42-family directories. Their served.txt files record selected-input provenance, not every served dependency. The focused manifests contain 13 inputs each; the family manifest contains four readable scripts. Recorded hashes match immutable 9a77efc blobs and the unchanged final candidate inputs. The final candidate commit changes only its handoff document. Independent audit records reside under tests/output/menubar-continuity-64f3adf-independent-evidence-audit in the PUDL workspace.

Paul directed completion from the current focused evidence without another broad behavioral gate. No additional full matrix, fresh all-section reference review or new negative control is claimed for this release. Wider dropdown coverage belongs to batch-end regression. The previous release's retained light/dark appearance evidence is unchanged by this JavaScript correction; it does not establish new visual coverage.

## Limits

Commands added while an owner-drawn fold menu is open appear on its next opening. Existing command rows refresh while open. A host that removes a command owner must call pudlCommands.changed(); focus repair occurs on that redraw. Duplicate labels without stable IDs are matched in occurrence order. Composition coverage uses synthetic events and does not establish native IME interoperability. Dinah-owned dropdowns are outside this upstream patch.

The retained intermittent sidebar and status-wheel CI failures from 0.96.1 remain unresolved historical findings; this release does not claim to diagnose them. Skin and palette admission limits remain those documented in the prior release. The held 0.96.0 tag remains unchanged.

## Publication

Independent source closure and full-log evidence audits pass for 64f3adfe, with no remaining concrete blocker in the corrected scope. The source closure is retained in tests/output/menubar-continuity-64f3adfe-independent-source-closure.md. Publication identity verification follows the immutable tag. The release archive will contain the tagged files and checksum. Public download and CDN checks must match the tag before adoption handoff. The tagged README retains verified 0.96.1 CDN examples; main will receive verified 0.96.2 examples after publication.
