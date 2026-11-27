# Identity glyphs

PUDL 0.112.0 adds optional identity colour to masked glyphs. The host classifies its applets and documents; PUDL never derives a kind from a label, glyph name, address or destination's activation kind. Existing integrations remain neutral until they opt in.

## Authored glyphs

Put `data-identity-kind` on the identity's `.glyph` element. The accepted, case-sensitive values are `conversation`, `document`, `files` and `tools`. They use blue, violet, cyan and indigo inks respectively. Missing, empty, invalid and unknown values retain the ordinary text ink. Removing the attribute opts out immediately. The attribute does not inherit from a container, and it must not be put on action or status glyphs. Labels and glyph shapes continue to identify the destination independently of colour.

```html
<a class="md-item start-item" href="/documents">
  <span class="glyph" data-identity-kind="document" aria-hidden="true"
        style="--glyph:var(--glyph-document)"></span>
  <span>Documents</span>
</a>
```

The same markup works for a host-authored title identity mark. PUDL does not create a new title icon or classify existing title content. Host images and logos are unchanged. Search, pin, close, settings commands and other action glyphs keep ordinary text ink, even when the same glyph shape is also used by an explicitly classified destination. Red, amber and green remain status colours.

## Generated identities

Set `data-win-identity-kind` on a window root to classify its existing generated window identity marks. The value uses the same accepted set and neutral fallback. PUDL copies the normalized kind onto its generated glyph, including dock tabs, individual taskbar entries, window navigation rows, switcher rows and identity clones in overflow. It does not create glyph slots on surfaces that do not already have one. It does not copy the kind onto attention, execution, count, menu command or pin-action marks. Window replacement and metadata updates use the current root value; removing or invalidating the value removes the generated classification. A root attribute mutation automatically updates existing generated surfaces, including open switcher, overflow and stack rows, after the browser delivers the mutation observer and the scheduled rendering settles. Hosts need no refresh call for root attributes. These updates do not add or recolour a host-authored title glyph.

Taskbar destination descriptors accept optional `identityKind` with the same values. This presentation metadata is independent of the existing `kind` activation contract. A destination's aggregate pin and its stack use the descriptor's classification, including while represented windows are running; an omitted or invalid value is neutral and does not inherit a window's classification. Static reconfiguration and successful provider refresh replace the classification, including in open generated navigation rows after rendering settles. Descriptors are copied at registration or resolution; mutating a previously supplied object alone has no effect. Hosts must call `configureTaskbar` with the complete static registry or `refreshTaskbarDestinations` for provider metadata. Pending, unavailable and failed provider results discard classification together with cached presentation metadata. This field is not saved in preference snapshots and is never an authorization signal.

An ordinary window group uses a coloured aggregate glyph only when every represented member has the same recognized `data-win-identity-kind`. Mixed, unknown or unclassified members produce a neutral aggregate; individual rows retain their own explicit kinds. Regrouping and member metadata updates recompute the aggregate.

```js
pudlWindows.configureTaskbar({
  destinations: [{
    id: 'documents', label: 'Documents', glyph: 'document',
    identityKind: 'document', href: '/documents'
  }],
  pins: ['documents']
});
```

## Ink and adoption

Identity colour changes glyph ink only. It adds no wrapper, backplate, padding or hit-target geometry. Outside forced colours, a glyph on or inside an element with `aria-current` other than `false` or `aria-selected="true"` uses its existing foreground ink. The same fallback applies inside an active PUDL window's `.win-head`, a disabled native control or an `aria-disabled="true"` element. These hooks apply through ancestors, so hosts must put them on the actual entry or control rather than a container holding unrelated entries. Removing the state restores the recognized identity ink immediately. A classified glyph inside `<a aria-current="page">` therefore uses the link foreground until the attribute is removed. A pin button's `aria-pressed` does not classify its action glyph. Forced colours retain the existing component glyph treatment described below. Arbitrary host palette overrides require their own contrast checks; no colour can compensate for a missing accessible name.

Hosts adopting the full distribution receive the rendering capability. They must add semantic metadata to their authored glyphs, window templates and destination descriptors to receive identity colour. Existing startup, skin readiness, navigation, pin persistence and menu action contracts are unchanged.

Identity ink rules apply only outside forced colours. In forced colours every classified glyph retains the same existing component treatment as an unclassified glyph, including the component's system colour, disabled treatment, selection and mask paint. A generic authored current link does not acquire a highlight surface merely from its state. This follows the [CSS Color Adjustment contract](https://www.w3.org/TR/css-color-adjust-1/#forced-colors-mode); the implementation does not depend on measured colour inheritance under a disabled user-agent adjustment.

Author palettes require meaningful glyph contrast of at least 3:1 against adjacent rendered surfaces and ordinary text contrast of at least 4.5:1. Verification covers all nine admitted skins in light and dark, hover/focus/current/disabled states and actual glyph paint. Forced-colour emulation instead requires classified/unclassified parity in system roles, computed paint, labels, geometry and state. A system palette may have lower numeric contrast; such measurements remain disclosed baseline limitations and are never reported as threshold passes. An identity-caused difference or invisible mark remains a failure. Browser emulation does not establish operating-system high-contrast or native-host acceptance.
