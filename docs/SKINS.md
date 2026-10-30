# Skin implementation contract

This document defines the skin mechanism, host integration and admission requirements. Bevel, Gel and Glaze use the same component structure and behavior as Standard. The release catalogue identifies which generated stylesheets have completed admission.

## Definition and enforcement

A skin is authored as JSON. Its stylesheet is a generated artifact. The definition supplies an identifier, a display name, a supported surface treatment, decorative radii and optional palette overrides in both forms. It cannot contain selectors, declarations, scripts, resource URLs or arbitrary derived-token formulas. The compiler owns the mapping from each treatment to PUDL's component categories and states.

The definition validator rejects unknown properties, invalid types, unsupported treatments and out-of-range values. Passing that validator establishes only that a definition can be compiled. A skin becomes supported only after its generated appearance passes the rendered conformance matrix. The build and release checks must require both stages. A custom stylesheet added by an application is outside this validated mechanism; CSS cannot protect a page against arbitrary styles its author supplies.

The development schema supports the `standard`, `bevel`, `gel` and `glaze` treatment families. Adding another family requires a compiler mapping; release admission additionally requires independent rendered tests. Skin authors cannot bypass this by naming a treatment themselves. The identifier `standard` is reserved for the built-in appearance and cannot be supplied as an external skin definition.

## Version 1 definition

The root object contains exactly these properties. Every property is required.

| Property | Value |
|---|---|
| `version` | The integer `1` |
| `id` | A lowercase ASCII letter followed by lowercase letters, digits or hyphens, at most 40 characters; `standard` is reserved |
| `name` | A nonempty display name of at most 80 characters, without control characters |
| `treatment` | `standard`, `bevel`, `gel` or `glaze` |
| `radii` | An object containing `radius`, `radius-sm`, `radius-xs` and `radius-pill`, each a finite nonnegative CSS-pixel number |
| `palette` | An object containing `light` and `dark` override objects with identical token names; empty objects inherit the Standard palette |

The first three radii range from 0 to 32 inclusive. `radius-pill` ranges from 0 to 999 inclusive. These bounds constrain decorative geometry; they do not certify that a particular radius fits a particular control. Intentional circles, joined seams, flush window edges and hit regions remain component-owned.

Palette override names and types come from the vendored specification's palette files. Colours are opaque six-digit hexadecimal sRGB values. Lighting amounts are finite numbers from 0 to 1. Unknown tokens and derived tokens are rejected. A definition changing `bg`, `surface` or either lighting colour or amount must supply all eight category colours in both forms, following the palette contract. The compiler resolves the remaining values from Standard before validation of the effective palette and rendered appearance.

## Appearance and interaction boundaries

The first increment keeps the existing type and spacing scales, font faces, window-control order, title-bar heights and hit regions. Skins cannot shrink text or hit targets to copy an earlier interface. Later schema versions may add constrained capabilities after their layout and accessibility contracts are specified. Bevel does not require those capabilities.

The bevel treatment must identify a continuous control boundary separately from decorative edge lighting. Its raised and sunken treatments reverse their lighting, and its pressed treatment remains visibly distinct. A pale highlight alone cannot establish boundary contrast. Focus retains PUDL's existing placement, thickness, keyboard behavior and forced-colour handling. Its paint must meet 3:1 against adjacent surfaces. Bevel uses opaque accent paint for ordinary focus and an opaque danger/text mix for destructive focus. Active title-bar controls use a two-pixel white ring with a one-pixel black outer edge within the existing three-pixel footprint, so the indicator remains distinguishable against both the title fill and the pale frame edge, and topbar status controls use the topbar foreground. Status controls beside a menu bar use the ordinary focus paint because their group has an ordinary raised surface. These context mappings retain Standard fallbacks. The compiler owns these mappings; definitions cannot replace focus rules. A dotted historical treatment is deferred until it has a separately verified mapping. Action glyphs stay visible. Status and category meanings remain unchanged.

Independent rendered review found that Standard's translucent focus paint falls below 3:1 on the tested card surfaces. Standard preservation retains that existing appearance and records the defect separately. It does not exempt Bevel from the contrast requirement. Bevel's opaque paint is therefore a required conformance correction within the first increment.

The first bevel compiler draws edge lighting with inset shadows inside the existing border. It must not increase border widths or move the content box. Tests compare outer bounds, client dimensions, padding and each border width before and after selection. Any later treatment that needs different border widths requires an explicit geometry contract before it is admitted.

