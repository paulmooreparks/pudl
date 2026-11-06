# Folded launcher discoverability

PUDL 0.102.0 delivers this contract following live beta review. The text below records its design.

The expanded site identity should retain its name and logo. In the folded combined menu, its launcher action should read `Open launcher` and carry a shared glyph, while the host section heading retains the site name. The current `combined()` implementation in `dist/pudl-menubar.js` copies `t.label` and omits its glyph, producing two similarly named entries with different purposes.

The proposed `data-menubar-launcher-label` attribute on the real menu bar supplies the localized folded action label. It applies only when launcher integration is enabled. Ordinary identity menus retain their existing behavior. The generated action continues through the current launcher request, cancellation, invoker and focus path.

This proposal was accepted for scheduling on 6 November 2026. It remains separate from the window-stack release. The candidate uses the shared `app` glyph and preserves the existing launcher invocation path. Hosts should retain an explicit `View > Open launcher` route until the shared change is published, and should not rewrite generated menu DOM.

This correction and taskbar pinning are scheduled together after the window-stack release. Implementation has resumed. The candidate will be integrated on a beta host for review before publication.

Verification must cover pointer and keyboard invocation, popup and pinned presentations, localized accessible names, repeated folding and expansion, unchanged ordinary identity menus, and readable/minified assets across supported engines. Screenshots must include narrow layouts and both themes.
