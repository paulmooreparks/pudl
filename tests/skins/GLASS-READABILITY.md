# Glass lettering contrast correction

The shared 2px blur and 35% tint exposed a contrast defect over contrasting content. Independent review on cd70241 measured light active title contrast at 2.229:1 on black and dark active title contrast at 1.755:1 on white. Host-status words failed as well. Focused controls passed their separate two-colour perimeter and centre-hit checks. Those control results did not admit the lettering.

The initial experimental probe copies accidentally retained the independent probe's output directory expression and overwrote its original contrast pairs/results. The independent report and script remain. The surviving experimental pairs were relocated to `tests/output/release-0960-glass-halo-raster-first`; a fresh no-halo reproduction on unchanged cd70241 assets is in `tests/output/release-0960-glass-contrast-reproduced`. The latter is replacement evidence, not recovered original capture data.

## Correction

The correction retains the shared translucent layer and adds a surface-coloured outline and soft halo following the lettering. Small drop shadows on title, detail and host-status elements extend the halo past their own text clipping. The title bar and window retain no filter, while the decorative layer retains its shared blur. No opaque rectangular title or status backing is added. Body and control surfaces remain opaque, and no-transparency, unsupported-preference, unsupported-filter, forced-colour and print paths retain component rendering.

The [filter effects specification](https://www.w3.org/TR/filter-effects/#FilterProperty) defines filter painting without changing CSS box geometry or hit testing. Filters can establish containing blocks for positioned descendants, so this treatment is confined to title/detail and read-only status elements; it is not applied to the header or window. Host overrides remain last.

## Measurement

The first sharp text shadow passed core contrast but failed some nearby edge checks. Adding only soft text shadows did not resolve the clipped title edge. Both rejected experiments are retained. The corrected treatment adds the small element drop shadows, retaining the same strict core and edge thresholds.

The new raster harness captures actual normal paint, paint with text made transparent while leaving the surface-coloured halo, and a separate neutral black-on-white glyph mask with opacity reset. Solid mask samples locate letter interiors independently of the normal text opacity. It compares actual normal pixels against their backing and the nearest fully clear mask samples within two pixels. Both minima must reach 4.5:1. The harness records CSS input hashes, browser version, palette, asset form and reported transparency mode in its results. It refuses an existing output directory.

Initial generated Chromium Standard results pass all 36 light/dark, black/white/stripe, active/inactive and title/detail/status cases. The minimum measured core contrast is 7.500:1 and the minimum edge contrast is 7.496:1. These measurements were taken during implementation and are not independent. Independent review has not closed this correction.

Firefox and WebKit on this workstation do not report either transparency-preference value, so the enhancement is inactive and the new raster harness refuses to certify its translucent path there. Their opaque fallback is a separate material-browser result. Companion-palette and minified results are recorded in the release record as they complete. Actual browser zoom and manual screen-reader interoperability remain unperformed.
