# PUDL 0.106.0 release preparation

PUDL 0.106.0 preparation combines the accepted taskbar stack appearance, stronger Standard raised boundaries, Alloy Bold and correction of the default title/detail separator. Publication follows the full hosted release gates; the candidate review itself is not a release. Paul approved the visual candidate and in message 5469 authorized delivery into GK Companion, including publication and consumer intake after the required gates pass. The standalone Editor work follows that delivery and the host's garbled Open Document label correction.

## Accepted appearance

The visual candidate is `8739390d5601a1f063024c2ad4eb4489f2ecf70046d40c3a97b485ef4508f447`. Its archive SHA-256 is `6fcfe12338eccf8f25622ce02cc0cf8abdeeff08d16ee2d8a1149fcd2e9628ec`. All 413 packaged files, including 196 distribution files, were verified against its manifest. Independent review and Paul's visual acceptance are captured in the [decision record](proposals/standard-boundaries-alloy-bold.md) and [Alloy Bold admission](../tests/skins/RELEASE-0.106.0-ADMISSION.md).

Two windows receive one rear edge, and three or more receive two, while the exact count remains. The decoration uses existing spacing and preserves foreground state marks. RTL mirrors it. Standard boundaries strengthen raised controls while flat dividers remain unchanged. Alloy Bold supplies Alloy control treatment with Standard active-title colors. The existing default skin remains unchanged.

## Separator correction

The 0.105.0 stylesheet and script contain a doubly encoded separator. The corrected files contain one UTF-8 middle dot, with a space on each side. The regression checks independent stylesheet fallbacks, title-bar and taskbar rendering, accessible names and custom separators. The final readable and minified inputs passed the separator regression in Chromium, Firefox and WebKit.

The new regression also exposed an existing custom-separator inconsistency. The layer receives the separator token, but taskbars outside that layer cannot inherit it. Live DOM inspection confirmed that the title detail inherited the custom separator while the taskbar detail had no token and used its stylesheet default. Each rendered item detail now receives the same separator explicitly, so dock, taskbar and chooser entries agree with their accessible names. Original failed probes and live-state evidence remain under `tests/output/release-01060-separator-*`.

## Required release gates

The final inputs must pass generated fonts, token/schema checks, release skin freshness, unit tests, minifier freshness, complete readable suites in Chromium/Firefox/WebKit and the complete minified Chromium suite. The reference page requires inspection in both themes. Package closure, immutable commit/tag identity, hosted CI, public archive/checksum and CDN verification remain required before declaring a published release. No hosted CI, commit, tag or publication is claimed here.

The first complete local attempt was stopped after an unintended legacy-codepage round trip in the version-update helper changed reference-page Unicode text. That file and the base stylesheet were reconstructed from their original UTF-8 bytes with only the intended version and approved border changes. The incomplete run remains in `tests/output/release-01060-full-source` and is not counted as a release pass. The release instructions now require explicit UTF-8 reads and writes and a bounded version diff.

The next broad local runs exposed token freshness in both readable and minified Chromium: the approved Standard paint declarations had been placed inside the generated specification block. That block is now regenerated unchanged from the vendored specification, and the Standard paint override follows it as authored component styling. No vendored token or generator formula changed. The interrupted broad runs remain under `release-01060-full-source-clean` and `release-01060-full-minified`, with completed-suite summaries and original failures retained. Final-input focused matrices and hosted full release-commit CI provide the replacement gates; incomplete local runs are not counted as complete passes.

Generated fonts, the 20 build unit checks, release skin hashes, minifier freshness and package closure pass locally. The planned package resolves 970 local references across 505 files, including all 196 distribution files. The reference page passed Start and launcher checks in both themes without browser errors, and its complete light/dark captures were inspected. The final-input focused matrices passed all 36 suite runs, six suites in each engine for readable and minified assets. Hosted full-suite CI remains the publication gate.

## Host adoption

Hosts replace the complete distribution. Hosts offering Alloy Bold add `pudl-skin-alloy-bold.css` to each document that renders PUDL, including separate slideshow documents. Existing selection and pin preferences require no migration. Remove title-separator workarounds only after verifying the corrected release. A release does not change the chosen default skin or authorize consumer installation, restart or deployment.

Physical touch, manual assistive-technology checks and omitted live-host chat state cases remain unclaimed. The scoped independent host audit is evidence for the reviewed candidate and its stated limits.

Dinah's follow-up in message 5468 reports a separate installed GK Companion theme failure: its rendered Standard primary-text measurement was 4.52:1 in the hidden audit and 4.46:1 on Paul's machine. The host reports darkening its light accent, hover and danger colors to a minimum 5.02:1 across nine skins and adding a 4.9:1 internal guard. It attributes the difference to font-sensitive rendered sampling and reports the fix installed and pushed. PUDL did not independently repeat that host fix. The earlier sixteen-theme audit therefore retains its machine and font scope; it does not guarantee every consumer environment. The shared Alloy Bold four-palette audit has a measured title-text minimum of 5.136:1.
