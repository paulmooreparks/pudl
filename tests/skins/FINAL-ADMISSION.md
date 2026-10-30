# Skin admission disposition for PUDL 0.95.0

Verification approves admission of the three packaged skin files listed below for the reviewed PUDL component treatments. The evidence supports this release with the explicit limits recorded here. It does not establish universal host-theme conformance, actual browser zoom coverage or manual screen-reader interoperability.

| Packaged skin | SHA-256 approved for admission |
| --- | --- |
| dist/pudl-skin-bevel.css | a384480d663e2ddee59633ae36a342ad3410e56a250c1c588c2edf9e467f0519 |
| dist/pudl-skin-gel.css | 4d03f6ffe78e8304c95afd15b6a0b9163a58c50d9427ad42cc6fdb30d5492979 |
| dist/pudl-skin-glaze.css | a31493999a6b1aafd05a46cc17c921b0b10f4587fbc4f7f938fbe5f8e8f6dd65 |

Any change to these skin contents requires renewed admission review. Verification has not edited the release registry or published assets. Architecture owns those release operations.

## Evidence

[ADMISSION-GATES.md](ADMISSION-GATES.md) consolidates the earlier Standard baseline, surface, contrast, focus, runtime and supplemental evidence. Gel and Glaze each passed their initial 912-check geometry/surface review, 96 rendered-gradient checks and 66 applicable focus gates. Supplemental checks covered live rounded-chrome activation, the effective category/status/CVD palette matrix, host-owned persistence, declarative startup and Windows/Linux alternate font and direction conditions. The earlier failures and corrections remain recorded in those reports.

The final minified broad log, `tests/output/release-095-minified.log`, records 318/318 passing engine/suite runs. The normal first pass records 312/318, followed by 21/21 passing serial affected-menu/performance/full-mode runs in `release-095-isolation.log`. Two performance failures received a font-invalidation scope correction. Four Firefox navigation timeouts remain recorded alongside their passing isolated runs; their causes are not claimed proved. This is not described as a single pristine final-source normal 318/318 run.

The final targeted source is retained at `tests/output/skins-final-targeted-source`. Its identity file records the loaded inputs. Final integration hashes are in `tests/output/skins-admission-final-hashes.json`. The base CSS hash is `3c6ab7cf72708a4bd744dce4791a401324159a2c050f365af202e706910237ad`, and the window script hash is `ad1c8ddeab8f809abf6a6d8d50ecbd311a1f106e14042a5f4914b12c347c88dc`. Theme and skin runtime hashes remain the ones recorded in the admission-gates report.

## Field preservation and native-widget disposition

The targeted fixture covers text, password, number, search, date, time and email inputs, a wrapped PUDL select and an additional unwrapped native select. Default computed measurements match frozen Standard in all 12 engine/theme/direction profiles, including unchanged 36px field height. All 48 skin/theme/direction enlargement profiles meet the measured line-plus-padding clearance requirement at a 28px font. Representative wrapped-select and input images were inspected.

The initial harness incorrectly treated a native select's computed `normal` line height as a numeric value. The corrected harness uses the independently expected 1.25 line factor for that diagnostic control and explicitly loads the fixture font before settling paint. Both original probe outputs remain retained.

One of 12 settled whole-fixture raster comparisons differs in Chromium native-select text. An original-stylesheet-versus-original-stylesheet control also fails three of 12 whole-fixture comparisons in that native glyph region, despite equal computed measurements. `field-raster-review.py` compares the remaining pixels exactly and reports the entire native-widget rectangle separately. It passes all 12 PUDL-paint profiles for both the candidate comparison and the original control. The whole-fixture failures are not rewritten as passes.

The component catalogue uses `form-select-wrap`. CONTRACT.md specifies that an unwrapped select retains browser drawing. Synthetic font mutation still exposes text clipping in the additional unwrapped native WebKit probe. Native widget raster repeatability and that native mutation path remain limitations, outside this approval of PUDL-drawn skin treatment. The demo's selectors now use the documented wrapper. This distinction does not grant a general exemption to PUDL-painted controls.

The final wrapped demo passes all 36 bounded RTL/enlargement profiles across three engines, both forms and all three skins. Results and screenshots are retained at `tests/output/skins-demo-final`, against `skins-final-demo-source`. The updated HTML SHA-256 is `5bd96384b3c1637af688e0608d352ab1964952628c761ea1291dfd095c4197dd`. The previously clipped theme and Location selections fit in the inspected enlarged WebKit Glaze image. Browser and server jobs finished before this disposition was sent.

## Zoom and accessibility limits

The bounded actual-zoom attempt used a dedicated headed Google Chrome for Testing window and the documented native browser-menu route through Windows Computer Use. The helper enumerated the correct window but returned no accessibility tree and a black capture. One activation retry failed with `GetCursorPos failed: Access is denied. (0x80070005)`. No zoom input was sent. The dedicated browser and server were closed.

Actual browser zoom is therefore unperformed in Chromium, Firefox and WebKit. No device scale, CSS zoom/transform, viewport narrowing or private preference was substituted. The capability record is `tests/output/skins-zoom-final/capability.json`. Enlarged-text checks remain separate evidence. Manual screen-reader interoperability is also unperformed, as Architecture records in the release limitations. Supplemental Linux results do not establish a complete Linux skin conformance matrix. Host palette combinations still require host validation.
