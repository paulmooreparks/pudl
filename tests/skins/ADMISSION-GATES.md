# Skin release verification

This record consolidates independent verification for Bevel, Gel and Glaze. Initial preview passes are scoped evidence. Final admission must identify the generated distribution files and changed runtime modules that the release actually packages.

## Existing evidence

| Gate | Evidence |
| --- | --- |
| Standard baseline | STANDARD-BASELINE.md and sweep preservation reports |
| Bevel surfaces and destructive text | SWEEP2-BEVEL-REVIEW.md |
| Bevel focus and generated chrome | OPAQUE-FOCUS-REVIEW.md and CHROME-FOCUS-REVIEW.md |
| Loaded-link availability runtime | RUNTIME-REVIEW.md |
| Gel initial rendering | GEL-REVIEW.md |
| Glaze initial rendering and corrected palette | GLAZE-REVIEW.md |

The earlier reports retain inherited Standard focus failures. Those failures must not be relabeled as new-skin passes or silently removed from the accepted preservation expectations.

## Final candidate requirements

The final package must pass definition/compiler rejection tests, skin asset freshness, minification checks and normal/minified broad suites. Its skin CSS must match the independently reviewed paints or receive further rendered review. The release catalogue must identify the admitted files. A successful runtime registration only establishes that a stylesheet is available.

Host-owned persistence requires independent startup and storage-event checks for both theme and skin scripts, including unavailable preferences and preservation of mounted content. The final source hashes must be recorded after integration freezes.

The full-mode taskbar feature was last handed to verification as an intermediate candidate with a WebKit focus investigation open. Its final disposition and normal/minified `taskbar-stacks-full` results are required if it is included in this release.

## Supplemental work

Supplemental runs extend behavior coverage to Gel and Glaze, inspect live window activation with rounded chrome, and exercise narrow preview layout in RTL, blocked-font, system-font and enlarged-root-text conditions. Enlarged root text is a distinct test and cannot establish actual browser zoom coverage. Supplemental results will be recorded with their immutable inputs and original failures.

## Unverified environments

Actual browser zoom and manual screen-reader interoperability remain unverified. Supplemental Linux coverage is now recorded below; it is not a complete Linux rendered conformance matrix. Narrow-layout and enlarged-text checks cannot be substituted for browser zoom. These limitations require explicit release disposition; this record does not silently waive them.

## Supplemental results on 30 October

| Gate | Result and evidence under tests/output |
| --- | --- |
| Gel behavior | 23/24 engine/form/suite pairs passed in skins-gel-behavior-supplement; one Firefox light stack-command interception failed |
| Glaze behavior | 24/24 engine/form/suite pairs passed on the fixed source in skins-glaze-behavior-supplement |
| Delayed-hover isolation | Original source failed all 12 cases, including Standard; fixed source passed all 12 in skins-hover-context-fixed |
| Live rounded chrome | Gel and Glaze each passed six cases in skins-gel-live-supplement and skins-glaze-live-supplement |
| Complete palette conditions | 1,704 checks passed in skins-palettes-complete, including status hue/distance and neighboring-category CVD separation |
| Host persistence and declarative boot | 27 profiles passed in skins-host-boot-ready, with explicit, loaded declarative and disabled declarative startup |
| Windows alternate environments | 54 RTL/blocked-font/system-font profiles passed in skins-environments-supplement |
| Linux alternate environments | 54 RTL/blocked-font/system-font profiles passed in skins-environments-linux |
| Doubled rendered text | 18 profiles per platform passed bounds/retention checks, but visual inspection found selector text clipping; these are not complete enlarged-text conformance passes |

The original Gel failure involved a delayed hover preview covering an open group context command. The independent regression reproduced it in every engine with Standard and all three skins. Architecture added a guard at delayed preview execution. The corrected source then passed every isolation case. Both snapshots and the original failure log remain available. This establishes the tested boundary without discarding the earlier failure.

The host review verifies that a loaded declarative skin is the first effective skin event, and that an unavailable declaration falls back to Standard while retaining the preference. It also verifies zero storage access, storage-event suppression, explicit later registration and retained edited field identity/value/focus/selection/URL/history. The first declarative probe incorrectly assumed synchronous stylesheet readiness after re-enabling a disabled link. That probe is retained at skins-host-boot-independent. The corrected harness waits for actual readiness before registration.

The first environment runs also included 18 root-font-size-only probes per platform. Inspection showed that the fixed-size PUDL text was not enlarged by those probes, so they are excluded from enlargement evidence. Separate runs in skins-large-text-independent and skins-large-text-linux verify doubled computed field font size. Their automated bounds checks pass, but the compact preview theme selector visibly clips its selected text. The screenshot is retained and the issue was sent to Architecture. Actual browser zoom is still queued.

The Linux runs used Node 24.20.0 and Playwright 1.63.0 in `mcr.microsoft.com/playwright:v1.63.0-noble`, digest `sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`. Browser versions, loaded paint hashes and individual observations are in the result files. The checks use narrow 360px pages with reduced motion and explicit light/dark forms. They check retained input and viewport/control bounds; they do not certify every text or glyph clipping state. Representative RTL and doubled-text images were inspected.

## Packaged identity and pending disposition

The reviewed skin paints match these distribution hashes:

| Distribution file | SHA-256 |
| --- | --- |
| dist/pudl-skin-bevel.css | a384480d663e2ddee59633ae36a342ad3410e56a250c1c588c2edf9e467f0519 |
| dist/pudl-skin-gel.css | 4d03f6ffe78e8304c95afd15b6a0b9163a58c50d9427ad42cc6fdb30d5492979 |
| dist/pudl-skin-glaze.css | a31493999a6b1aafd05a46cc17c921b0b10f4587fbc4f7f938fbe5f8e8f6dd65 |
| dist/pudl-theme.js | 7ddf412a8a2f5b2238901782508ca8aaadf7c60474baf43579e35fd7a7486b19 |
| dist/pudl-skins.js | 05b9fb1f103e93e582dd26d728df0fb7fd0ff585aff71e2d793f740fe73f043a |

The integration manifest is `tests/output/skins-final-integration-hashes.json`. Its component CSS differs from the frozen supplemental CSS only in the version comment, from 0.94.0 to 0.95.0. The fixed window script hash is `4611f3668983a69ad8a255858182fcf2418fc7ffa5277f27f681fd96c247bbfe`. The frozen supplemental source and runtime files remain separate from the live checkout.

Final admission remains conditional on the full normal/minified gates, release asset freshness and explicit disposition of the clipping/zoom/manual-interoperability limitations. Architecture supplied an intermediate 18/18 focused full-mode result in message 1383; final full-mode coverage still belongs in both broad gates. This report does not mark registry entries admitted.

The paragraph above records the pre-final status. [FINAL-ADMISSION.md](FINAL-ADMISSION.md) supersedes that pending disposition with the final packaged hashes, field/native-widget evidence, broad-gate results and explicit unperformed checks. Verification approves the three listed skin hashes for admission within that recorded scope; Architecture owns registry edits and release operations.
