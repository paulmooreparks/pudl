# Chrome focus correction review

Independent verification accepts the reported topbar and active-window focus corrections in their reviewed scope. The applicable static focus checks, live keyboard activation checks and targeted Standard fallback comparisons pass. This acceptance does not replace the remaining skin conformance or release gates.

## Candidate identity

The immutable candidate is `tests/output/skins-bevel-chrome-source`.

| Input | SHA256 |
|---|---|
| `dist/pudl.css` | `7718c6903a55ac3073c8875ae50305e0795bbfeebcaa9e539d8d06f283f011e8` |
| `dist/pudl-windows.css` | `3a9f6e8a22333424bd03612df96e869477b82cda4459e591cfc2fac2d5630077` |
| `samples/skins-bevel.css` | `a384480d663e2ddee59633ae36a342ad3410e56a250c1c588c2edf9e467f0519` |

The architect supplied the new paint mappings and component fallback paths. Verification changed only its tests and review records. The original Standard captures remain unchanged.

## Rendered indicator and area

The active-window control has a two-pixel white band and a one-pixel black outer band. The integer-aligned fixture paints every expected pixel around its 28px square control: 240 white pixels and 132 black pixels. The resulting 372-pixel indicator occupies the existing three-pixel footprint without clipping. Its two painted edges reach 21:1 against each other. Every tested side has an edge reaching at least 3:1 against the adjacent title/frame surface.

The static review tests each band's area and scans the straight perimeter in 96 profiles per case. This treatment is assessed as a two-colour indicator; comparing only its inner white band with a surface beyond the black band would omit a painted edge.

The live preview also passes in all six engine/theme combinations. It positions controls at fractional CSS coordinates, where antialiasing makes literal counts of pure white and pure black pixels inappropriate. The live check retains fractional bounds and verifies both painted edges along all 92 straight-edge profiles. Every profile passes. The weakest measured contrast between edges is 9.06:1; the weakest stronger-edge contrast against its neighboring surface is 4.17:1. These checks establish the reviewed indicator footprint and visible edges; they do not claim an additional accessibility level beyond the approved contract.

Topbar status focus reaches approximately 12.96:1 in light and 11.62:1 in dark. Status controls beside a menu bar retain ordinary focus paint and also pass. Ordinary/destructive buttons, invalid fields/listboxes and the previously tested neutral surfaces continue to pass.

## Applicable states and retained diagnostics

All 66 applicable static Bevel cases pass across Chromium, Firefox and WebKit in both forms. The expanded fixture also retains an inactive-window CSS-only diagnostic. Its dark focus ring measures 2.49:1 at the pale frame edge. This observation is not presented as fixed.

The catalogue declares `pudl-windows.js` as required for Windows. The window manager's focus handler activates a background window when focus enters it. The independent live regression begins with an inactive window, gives its Close control keyboard-visible focus, verifies that the same control is focused in the now-active window, and measures the resulting two-colour indicator. All six live cases pass. The CSS-only inactive diagnostic is therefore separated from the supported live-state admission checks. If support is extended to focused inactive windows without the required manager, that diagnostic must become a gate.

Original Standard remains a separate control with its known focus defect. It is not counted among Bevel's passing cases.

## Standard fallback and system colours

All 57 targeted comparisons pass. Forty-eight comparisons cover active and inactive window controls, topbar status and menu-bar status, in three engines, both themes, and absent versus explicit Standard selection. Candidate and original frozen styles produce identical computed paint, geometry and before/focused screenshots for these paths.

Nine further comparisons cover the affected chrome in forced colours. Bevel and Standard produce the same focus paint and the required solid two-pixel system outline. These are focused comparisons for the new fallbacks, rather than a repeat of the entire 24-profile Standard capture.

## Reproduction and evidence

The following commands require new output directories and run serially.

```powershell
node tests/skins/focus-review.js tests/output/skins-bevel-chrome-source <new-static-output> --extended
node tests/skins/live-focus-review.js tests/output/skins-bevel-chrome-source <new-live-output>
node tests/skins/focus-fallback-review.js tests/output/skins-bevel-chrome-source <new-fallback-output>
```

The final evidence is in `tests/output/skins-bevel-chrome-final`, `tests/output/skins-bevel-live-focus-final` and `tests/output/skins-bevel-focus-fallbacks`, with corresponding log files at `tests/output`. Earlier live probes that demanded pure-colour pixel counts at fractional positions remain probe evidence, not product failures. The final profile measurement handles those positions explicitly.

The remaining status/category, gradient, clipping, visual RTL, actual zoom, Linux, system/blocked-font, manual assistive technology and release-admission gates remain separate. All browser and server jobs finished before this review was sent.
