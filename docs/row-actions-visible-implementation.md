# Always-visible row actions

This current-base candidate integrates the accepted 16 November row-action correction onto main 65480377efc75769e60f34411eeb47bac798a0b9. Version 0.108.1 is provisional and unallocated. The historical held reports below retain their original source scope; no new browser validation is claimed. Released direct-child menu lookup and other 0.108.0 performance changes remain intact.

The CSS change removes conditional visibility without changing dimensions, margins, layout or pressed styling. Inherited visibility still respects hidden ancestors. Menu initialization removes tabindex and aria-hidden on action buttons and supplies Actions for empty buttons without a nonblank aria-label, title or text and without a resolving aria-labelledby reference. Existing text, aria-label, aria-labelledby and title remain the author's responsibility. Documentation shows row-specific naming for repeated controls. The insertion observer processes every affected subtree in a mutation batch.

The focus audit found that pudl-md's row-list roving code selects .md-row > .md-item, while pudl-tree selects li > a and handles keys only on treeitems. These handlers do not rewrite action-button tab stops. The owned regression loads both handlers and checks action activation and focus retention. Native disabled, hidden and inert behavior remains in force.

The original row-actions suite retains its menu placement, second-press closing, table ownership, tree geometry and touch checks. Superseded hidden-button and accessibility-exclusion assertions now check visibility and ordinary Tab eligibility. A separate owned suite covers both themes, real keys, stable geometry, dynamic sibling insertions, authored names and excluded controls.

WebKit skipped links during reverse traversal in this environment; this observation does not establish a universal platform default. The first owned run failed on the expected preceding link and remains preserved. The revised test records that qualification and checks button-to-button forward and reverse traversal independently. Attribute and browser focus evidence do not constitute manual screen-reader verification.

The held release candidates, unresolved receipt-CI timeout and primary checkout remain outside this delivery. Final evidence and hashes are recorded in the handoff after verification.

## Bounded naming correction

The lead accepted the independent naming finding on 16 November. The original 181-entry candidate and evidence were verified and preserved in held-before.zip before correction. Empty and whitespace-only aria-label/title values and entirely unresolved aria-labelledby references now permit Actions on otherwise empty glyph buttons. PUDL preserves the reference attribute, so a target added later takes normal naming precedence over the fallback. A resolving ID reference remains authored naming, including mixed resolved/unresolved lists. Authors remain responsible for the referenced label's content. This rule does not inspect recursive names, native label associations or every possible accessible-name source.

The rule follows the [W3C Accessible Name Computation 1.1 steps 2B and 2C](https://www.w3.org/TR/accname-1.1/#mapping_additional_nd_te), which distinguish valid ID references and nonblank aria-label values. The browser performs the actual naming computation. The owned naming suite checks accessibility snapshots for the reproduced empty, whitespace and unresolved cases, valid labels/title/text, mixed ID references and later target resolution. No CSS or unrelated focus/menu behavior changes in this correction.
