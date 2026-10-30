# Initial Gel review

The frozen Gel candidate passes the initial Windows geometry, gradient-text, focus and targeted Standard-preservation review. This evidence does not admit Gel to a release registry.

## Candidate and environment

The source is retained at `tests/output/skins-gel-source`. Its `source-state.json` records the checkout identity and dirty files. The runs used bundled Inter, headless Chromium 153.0.8010.12, Firefox 155.0 and WebKit 26.6 on Windows, with light and dark forms. The gradient run used a 1280 by 1400 viewport at device scale 1. Geometry checks also covered the 360px preview.

| Input | SHA-256 |
| --- | --- |
| dist/pudl.css | 71fdfc7187cd3d2ab66602cc5a38891b8f8754161b4167782307e9ab9ffc05a0 |
| dist/pudl-windows.css | 548c9158284fd42d2bd9a73b4ceef9a2426dfa555b0d5d9113fb46b6141f7f8d |
| samples/skins-gel.css | 4d03f6ffe78e8304c95afd15b6a0b9163a58c50d9427ad42cc6fdb30d5492979 |
| skins/gel.json | 695c3b36d4bd70f95a0b33d9805b7c5fb4496e9d3a48110adee581a255309aa9 |

## Results

| Evidence directory under tests/output | Result | Scope |
| --- | --- | --- |
| skins-gel-geometry | 912 checks pass | Catalogue geometry/type, part treatments, representative forced-colour/print exclusion, preview reflow and edited-content retention |
| skins-gel-gradient | 96 checks pass | 90 rendered text cases and six page-error checks |
| skins-gel-focus | 66 applicable focus gates pass | Rounded buttons, destructive controls, fields, lists, adjacent surfaces and chrome |
| skins-gel-standard | 81 comparisons pass | 72 original-versus-current Standard paint/geometry/raster comparisons and nine existing forced-colour comparisons |

The text cases cover ordinary, primary and destructive buttons at rest, hover, pointer-down and keyboard focus, latched controls and active title text. The harness compares foreground against the exposed rendered gradient at solid glyph pixels on the same mounted node. It retains both normal and text-transparent images. The lowest contrast is 4.805:1 on the dark primary button while pressed in each engine.

The focus harness samples straight edges and rounded perimeters. Active chrome retains its two-colour treatment. Six CSS-only inactive-window observations remain diagnostics because the live window manager activates the window on focus. Six Standard controls are also retained as controls, outside Gel's 66 gates. This run does not establish a fresh live Gel activation result.

The Standard comparisons load the Gel stylesheet while checking absent and explicit Standard selection against the original frozen component styles. They cover ordinary/destructive buttons, active/inactive close controls and topbar/menu-bar status. The nine forced-colour comparisons retain the earlier Bevel selection; the geometry run separately checks Gel's representative forced-colour and print exclusion.

Representative light desktop and dark narrow preview images were inspected. No additional visual blocker was identified in those images.

## Limits

This is initial rendered coverage. Full behavioral coverage under Gel, additional gradient surfaces, live rounded-chrome activation, actual browser zoom, Linux, blocked/system fonts and manual screen-reader interoperability remain separate gates. The targeted Standard comparisons supplement the accepted baseline; they do not replace its complete capture matrix. No shipped assets or preservation expectations were changed by verification.