The component matrix includes rest, hover, pressed, selected/current, disabled and keyboard-focus states where applicable, generated controls and pseudo-elements, taskbar stacks and menus, and window placement modes. Forced-colour and reduced-motion rules remain component-owned. A skin does not replace DOM nodes or change roles, names, keyboard order, mounted content, input values, URL state or history.

## Palette precedence

The effective palette is resolved in this order: Standard defaults, the selected skin's defaults for the active form, then the host theme's overrides. Derived paints consume the effective palette. Skin-generated selectors must use zero specificity for their selection condition so that ordinary host theme selectors retain precedence when loaded after PUDL. Skin files load after the component stylesheets and before host theme overrides. An explicit Standard selection emits no alternative palette or shape values.

The host must validate each theme-and-skin combination it offers. A validated skin does not make an arbitrary host palette conformant. Changing theme form must preserve the selected skin, and changing skin must preserve the selected theme preference.

Effective browser tests must prove both precedence steps against the actual component stylesheets in light and dark forms. They must also prove that derived skin paints consume the later host palette. Checking selector text or specificity in isolation is insufficient.

## Build foundations

`node build/skin-definition.js <definition.json>` checks the structural contract. `node build/skin-css.js <definition.json>` emits candidate CSS to standard output and does not write shipped assets or register a supported skin. The display name never enters the CSS, and every selector uses the validated identifier. The compiler covers shared paint tokens. Generated output must pass the rendered conformance and Standard preservation gates before admission.

`node --test build/skin-definition.test.js build/skin-css.test.js` checks rejection and compilation behavior. `node --test build/skin-css.browser.test.js` checks the effective cascade and representative control geometry in Chromium, Firefox and WebKit. Its fixed-font, transition-free pages isolate the compiler checks; they do not replace the full frozen Standard baseline or the skin conformance matrix.

## Selection and fallback

Only skins whose generated stylesheets have loaded successfully may enter the runtime selection registry. Standard is always available. Selection of a registered skin updates the root `data-skin` value without rebuilding content. Unknown identifiers and failed stylesheet loads select Standard. A persisted unavailable selection must not trigger network discovery or leave a partially applied skin; the effective selection becomes Standard. The stored unavailable identifier may be retained so that an application which later offers that skin can restore the preference on its next initialization.

The optional `pudl-skins.js` implements availability and persistence. Load it after the component scripts. The host registers an already-loaded stylesheet with `pudlSkins.register(id, link)`, where `link` is a connected stylesheet link in the current document. Registration returns false for invalid identifiers, Standard, unloaded, disabled or nonmatching-media links. The host can register from the link's load handler, or after the document load event. The selector never inserts links or fetches URLs.

`pudlSkins.select(id)` records a valid preference under `pudl-skin` and returns whether it is currently available. An unavailable valid preference produces Standard while retaining the preference. Invalid identifiers leave the current preference untouched. `preference()` returns the saved selection, `current()` returns the effective selection, and `available()` returns a fresh array beginning with Standard. `unregister(id)` removes an offered skin. Removing its link, changing its URL or media condition revokes registration; a new successful registration is required. Disabling the link makes the skin unavailable. The selector follows media-query changes for a registered link and storage changes from another tab.

The root exposes `data-skin` and `data-skin-pref`. `pudl:skin-change` fires on the document when the effective skin or preference changes, with `detail.skin` and `detail.preference`. Storage failures leave selection usable for the current page. Skin selection must not write window or navigation history. Runtime registration proves stylesheet availability only; the build's conformance admission gate remains responsible for which generated skin files are supported.

Availability checks inspect both `link.disabled` and `link.sheet.disabled`. DOM changes to registered links are observed automatically. CSSOM writes do not produce DOM attribute mutations: after setting `link.sheet.disabled`, the host must call `pudlSkins.refresh()` to reconcile the root attributes and notify listeners. `refresh()` returns the effective skin, retains the preference and emits an event only if the effective state changed. Re-enabling the same registered sheet and refreshing restores its selected skin. `current()` also reconciles availability; `available()` checks live readiness without changing root attributes. This mechanism does not observe arbitrary edits to a stylesheet's rules or certify such edits as conformant.

## Preservation and acceptance

Verification captures the current Standard appearance before shipped style edits. The input snapshot includes the actual dirty-file hashes, fixtures, fonts, browser versions and capture code. Two captures under identical conditions must agree before expectations are accepted. The frozen results remain independent of the replacement tokens.

