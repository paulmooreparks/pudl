# Accepted Windows Standard preservation baseline

Independent verification accepted the Windows primary preservation baseline on 30 October 2026. This acceptance permits the shape-token sweep to begin against the fixed expectations below. It is not Bevel conformance or release sign-off.

## Scope and identity

The baseline covers Chromium, Firefox and WebKit at 1280 by 900 and 360 by 900 CSS pixels, light and dark forms, and absent versus explicit `data-skin="standard"`. Each run contains 24 profiles. Every profile records 154 catalogue cases and 14 live structural states. The catalogue cases comprise 63 base components, 51 variants and 40 declared states. Live fixtures include generated chrome, menus, title status, window placements, stacks, context menus, Arrange, content shells, toasts, diffs and tooltips.

The host was Windows 10.0.26300 with Node 24.4.1 and Playwright 1.63.0. Actual launched versions were Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6. The manifests record executable paths, headless mode, source hashes and capture conditions. Bundled Inter responses and font readiness were verified. `environment-windows.json` records 20 installed fallback/native-font hashes without claiming which fallback every engine selected.

The snapshot identifies HEAD `f04c2b0cddd7d815af21809fb7270f3457a7bf8b` and retains dirty-file hashes. Its window script includes unfinished full-mode changes. This baseline does not approve that feature. The skin capture uses always-mode fixtures, and full-mode work was left untouched.

| Input | SHA256 |
|---|---|
| `dist/pudl.css` | `a9e089b81f3e7ded1a38eed2f004a8d435cef39d3cafc24962aa3324e8866a03` |
| `dist/pudl-windows.css` | `416ee66613ac2ca2b8c3bd7c4b6d55a8a608fa9859097267e1c1dff5c3eb95b1` |
| `dist/pudl-windows.js` | `1093f9af56e431fcc9cacb4d8888dbbbe8f17476e637bd8449db03436ba1e9e8` |
| Capture harness | `b8efb687cff8e34688d8437fcc446816c89420fbf7724b0a08071727cdb1817c` |

## Repeatability evidence

The captures are `tests/output/skins-standard-baseline1` and `tests/output/skins-standard-baseline2`. Their source hashes, harness hash, inventory hash, OS, Node, Playwright, launched browsers and capture conditions match. Both report zero browser errors. Source hashes were checked before and after each run.

The repeatability comparison reports 48 observation files with zero differences and 672 passing image comparisons. Catalogue images require exact equality. The live-page allowance permits at most 100 differing pixels with a maximum per-channel difference of 12; every occurrence is recorded in `tests/output/skins-standard-repeatability.log`.

All 24 absent/explicit-Standard pairs also pass in `tests/output/skins-standard-selection-equivalence.log`. Representative keyboard-focus, narrow-menu and dark-stack images were visually inspected.

Earlier probe directories are not accepted expectations. They exposed harness issues involving unfinished transitions, pointer hover during keyboard scrolling, zero-area option coordinates, asynchronous menu reconciliation and nested variant targets. Those issues were corrected before the accepted captures. No product conformance failure is waived by this baseline.

## Retained artifacts

The expected results, original source inputs and exact tooling are retained separately. They remain under ignored test output to avoid adding approximately 37 MB of binary capture data to the source tree without a retention decision. Git alone does not retain them. The bundles must remain available while this baseline is used; moving them requires updating this record and verifying their hashes.

| Bundle | Bytes | SHA256 |
|---|---:|---|
| [Source inputs](../output/skins-standard-source-20261030.tar.gz) | 5749545 | `af7c345b451c58d7e1cc12c39733b79ea86b52366f9cf013ab0568150341b277` |
| [Expected results](../output/skins-standard-observations-20261030.tar.gz) | 30756014 | `8950577fdc6fe8a25dc7a0582517d1279ab800aaba4e748da4511571d9642f30` |
| [Tooling and original inventory](../output/skins-standard-harness-20261030.tar.gz) | 16025 | `da325489f3e206d6dd9134767782e53dc4e114f5b364a67a4d2b70d495c6a466` |

Expected artifacts must never be regenerated from replacement tokens. Future checks use the retained results or reproduce the old source with the retained harness, while recording the candidate's new source identity separately.

## Remaining gates

This acceptance covers the Windows LTR primary matrix. RTL, forced colours, Linux, system-font and blocked-font comparisons remain supplemental gates. The frozen source can supply independent expectations for those environments after live implementation begins. Actual browser zoom and manual assistive technology interoperability remain unverified.

The applet and region fixtures capture visual shells rather than lifecycle behavior. Hidden catalogue parts retain computed observations but do not prove their visible interaction states. Existing behavioral suites and the skin conformance matrix still need to exercise those states.

Contrast, target sizes, clipping, reflow and category recognizability remain independent requirements. Preserving an existing appearance does not certify it. Bevel must pass its approved surface treatment and shared accessibility rules before admission to a release.
