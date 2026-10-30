# First token sweep preservation review

Independent verification accepts the first sweep for the Windows primary Standard preservation scope on 30 October 2026. This review does not establish Bevel conformance or release readiness. The remaining gates in [STANDARD-BASELINE.md](STANDARD-BASELINE.md) still apply.

## Candidate identity

The immutable candidate is `tests/output/skins-sweep1-source`. It copies the accepted frozen source and replaces only the two stylesheets below. Every other captured source input matches the accepted baseline. The live stylesheets still matched these candidate hashes after capture.

| Input | Candidate SHA256 |
|---|---|
| `dist/pudl.css` | `986ea0ddd19fb45e948d998b3688f1c32590bbba25f8b2e92124ae8d0115e68a` |
| `dist/pudl-windows.css` | `7a20ec831cffec69f904ee7664fc1081dd858fc317f8da794a439b38d75ffced` |

The capture harness, browser versions, operating system, Node, Playwright, conditions, result counts and fixture coverage match the accepted baseline. The coverage document's prose changed after baseline acceptance; its inventory tables are unchanged. Both inventory hashes remain recorded in their manifests.

## Evidence and initial mismatch

The complete candidate capture is `tests/output/skins-sweep1-capture`. All 24 profiles completed without browser errors, recording 154 catalogue cases and 14 live structural states per profile. The capture checked source hashes before and after execution.

The initial comparison found 47 of 48 observation files equal and all 672 image comparisons passing under the existing rules. Catalogue images required exact equality. A few live images used the previously accepted bounded raster allowance; their counts and bounds remain in `tests/output/skins-sweep1-comparison.log`.

The sole observation mismatch was Firefox at 360px, dark, explicit Standard, in the open menu fixture. Its `aria-labelledby` value was `menubar-t8`, while the baseline recorded `menubar-t16`. Geometry, computed styles and images matched. The initial absent/Standard check consequently passed 23 of 24 pairs. This review does not claim to have proved the cause of that generated-ID variation.

An isolated Firefox narrow dark structural capture using the unchanged candidate is retained as `tests/output/skins-sweep1-firefox-isolate`. Both absent and explicit Standard observations matched the original baseline exactly, all 28 images matched exactly, and the absent/Standard pair passed. The original mismatch has not been removed or normalized away.

Every profile now has a passing comparison against the original expectations, with the initial mismatch and passing rerun retained. The stylesheets were not changed during verification. No full-mode taskbar files or shipped assets were edited by verification.

## Retained logs

The following files remain under ignored test output alongside the immutable candidate and captures.

- `skins-sweep1-identity.json`
- `skins-sweep1-capture.log`
- `skins-sweep1-comparison.log`
- `skins-sweep1-selection-equivalence.log`
- `skins-sweep1-firefox-isolate.log`
- `skins-sweep1-firefox-isolate-comparison.log`
- `skins-sweep1-firefox-absent-isolate-comparison.log`

The accepted baseline archives remain unchanged and must be retained. No expected artifact was regenerated from the candidate.
