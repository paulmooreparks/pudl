# PUDL 0.96.1 release record

Paul authorized completing the skins/themes release and its fixes. PUDL 0.96.1 is the successor candidate to the held immutable 0.96.0 prerelease at 95725bc. Publication remains pending corrected validation. The prior record and raw failures are retained in [the 0.96.0 record](RELEASE-0.96.0.md).

## Scope and admission

All seven skins, three palettes, Glass translucency/halo, static execution glyphs and title-only suppression retain the independently admitted product bytes from 0.96.0, except the core stylesheet version comment. The [admission report](../tests/skins/RELEASE-0.96.0-ADMISSION.md) retains its exact hashes and Windows/enhancement/fallback, native-zoom, manual-screen-reader and capture-provenance limits. The version comment does not alter rendered CSS.

## Corrected release checks

The runner rejects printed FAIL lines and positive FAILED summaries regardless of a zero child exit. It records raw and effective exit codes. Three non-browser tests and independent replay of all 690 retained logs pass, correctly identifying 343/345 successful executions per form in the original matrices. The failing suite now returns failure status.

The focus test formerly clicked a window then pressed Shift alone. A reviewed diagnostic ran the original sequence and real Tab navigation against both immutable tags in three engines and both asset forms. All 24 navigation observations showed the required ring; the Shift-only failures were identical on both tags in Firefox/WebKit, where :focus-visible did not match. Independent assessment passed attribution and source review. The corrected actual test retains its original ring assertion and additionally checks leaving and returning to the header. Independent actual-suite reproduction remains pending.

CI artifacts establish that its depth-one checkout lacked cab552a, causing the palette baseline route to fail before comparison. Browser and minified jobs now fetch complete history. The test pins cab552a9131950ec502906d0c187f354d6a1874f and preloads both baseline CSS buffers before any browser launch. A non-browser depth-one clone reproduces the explicit setup failure; fetching history makes both buffers match their immutable source bytes. Evidence is tests/output/release-0960-baseline-preflight/results.json. Corrected Linux CI validation remains pending.

## Remaining gates and ownership

PUDL Team Lead owns publication. Verification owns independent reproduction and review; Build and Release audits evidence and packaging. The shared browser reservation follows Dinah Release and Front End's already-reserved checks. Front End must explicitly hand it over. Actual-suite reproduction runs first. Full serial normal/minified matrices may follow only after the CI blocker is resolved and the candidate frozen; otherwise the slot is released. No browser jobs run while queued.

Corrected full matrices, full-log audit, final reference/version review, immutable archive/checksum, public-download/CDN verification and CI must complete before adoption. The 0.96.0 tag will never move. A final publication status will be added here when supported by evidence.
