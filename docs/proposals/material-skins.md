# Matte, Ink, Alloy and Glass

Paul authorized implementation of these four skins on 1 November 2026. The architectural principles remain at `C:/Users/paul/OneDrive/Documents/Architectural Principles.md`. This change extends the constrained treatment compiler and keeps the version 1 definition format.

## Appearance

Matte uses opaque fills, small corners, shallow raised controls and soft lifted shadows. Its fields retain an inset edge. Active chrome uses a restrained accent tint.

Ink uses nearly square corners, foreground outlines and hard offset shadows. Pressed controls sink into their surface. Status and category colours remain semantic, and the palette and typography remain those of the host.

Alloy uses broad satin gradients and narrow opposing edge highlights. Its square-ended controls, inset fields and stronger frame shadows distinguish it from the split gloss of Gel and Glaze. No texture crosses text.

Glass uses rounded controls, clear edge highlights and broad lifted shadows. Window frames may be translucent when the enhancement is supported and the reader has not requested reduced transparency. Following Paul's preview review, the whole title bar has one opaque reading surface; individual titles and status groups have no rectangular backing patches. Menus, dialogs, cards and window bodies retain opaque reading surfaces with glass edge lighting. This keeps their contrast independent of the page behind them.

## Boundaries

All four skins inherit the existing light and dark palettes. Host overrides remain last in the cascade. Type, spacing, border widths, target sizes, chrome order and component semantics stay fixed. Standard remains byte-identical. The initial implementation preserved the three released skins; Paul's later focus refinement changes their working revisions, which now await renewed admission as described in [the refinement design](skin-palette-refinements.md). Skin changes preserve mounted content, focus, input values, window state and history.

The Glass compiler owns the additional window selectors. Definitions cannot author CSS. Its selection condition has zero specificity, and all generated rules remain inside the screen and ordinary-colour media guard. Glass starts opaque. A nested feature query enables frame translucency; a reduced-transparency media query restores the opaque frame. The title bar stays opaque without filtering. Geometry never changes. Print and forced-colour rendering remain component-owned.

The implementation follows the documented CSS contracts for [backdrop filtering](https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter) and [reduced transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency). Support for the latter varies, so contrast must remain sufficient even when the browser cannot report the preference.

## Verification and admission

Tests cover all four treatments in Chromium, Firefox and WebKit, in both forms. They compare component geometry and semantics against Standard, exercise real hover, pressed and focus states, check mounted content and window state during selection, and cover narrow, enlarged-text, right-to-left, forced-colour and print environments. Glass additionally requires contrasting backgrounds, opaque text backing and its fallback paths. Rendered gradient and focus checks retain screenshots for inspection.

Generated files and preview selection are part of implementation. Catalogue entries remain candidates until independent rendered admission binds their hashes. Self-test results do not constitute independent admission. No publication or change to the existing admitted hashes is part of this implementation.
