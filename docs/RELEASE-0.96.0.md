# PUDL 0.96.0 release record

Paul requested publication of the new skins and themes on 1 November 2026 after approving their preview appearance. This release includes Matte, Ink, Alloy and Glass, revised Bevel, Gel and Glaze focus treatment, the Glass title-bar correction, and the three companion colour themes. It implements specification 0.52.2. The separate static execution-state candidate is excluded and must receive a later implementation version if published afterwards.

## Candidate and ownership

PUDL Team Lead owns release preparation and publication. The implementation is in the original PUDL checkout on `release/skins-themes`, based on `cab552a`. The `.codex/`, `.devin/`, `CARRYOVER.md` and four existing mockup files remain unrelated and unstaged.

The designs and implementation evidence are in `docs/proposals/material-skins.md`, `docs/proposals/skin-palette-refinements.md`, `tests/skins/MATERIALS-IMPLEMENTATION.md` and `tests/skins/PALETTE-REFINEMENTS.md`. Initial material measurements describe earlier bytes; the later refinement record identifies the current source manifest and retained failures. The revised stylesheets remain unadmitted until independent review accepts their hashes. Publication authorization does not itself establish admission.

## Validation and remaining gates

Prior focused verification passed the companion palette and material browser checks in Chromium, Firefox and WebKit, in readable and minified forms. The rendered focus checks passed 198 admission cases. The normal affected integration matrix retained two Firefox timeouts; both passed full isolated runs, but their causes remain unproven. These are pre-release candidate results, not the final broad matrix.

Independent source and rendered review must close before admission is recorded. The release then requires generated-asset checks, a source freeze, full normal and minified browser matrices, reference-page review, exact-path commit and immutable tag, a tag-derived archive and checksum, downloaded archive verification, CDN byte verification and CI. Native browser zoom and manual screen-reader interoperability remain unperformed unless later evidence states otherwise.

The final test runner will retain complete per-suite output and unique screenshot directories so isolated reruns cannot overwrite failure evidence. The suite timeout is raised explicitly for this release because the expanded Firefox skin suite passed in isolation in 186.7 seconds, exceeding the normal 120-second budget. The ordinary timeout and earlier failed results remain documented.

## Publication

No tag, archive, checksum or release page has been published for this candidate. Final results and immutable identifiers will be recorded here.
