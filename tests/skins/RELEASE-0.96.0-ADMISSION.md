# Independent PUDL 0.96.0 admission review

Admission was recorded on 1 November 2026 for the exact hashes below, following the completed independent review. No concrete blocker remains in those checks. Bevel, Gel, Glaze, Matte, Ink, Alloy and Glass, and the Bevel/Gel/Glaze companion palettes, are eligible for admission at the exact hashes below within the tested Windows scope. The review itself did not change the registry or publish anything. Final release gates and explicit disposition of the recorded environment limits remain required.

The reviewed runtime/assets are commit `c379900ba0326438d4032aadc87b8cefe5c5be69`. Subsequent commits changed the excluded release record. All 108 entries in `release-0960-focus-correction-hashes.json` matched before the final run and after it. Its SHA-256 is `43f368975e63d0b20580b6574fdd668e219f7f026a0cd661f5916e29936432e8`. The complete 97-file vendor set matches immutable specification v0.52.3 at `4917bf70a097fcefb8c42645504b30c03e6105c7`. Candidate generators, token freshness, all 44 minified copies and whitespace checks pass; the source-unit run passes 16/16.

## Completed gates

| Check | Result | Evidence under tests/output/ |
| --- | --- | --- |
| Strict corrected Glass focus | 66/66 required cases | release-0960-focus-correction-independent/ and adjacent log |
| Remaining Alloy focus | 66/66 required cases | release-0960-admission-resume/alloy-focus/ |
| Glass menu/stack/snap/dock behavior | 24/24 engine/form/suite pairs | release-0960-admission-resume/glass-behavior/ |
| Narrow RTL, blocked/system fonts, actual doubled computed text | 168/168 | release-0960-admission-resume/environments/ |
| Canonical palette/category/status separation | 3408/3408 | release-0960-admission-resume/palettes/ |
| Material/companion browser contracts | 14/14 normal and 14/14 minified | release-0960-admission-resume/material-normal.log and material-min.log |
| Static-state and title suppression palette/skin cross-product | 576/576 normal and 576/576 minified | release-0960-admission-resume/state-palette-normal/ and state-palette-min/ |
| Targeted combined integration | 24/24 normal and 24/24 minified | release-0960-admission-resume/integration-normal/ and integration-min/ |
| Emitted positive paint and later host overrides | 126 combinations each | release-0960-admission-resume/extra-settled.log |

All browser matrices include Chromium, Firefox and WebKit unless explicitly limited below. Targeted integration ran one suite at a time with a recorded 300-second timeout. It covers palette themes, taskbar row height, state presentation, title layout, existing state geometry/aggregation/forced-colour contrast, detail, hidden-dock refresh, status reservation, real pointer/wheel behavior and focus return. These are the affected admission suites, not the complete repository release matrices. The review also inspected representative final narrow/doubled-text Glass and RTL Ink captures, in addition to the earlier full-size skin, title and halo captures. The material tests cover geometry and semantics, mounted edits, request-free selection, host precedence, media exclusion, nested-root selection, opaque fallback, Chromium reduced-transparency emulation, actual frame/header transmission and viewport-contained menus.

The per-skin catalogue and rendered-text checks combine earlier unchanged-paint evidence with completed follow-up runs. Each catalogue covers all 154 declared cases in both forms across the three engines. Required focus excludes Standard controls and CSS-only inactive-window diagnostics. The existing Standard low-contrast halo is preserved as a diagnostic and is not relabelled as a new-skin pass. The companion browser checks compare Standard focused paint/geometry against cab552a in both forms.

| Skin | Catalogue checks | Rendered text samples | Required focus | Live focus |
| --- | --- | --- | --- | --- |
| Bevel | 1170/1170 | 96/96 | 66/66 | 6/6 |
| Gel | 912/912 | 96/96 | 66/66 | 6/6 |
| Glaze | 912/912 | 96/96 | 66/66 | 6/6 |
| Matte | 1170/1170 | 96/96 | 66/66 | 6/6 |
| Ink | 1170/1170 | 96/96 | 66/66 | 6/6 |
| Alloy | 1170/1170 | 96/96 | 66/66 | 6/6 |
| Glass | 912/912 | 96/96 plus dedicated halo checks | 66/66 corrected | 6/6 |

