# Initial Glaze review

The initial Glaze palette failed category separation in dark mode. The corrected candidate passes the independent palette, rendered-gradient and applicable rounded-focus checks. These checks do not establish release admission.

## Candidate identity

The initial source remains at `tests/output/skins-glaze-source`. The corrected source is retained separately at `tests/output/skins-glaze-corrected-source`. Its `verification-identity.json` records all relevant hashes and explains the overlay: only the corrected Glaze definition and generated stylesheet replace the initial snapshot. The inherited `source-state.json` describes an earlier Gel snapshot and must not be used as the corrected Glaze identity.

| Corrected input | SHA-256 |
| --- | --- |
| dist/pudl.css | 71fdfc7187cd3d2ab66602cc5a38891b8f8754161b4167782307e9ab9ffc05a0 |
| dist/pudl-windows.css | 548c9158284fd42d2bd9a73b4ceef9a2426dfa555b0d5d9113fb46b6141f7f8d |
| samples/skins-glaze.css | a31493999a6b1aafd05a46cc17c921b0b10f4587fbc4f7f938fbe5f8e8f6dd65 |
| skins/glaze.json | e8e27efd5de8347a08221508819e33a53961db39cd8faf50250985afe15d10d7 |

The runs used the same Windows browsers and bundled-font conditions described in [GEL-REVIEW.md](GEL-REVIEW.md).

## Findings and correction

The first dark accent, `#84b8ff`, was 7.160 OKLab units from canonical category 7, below the required 8. All three engines reproduced this. The original run remains at `tests/output/skins-glaze-palette`, with 717 of 720 checks passing.

Architecture changed the dark accent to `#80c4ff`. The independent rerun at `tests/output/skins-glaze-palette-independent` passes all 720 checks across Standard, Gel and Glaze in both forms. It confirms canonical category assignments, contrast of at least 3:1 against background/surface/input surfaces and category-to-accent separation of at least 8. Glaze's minimum category-to-accent distance is 9.123 across both forms. The palette harness does not retest all status hue and colour-vision simulation requirements.

## Rendered evidence

The geometry review at `tests/output/skins-glaze-geometry` passes 912 checks on the initial palette. The corrected candidate changes palette paint only; this geometry result is not represented as a new corrected-palette geometry run.

The corrected gradient run at `tests/output/skins-glaze-gradient` passes 96 checks. It uses the same exposed-background glyph sampling and control states described in the Gel report. The lowest measured text contrast is 5.126:1 on the dark destructive button at rest and focus.

The corrected rounded-focus run at `tests/output/skins-glaze-focus` passes all 66 applicable gates. Six CSS-only inactive-window observations remain diagnostics, and six Standard controls remain outside the Glaze gates. No fresh live Glaze activation result is claimed. Representative light and corrected dark desktop preview images were inspected without an additional visual blocker.

The targeted Standard comparison at `tests/output/skins-glaze-standard` passes 81 comparisons with all preview skin stylesheets loaded. It covers 72 original-versus-current Standard computed and raster comparisons and the nine retained Bevel forced-colour checks. As in the Gel review, these targeted comparisons supplement the accepted complete baseline rather than replacing it.

## Limits

Full behavior under Glaze, other gradient surfaces, live chrome activation, visual RTL, actual browser zoom, Linux, blocked/system fonts, manual screen-reader interoperability and release admission remain separate gates. Preservation expectations and shipped assets were not changed by verification.