After the sweep, absent `data-skin` and explicit Standard must both match those results in each captured environment. A baseline records existing behavior; it does not waive an existing conformance defect. New skins use the same component category map and independent accessibility and geometry requirements, with their own approved surface-treatment expectations.

No first-increment skin is released until the compiler has meaningful rejection tests, Standard preservation passes, and Bevel passes the component matrix in both forms. Shipping extra skin CSS without these gates does not satisfy this contract.

## Gel

Gel uses capsule standalone buttons, rounded window controls with visible action glyphs, split glossy raised fills and CSS pinstripes confined to active window chrome. Light and dark forms inherit the host palette. Fonts, chrome order, border widths and target dimensions stay fixed. Structural seams keep their component rules; the capsule radius applies only to standalone buttons.

The compiler accepts the named `gel` treatment and owns its paint mappings. The sample loads its generated stylesheet alongside the other skins, and its selector preserves mounted content while switching. Gel requires its own rendered contrast, focus, surface semantics and preservation checks; Bevel approval does not establish Gel conformance.

## Host integration

An application with an authoritative appearance store sets `data-pudl-persistence="host"` on the root before loading the theme and skin scripts. Both scripts then avoid all local-storage reads and writes and ignore storage events. Theme initialization reads `data-theme-pref`, falling back to `data-theme` and then dark. Skin initialization reads `data-skin`, falling back to Standard. The host supplies preferences through the existing selection APIs and distributes updates across its pages. This startup setting is fixed for the lifetime of the scripts; changing the attribute afterward does not change ownership. Without it, existing local persistence remains the default.

The existing `pudl:skin-change` event already supplies effective selection and preference. Hosts can use it to reconcile their appearance controls and palette overrides. The release provides `dist/pudl-skins.json`, a versioned catalogue with each skin's `id`, `label`, `stylesheet`, generated CSS `sha256` and `admitted` flag. Standard has no stylesheet. Hosts offer only admitted entries. `node build/skins.js --check --release` rejects stale assets or unadmitted registry entries. Admission binds the generated CSS hash; a changed compiler output invalidates that admission. Candidate definitions and successful runtime registration must never imply admission.

Static stylesheet links loaded before the host's initialization script can provide the selected appearance at first paint. The runtime currently accepts only loaded links. Supporting registration while a stylesheet is loading would require an explicit pending state and defined load, error, removal and preference-change transitions. Until that contract is implemented and tested, hosts must not assume pending registration is supported.

Skin treatments own component shape and derived surface paint. Host themes supply palette inputs; the current first increment leaves type unchanged. Optional skin palette defaults remain permitted by the existing contract, with host palette overrides taking precedence. A host may restrict its own theme editor to palette inputs to prevent competing definitions of derived skin paints. Every offered skin and host palette combination still requires rendered validation.

## Glaze

Glaze uses softly graded controls, modestly rounded corners and vertically glossy blue active-window chrome. Its light and dark accent defaults are paired, and later host palette overrides retain precedence. Rounded square window buttons keep their action glyphs. It retains the current type, chrome order and target geometry. Its chrome retains the existing title-bar height and font.

Glaze uses the same bounded definition and compiler as the other skins. Independent rendered contrast and focus checks cover the full gradients in both forms. Hosts must also validate the palette combinations they offer.

Glaze's initial dark accent failed category separation in independent review. The corrected default is `#80c4ff`, retaining the canonical category colours and providing a minimum separation of 10.15 OKLab units against the required 8. The rendered palette matrix passes across all three engines; the separate gradient and focus results are recorded in the release verification report.

## Distribution and loading

Load `pudl.css` and, for windowed pages, `pudl-windows.css`, followed by the offered `pudl-skin-<id>.css` files and then host palette overrides. Both readable and minified skin files are distributed. The optional runtime is `pudl-skins.js`; a server-rendered page can select a loaded skin using `data-skin` without that script. First-paint selection belongs to the host. Use static stylesheet links before a classic external initialization script, or render the chosen identifier directly on the root. The selector never fetches skin files.

Registration accepts loaded stylesheets only in this release. It does not expose a pending registration state. A host loading a skin later waits for its link's load event, registers it and then applies the preference. A load failure leaves Standard effective and retains the desired preference. This bounded contract avoids claiming that a requested but unavailable skin is already rendered.

Static loaded links MAY declare `data-pudl-skin="<id>"`. The runtime registers these links before its first selection reconciliation, so a host-rendered selected skin does not temporarily fall back during startup. Invalid or unavailable declared links are rejected by the same registration rules. Dynamically inserted links still require explicit registration after loading.