The earlier results are retained under release-0960-independent/, release-0960-independent-combined/ and release-0960-independent-final/. Their source limits and interruptions remain in release-0960-independent-review-focus-blocker.md and its linked predecessor records. Skin/theme asset hashes were checked at every stage. The current Glass correction changes only its ordinary focus mix; the lettering, other paints and shared runtime remain unchanged. New combined material and integration checks bind the final integrated bytes.

## Findings resolved and evidence retained

The transmitted-header lettering failure is closed for Chromium with explicit no-preference transparency. Independent normal/minified checks pass 288/288 across four palettes, with minimum core contrast 6.9027544896:1 and nearest-clear-edge contrast 6.8468788543:1. Narrow/ellipsized and actual doubled-text checks add 72/72, with stable boxes/text ranges across the normal, hidden-text and neutral-mask captures. A no-halo negative control fails 24/36 cases as expected. The method measures actual opacity-composited pixels against glyph-shaped backing, with its sampling limits documented in release-0960-halo-source-review.md. The independent images and results remain under release-0960-independent-halo/.

The separate Glass dark input-background focus failure is closed by the unchanged strict 66-case gate on the 90% accent/10% surface paint, retaining 2px width. Firefox and WebKit now pass all 196 profiles with minima 3.2387988342:1 and 3.1986939535:1. Their original 2.983300/2.983919 failures remain preserved with exact image/helper hashes in release-0960-independent-final/focus-failure-provenance.json. The focused closure record is release-0960-focus-rendered-closure.md.

Earlier Glaze and Alloy runs stopped on Firefox page.close protocol errors. Their partial records are retained, with cause unproven. Completed unchanged-candidate repeats supply the required gates; incomplete runs were not counted as passes. Earlier Ink/Alloy and broader behavior runs interrupted for scope or scheduling changes remain partial evidence.

The supplemental host-precedence probe initially sampled an active background-colour transition and failed. Its original extra.log remains. The separate extra-settled.log records the correct host accent during that transition, the active transition properties, and the expected settled component paint; the corrected probe passes all three engines in both forms. This is a demonstrated probe-timing defect, not a repaired runtime defect. The original stage summary still contains its failed exit status. Also, the earlier suggestion that --positive sampling missed --pr is withdrawn: core CSS already aliases --positive to --pr, including at c24f534. Explicit --pr measurements are additional coverage.

The initial independent no-halo raster pairs were overwritten during experiments. The report and script survive, and the replacement no-halo reproduction is labelled replacement evidence. The new independent halo captures and negative control do not recover those original pairs.

## Limits and release boundary

Independent rendering was on Windows. Chromium explicitly exercised the enhanced translucency path. Firefox and WebKit do not report the transparency preference on this workstation, so their results certify the opaque fallback rather than enhanced translucency. Unsupported-filter checks simulate an unavailable feature query on current engines; they do not establish old-browser compatibility. Native browser zoom, manual screen-reader interoperability and a complete Linux rendered admission matrix were not performed. Actual computed text enlargement is recorded separately from native zoom. Arbitrary host palettes still require host validation.

The release must record admission for these exact hashes, regenerate the catalogue as required, freeze the final release metadata/assets and complete the full normal/minified repository matrices, package/reference review, immutable archive/checksum, public-download/CDN integrity and CI. This review does not label those future gates complete.

## Exact reviewed assets

