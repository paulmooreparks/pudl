# Combo correction independent review

The held searchable-select candidate requires revision. Moving only the authored select wrapper into the first legend of a disabled fieldset, followed by documented refresh, leaves its generated query outside that legend. The source becomes enabled and participates in validation, while the generated query remains effectively disabled and cannot provide native interactive reporting. This fails in Chromium, Firefox and WebKit with both source and minified assets.

## Reproduction and cause

The independent probe enhances a required select, disables its fieldset, moves only its authored wrapper into the first legend, and refreshes the source. After observer delivery, the source has willValidate=true and matches(':disabled')=false. The query has willValidate=false and matches(':disabled')=true. Form reporting returns false, but only the cancelled source invalid event fires and focus remains outside. The source still serializes once. No host should have to find and move generated markup to preserve the authored structure's semantics.

The synchronization block relocates the query when its form differs from the source form. That condition misses structural changes within the same form. The supplied first-legend test moves the generated wrapper as well as the authored wrapper, so it does not cover this public refresh failure. The correction must cover movement in both directions, form reassociation, removal and reinsertion, reset ownership and disposal while retaining draft and error state.

## Evidence and scope

All evidence is retained in tests/output/verification-combo-candidate-20261113-1441. probe.cjs runs a tagged control and both candidate forms serially across all three engines. Its terminal exit is 1, with six candidate parity failures retained in results.json and captures. The original required-placeholder control confirms the intended correction: the query carries aria-required without native required, static checking remains focus-neutral, source invalid is cancelled and query invalid remains uncancelled. Browser interactive focus is an observation of these profiles, not a component guarantee.

The five supplied focused suites pass 15/15 for source and 15/15 for minified assets, with terminal exits 0. Every raw and effective suite exit is 0, with no printed failure or timeout. Full output directories are copied into the independent evidence directory. Those passes do not close the new relocation failure. The independent probe does not certify font rendering or visual geometry because its minimal asset route did not serve fonts separately.

Source review found guarded attribute updates and reset generation/owner checks. The document-wide observer is installed per enhanced select and returns early for disconnected sources; the correction should explicitly account for detached lifecycle and observer feedback. No observer loop or performance failure was measured in this review.

## Provenance and handback

The source SHA256 is 56657ea0de59fdf3a153dda3117511bdf4b1f5d7ce27b0f96e88fae14d3428c8. The minified SHA256 is 4f5ce712ffa0e9b785402da0895ea673a24dbfc37c5e6ed5998e91bc78de4a63, and its map is e577db3a8f84d2d856246d2df8182655b432783b1cce9da99e3c9188aab7b857. audit.json records all held runtime, documentation, fixture and test hashes before and after with no drift.

All owned browser runners and servers have exited. Combo execution ownership returns to the lead. Packaging remains blocked pending correction and independent revalidation. No runtime, existing test, commit or package was changed by this review.
