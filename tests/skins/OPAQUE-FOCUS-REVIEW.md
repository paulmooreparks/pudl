# Opaque Bevel focus correction review

The opaque focus correction fixes the original card-surface finding. This record retains the subsequent active-window and topbar findings. [CHROME-FOCUS-REVIEW.md](CHROME-FOCUS-REVIEW.md) records the later correction and its accepted scope.

## Candidate and method

The immutable candidate is `tests/output/skins-bevel-opaque-source`. Its generated stylesheet SHA256 is `c82a19c1268454a74b51066fb58748bcfe9dfab65f003c4f8c546858bb1016ac`. The component stylesheet hashes remain `71718982b16a2354380ea608976c93c53c02ec7b83db85bbb555d7bc413aac09` for `pudl.css` and `55a30c3e85501ec126d02c6543955dccbc5a7635dda0060efa93b758f268062f` for `pudl-windows.css`. The correction changes only Bevel's focus paints; Standard's captured styles remain unchanged.

The expanded `focus-review.js --extended` matrix contains ten Bevel scenarios per engine/theme pair. It checks keyboard focus on ordinary and destructive buttons, invalid fields and listboxes, neutral adjacent surfaces, an active window's Close button and a topbar status button. The test retains before/after screenshots and verifies `:focus-visible`.

The pixel helper samples the focused ring near the midpoint of each side and compares it with the actual adjacent rendered surface outside the ring. It also records the strongest before/after pixel change for diagnosis. These measurements are different when focus replaces existing bevel lighting. A high maximum change at one highlight pixel does not prove sufficient contrast around the ring. The first extended probes used before/after changes or sampled too far out for a two-pixel ring; those probe artifacts remain separate from the accepted adjacent-surface measurements.

The final observations are in `tests/output/skins-bevel-focus-adjacent/results.json`, and the log is `tests/output/skins-bevel-focus-adjacent.log`. The matrix ran in Chromium, Firefox and WebKit on Windows, using both theme forms. Original frozen Standard remains a separately recorded control and is excluded from Bevel's pass count.

## Results

Bevel passes 51 of 60 scenarios. Ordinary and destructive buttons pass on cards. Invalid fields and listboxes also pass, exercising the opaque danger focus paint. Ordinary buttons pass against page, alternate-surface, input and recessed backgrounds in both forms. Dark topbar status focus passes at 4.914:1.

The following failures reproduce in every engine:

| Context | Light | Dark | Requirement |
|---|---:|---:|---:|
| Active-window Close | 1.34 to 1.36 | 1.30 to 1.31 | 3:1 |
| Topbar status | 1.791 | Passes at 4.914 | 3:1 |

The active window uses an accent title gradient, so the accent focus ring has little contrast against it. In the light theme the topbar is dark while the accent is also dark. A single root-level accent paint cannot cover these contexts.

The recommendation is to give active title bars and topbar chrome their own compiler-owned focus paints, with unchanged Standard fallbacks in the component styles. Those paints must consume the effective palette and preserve existing placement, thickness, keyboard behavior and forced-colour handling. The architect owns the contract and source changes.

## Scope

This review closes the original neutral-card correction only. The runtime's 51 passing checks, the 24 passing behavior suite runs and the earlier surface/geometry/contrast evidence remain separately recorded. The remaining conformance gates are not inferred from these results. No source, specification or full-mode taskbar files were changed by verification, and all browser/server jobs have finished.