| Asset | SHA-256 |
| --- | --- |
| dist/pudl.css | `f682ab38925c94f90bdbe3aff69f65ae5bd600f192fe620fea6e2c924456a90e` |
| dist/pudl-windows.css | `998c8f429b2b3d341ec7c2f3355ee7f92e36f6dee67a35b20dac0cc679bda72f` |
| dist/pudl-windows.js | `8704e0f661f85a9817301331e461eeed8609cd0ec8cb9a4bcd450f12057e5f3e` |
| dist/min/pudl.css | `fafcaac09928074e5d07267f432c1c458438f6f75134da602c25227e32260ee8` |
| dist/min/pudl-windows.css | `608f4278d5f34fcb869262be49ad7e34e787abc3b1719c3203bb60e3d670216d` |
| dist/min/pudl-windows.js | `698c92d5fe51eca60bbe09a0939bff0b1341c2fe66990c9582642f1d4636bdea` |
| dist/pudl-skin-bevel.css | `b53aed80c2ed88019e0431bb1acb151a30d23404d2d0e9b29ab91d91d1125057` |
| dist/min/pudl-skin-bevel.css | `13567f0fc2cb036947e2f18abab1d7014c0b499f5314af97980e464b6260ea3b` |
| dist/pudl-skin-gel.css | `ba5ee07b9342c11620998faf5c8f6d3117660b3fa1ec3978e3270e168c6126a4` |
| dist/min/pudl-skin-gel.css | `b22b8a5cc850f1530283643517326c7624011549eb58c92b163fc8d721c496ac` |
| dist/pudl-skin-glaze.css | `2ed6de7ffc5d8ab7c388414df00613bf13993e969dce4f8a0f54087f039e2b4b` |
| dist/min/pudl-skin-glaze.css | `d3a487573c794b2d10afef8cbaa1ea13b229944285dc21f83b15a42aad83c345` |
| dist/pudl-skin-matte.css | `e9503d2c96d009afa7b4d64638824af5322a3c344fa22760594a638aaa72f2fe` |
| dist/min/pudl-skin-matte.css | `df905f383463e7cf00d783ad10991e20db4907614d86ea16b76470d5adeccf4d` |
| dist/pudl-skin-ink.css | `4365295fd6cdadb961fdc64d09611425a0cc2f40d2034527eccde0120e02e60d` |
| dist/min/pudl-skin-ink.css | `c9ad69abe9baba0023b375082d4bbd75f40fb47582f14285c50ef0ed2194808d` |
| dist/pudl-skin-alloy.css | `c62fd11e99c0278664c897dece48bbbda0bf429aba93caaa6beb5b365555e155` |
| dist/min/pudl-skin-alloy.css | `ff9f93c58dd5a24943a6bb503d9e05348d1cc7c5b3ae5d713949fcf6550e7346` |
| dist/pudl-skin-glass.css | `3b89d92a98c57c09c9df2833a006da47332158807cd1f6a9009c675e15711993` |
| dist/min/pudl-skin-glass.css | `4ad04815296191f85aafe7e123928eea2859f654a86c319b007671bf3e96cb31` |
| dist/pudl-theme-bevel.css | `0556431818daad8729de2e5c2653068b8c4cfc5c64f55cab8b666ed83e74e884` |
| dist/min/pudl-theme-bevel.css | `cd43a530f0f9f169f96078e95eb0b3d5268ed1d99a32baec7d2f83e2bd10a9bf` |
| dist/pudl-theme-gel.css | `fa6279065304146ea4b0feff36816e34196f9c348703e014e1611851ed3ecc99` |
| dist/min/pudl-theme-gel.css | `cfdc46c571962b177ec890d1cd921014625b5ebfe555f9be780087fee7234d2e` |
| dist/pudl-theme-glaze.css | `1b9b6a9049074a2ab342d2bb8cf7de82bbb8351a98ec586f5a60bc8e3f5dd44f` |
| dist/min/pudl-theme-glaze.css | `f1c7f78ff195a0447fbc350b592b53f4df1095c183aba40cba5821e13ca6b0ac` |

## Cleanup

All verification runners, browsers and temporary servers exited normally after the final checks, and no review process remains. The manual preview server on 8787 was untouched. The review changed no source, asset, registry, commit or publication.
