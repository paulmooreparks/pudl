# Combo relocation independent revalidation

The held authored-relocation correction passes independent revalidation. The original six source/minified first-legend failures are closed in Chromium, Firefox and WebKit. The earlier REVISE report and failed captures remain historical evidence.

The unchanged original probe was copied byte for byte to tests/output/verification-combo-relocation-20261113-1701/probe.cjs. It exits 0 with no candidate parity failure. The six supplied focused suites pass 18/18 source in 33 seconds and 18/18 minified in 35 seconds, serially on checked port 8891. Both terminal exits are 0. All 36 raw/effective records are zero without printed failures or timeouts. Full runner directories and logs are retained with the independent evidence.

## Additional independent checks

extra-v2.cjs passes six combinations across both forms and all engines. It moves only the authored wrapper and verifies that internal cross-form reconciliation retains the query, native selected option, described host error and generated field identity. It records retained text selection positions 2 through 5 and observed focus. Old-form reset, cancelled new-form reset and stale reset superseded by movement/edit do not erase the query. Detachment removes generated UI without taking outside focus; reinsertion reuses one field. Moving into a modal dialog gives the popup that owner, and moving out closes the popup. Two animation frames settle with one query, one error and correct adjacency, with no page errors.

The first extra harness run stopped after its reset checks because it relied on the browser's named property for an element after removing that element. Its exit 1, partial results and log remain in extra.cjs, extra.log and extra-results.json. The corrected harness keeps an explicit reference before removal; it changes no product behavior or assertion. The original six-failure probe was not edited.

## Source review and contract

Generated placement now reconciles adjacency before computing effective disabled state and form association. The supplied authored-only suite covers both first-legend directions, external/unresolved association, reported errors and reinsertion. Generation changes invalidate queued reset work on structural or owner changes; detached sources unbind reset and suppress generated UI. Equality guards prevent repeated adjacency writes once placement settles. No observer feedback failure was observed in the bounded checks; this is not a sustained-load performance certification.

Internal movement preserves query state. Explicit refresh retains its existing synchronization behavior for a nonfocused query. The native source remains the submitted selected value. Validation still cancels only source reporting, and a direct source report cannot report a different element. Browser-owned reporting focus and bubble appearance remain profile observations. Popup movement into a dialog is covered; this review does not certify every nested auto-popover composition, assistive speech or deployed host integration. No public disposal method is added.

## Provenance and handback

The source SHA256 is d237e85df605c92dd184e3b656467bcdb8659a16dbc875e2dafa1c89ad43e45e. The minified SHA256 is f8751f868159ae72aa487c61fe57de2a85130d46c47708658abca097dbed44ab, and its map is a24acea111fff44419f697c5227fc2df052655dee02ccba33d977562543ca989. before-independent.json measures held files independently before execution. audit.json measures them again afterward, with no runtime, documentation, fixture or test drift, and confirms original-probe byte identity.

All owned runners, browsers and servers have exited; port 8891 has no listener. Combo execution ownership returns to the lead with PASS for this bounded correction. Packaging and integration remain the lead's decisions. No runtime, existing test, commit, package or installation was changed.
