# Skin and palette refinement verification

Paul requested the changes on 1 November 2026 and approved the visual direction after seeing the updated previews. The design is in [skin-palette-refinements.md](../../docs/proposals/skin-palette-refinements.md). This record describes implementation and self-verification. Independent admission and publication remain outstanding.

Glass now gives the whole title bar one opaque reading surface, removing the individual title and status background patches. Its frame can remain translucent. Revised skins use two-pixel focus shadows with opaque accent paint softened by 15% surface colour. Standard retains its prior three-pixel translucent fallback. The Bevel, Gel and Glaze colour themes each provide light and dark forms and can be selected independently of the skin through `data-palette`.

## Evidence

The skin compiler, definition and categorical-separation unit tests pass 16 of 16 (`tests/output/palette-refinements-units.log`). The categorical checks cover semantic separation, neighbouring categories and simulated colour-vision deficiencies for all six companion palettes.

The final rendered focus runs passed all 66 admission scenarios per released skin across Chromium, Firefox and WebKit, for 198 passing cases. The logs and before/after screenshots are in `tests/output/refined-focus-{bevel,gel,glaze}-final/` and the corresponding `.log` files. Inactive-title CSS-only cases remain diagnostic because the window manager activates the window on real focus. Standard controls remain recorded separately and retain their known low-contrast halo.

An earlier Gel corner case measured just under 3:1 with the more heavily softened paint. The final 85% accent paint passed the same rendered perimeter checks with the two-pixel shadow. The rounded capture helper now records the current ring width when reporting nominal indicator area. Earlier capture metadata assumed three pixels for that optional field; the contrast checks did not use it. A separate two-pixel metadata check passed all 182 sampled profiles and reported the corrected area in `tests/output/refined-focus-area-two-pixel-result.json`.

The material browser suite passed 10 of 10 against the final minified candidate in `tests/output/palette-refinements-final-min.log`. That combined log also retains three failed companion-test fixture comparisons from before font URL handling was corrected; those failures are not counted as passing theme checks. The material cases cover geometry, mounted content, controls, forced colours, print, arbitrary Glass backdrops, reduced transparency and the opaque fallback.

The companion browser suite checks all three themes in both forms against every skin, reading and syntax contrast, semantic glyph contrast, focus contrast, category contrast, primary and topbar text, preserved edits and body identity, URL restoration, request-free selection and media exclusion. It also compares Standard's focused paint and geometry against `cab552a` in both forms. Development logs retain palette contrast failures, transition snapshots and a print-mode attempt to use a hidden preview selector. The final fixture disables transitions for settled-paint comparisons, resolves minified font URLs as they resolve from `dist/min/`, and uses the documented root attribute when print hides the selector.

The final companion browser suite passed 4 of 4 against readable files and 4 of 4 against minified files (`tests/output/palette-refinements-themes-verified-normal.log` and `-min.log`). Each browser checked all 48 theme/form/skin combinations, along with Standard preservation, live selection and media exclusions.

PUDL Team Lead inspected the Glass title-bar screenshots and all three matching themes in light and dark. The images are in `tests/output/palette-refinements/`. This is self-review and does not replace independent rendered admission.

The integration matrix passed 9 of 9 against minified files (`tests/output/palette-refinements-integration-min.log`). The normal matrix passed 7 of 9, with Firefox `skins` and `window-states` stopped at the runner's 120-second limit (`tests/output/palette-refinements-integration-normal.log`). Both passed isolated normal-file runs. The skin suite passed all ten checks in 186.7 seconds; its final unchanged runtime test alone took 80.6 seconds. The state suite passed its geometry, aggregation, compatibility and folded-status checks. Complete output is retained in `tests/output/palette-refinements-firefox-{skins,states}-isolated.log`. The longer successful runs do not establish the timeout causes or make the aggregate run clean. Matrix screenshot files were copied into `tests/output/palette-refinements-matrix-screenshots/` before the isolated reruns.

The companion generator freshness, semantic palette units and browser checks are included in the ordinary runner through `tests/palette-themes.test.js`. The source, definitions and generated-asset hashes are recorded in `tests/output/palette-refinements-candidate-hashes.json`; this mutable evidence record is excluded. These are review artifacts, not a release freeze.

The new ordinary-runner entry passed all three engines against readable files and all three against minified files (`tests/output/palette-refinements-ci-{normal,min}.log`). The normal Firefox run took 74.6 seconds, below the runner limit. The temporary lead-owned preview-test server and all verification jobs have exited. The execution-state candidate's review hashes were checked again and remain unchanged.

## Admission and release boundary

The revised Bevel, Gel and Glaze bytes invalidate their earlier admission hashes. Their working registry entries are unadmitted while retaining the old approved hashes as history. The new material skins also remain unadmitted. The ordinary candidate-generation check passes; the release gate intentionally rejects this registry. Published packages are unchanged.

This work is in the original PUDL checkout. The static execution-state candidate remains isolated in `pudl-state-release` and has not received these changes. Neither candidate has been published. Actual browser zoom and manual screen-reader checks have not been performed; prior enlarged-text material checks do not establish those results for this revision.
