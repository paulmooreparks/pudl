# PUDL 0.95.0 release validation

This release adds the skin mechanism and Bevel, Gel and Glaze, together with full-mode taskbar stacking and a shared fix preventing a delayed stack preview from covering an open menu.

## Evidence retained

The independent records under `tests/skins/` retain the frozen Standard baseline, both token sweeps, the original contrast failures and their corrections, runtime availability, host-owned persistence, skin-specific rendered checks and interaction coverage. They distinguish initial scope acceptance from release sign-off. Original failed runs remain beside their corrected or isolated reruns under `tests/output/`.

The source and expected-image archives identified in `tests/skins/STANDARD-BASELINE.md` remain under ignored `tests/output/`. They must be retained separately from Git. Git contains the harnesses and reports, but does not by itself retain the binary preservation baseline.

Independent admission is recorded in [FINAL-ADMISSION.md](../tests/skins/FINAL-ADMISSION.md), which binds the three packaged skin hashes and states the reviewed scope.

## Final gates

The first Windows normal run passed 312 of 318 engine/suite pairs. Chromium and Firefox exposed an unnecessary page-wide scan when unrelated application text loaded a font. Font-driven taskbar measurement is now restricted to full stacking mode. Four Firefox menu suites timed out during navigation. The original log is retained at `tests/output/release-095-normal.log`.

The affected performance and menu suites, together with full-mode stacking, then passed all 21 serial engine/suite pairs on the corrected source. The menu reruns establish a passing result without proving the cause of their earlier timeouts. `tests/output/release-095-isolation.log` retains that run, including WebKit's deferred focus checks. The complete minified run then passed all 318 engine/suite pairs, including skin and full-mode taskbar tests, in `tests/output/release-095-minified.log`.

The definition/compiler unit tests pass 8 checks. Generated skin, minified asset, token and font-subset freshness checks pass. The build verifies each admitted CSS hash and rejects stale generated or minified files.

## Enlarged text correction

The supplemental doubled-text inspection exposed clipped text in native one-line selects, including the preview's theme control and ordinary Location field. The shared field height now grows with the text line plus its padding and borders, while retaining 36px at the default font size. Focused input/select checks pass in Chromium, Firefox and WebKit. The corrected independent environment harness passes all 18 engine/form/skin profiles, and visual inspection confirms that the previously clipped text is visible. These checks are separate from actual browser zoom. The demo uses `form-select-wrap` so PUDL draws its selects. Unwrapped browser-native selects remain a diagnostic path: repeated original/original captures also differ in native text paint, and a synthetic enlarged-text WebKit native probe still clips. Those native results are not counted as PUDL-painted field conformance.

## Baseline retention

The three immutable baseline bundles listed in `tests/skins/STANDARD-BASELINE.md` retain their original hashes. A second local copy is retained outside ignored test output under the maintainer's `source/release-evidence/pudl/0.95.0` directory. The source bundle includes unrelated unpublished sample prototypes, so these bundles are not public release assets. Git and the public package alone do not retain the complete binary baseline.

## Scope limits

Actual browser zoom remains unperformed. The bounded native Chrome for Testing attempt returned no accessible tree and a black capture; activation then failed with Windows access denied before any zoom input was sent. No CSS, viewport or device-scale substitute is counted as browser zoom. Manual screen-reader interoperability also remains unperformed. Existing Standard focus and destructive-text defects remain recorded in the independent reports; preservation does not waive the new skins' requirements.

## Final demo notice

After admission, the demo notice was changed from development-preview wording to the release version. No control markup, style or runtime changed in that edit. An extra smoke run passed all three Gel engine checks and Chromium Glaze, then stalled in Firefox Glaze. A bounded Firefox-only retry timed out at 60 seconds; both process trees were stopped. These attempts are retained in `release-095-demo-smoke.log` and `release-095-demo-firefox-isolated.log` and are not counted as passes. The independently reviewed wrapped-demo matrix and complete minified gates remain the evidence for the controls.

## Linux release check

The first Linux CI run passed Chromium, Firefox and minified Chromium, but WebKit failed the split-button geometry check. That check measured each half in separate browser evaluations without waiting for fonts. It now waits for `document.fonts.ready` and measures both halves in one evaluation, keeping the original height and shared-border assertions. The corrected suite passes all three Windows engines and Linux WebKit. The original CI failure is retained in `tests/output/release-095-ci-failure.log`; these focused results do not establish the original failure's cause conclusively.
