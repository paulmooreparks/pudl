# Skin verification coverage and Standard baseline plan

This inventory belongs to independent verification. It defines the evidence required before the shape-token sweep changes shipped styles. It does not approve a skin design or claim that a baseline has been captured. The architectural source remains [Architectural Principles](<C:/Users/paul/OneDrive/Documents/Architectural Principles.md>).

## Capture status and source identity

The accompanying `baseline-inputs.json` records the observed checkout, hashes, font files and declared Playwright browser builds. These are input observations for planning. They are not rendered baseline results. The checkout contains unfinished full-mode taskbar changes, so its HEAD alone does not identify its rendered behavior. Verification must select and record the source snapshot used for the real capture before any skin-related stylesheet edit begins. Full-mode work remains untouched.

The capture manifest must hash every loaded stylesheet, script, font and fixture, the component catalogue, the package lock and the capture/comparison code. It must record the commit and dirty paths. Verification must check the hashes again after capture and reject a run whose inputs changed. An immutable copy of those inputs must remain available so that a failed comparison can be reproduced against the earlier source.

## Component inventory

Every component and every part in the captured catalogue must have an inventory entry. A coverage check must fail for a new catalogue ID, a missing fixture selector or an unexercised declared state. The catalogue supplies the part names and existing categories; it cannot supply the expected post-sweep shape values. Structural entries require dedicated live fixtures because the current component loop renders only the ordinary component templates.

| Family | Catalogue coverage | Additional states and measurements |
|---|---|---|
| Pressable controls | `button`, `icon-button`, `link-button`, `split-button`, `pagination`, `zoom` | Rest, hover, pointer-down, keyboard focus, disabled, primary and danger variants; body, glyph and pseudo-element geometry; joined seams and split halves |
| Entries and choice fields | `text-field`, `select`, `combo-box`, `searchable-select`, `number-field`, `password-field`, `list-box`, `token-field`, `date-field`, `time-field`, `text-area`, `options`, `file-field`, `row-editor` | Empty, populated, invalid, readonly and disabled states where supported; native and generated arrows, popup parts, token dismiss controls, scrollbars and input clipping |
| Tracks and selections | `switch`, `slider`, `segmented`, `progress-bar`, `meter` | On/off, selected/unselected, minimum/maximum, disabled and focus states; track/thumb bounds and meaningful status marks |
| Tabs and command surfaces | `toolbar`, `ribbon`, `tabs`, `section-tabs`, `document-tabs`, `menu`, `path-bar` | Current/selected, inactive, disabled, focus and pressed states; folded controls, nested menus, recessed bands, close controls and shared dock-tab styles |
| Information and status | `badge`, `chip`, `filter-chip`, `status-area`, `notice`, `empty-state`, `loading`, `stepper`, `glyph`, `margin-notes` | Status/category/neutral variants, glyph visibility, selected filters, dismiss controls and reduced-motion loading states |
| Content and containers | `card`, `disclosure-card`, `settings-panel`, `key-value-table`, `data-table`, `code-block`, `code-surface`, `figure`, `avatar`, `dialog`, `popover` | Open/closed disclosures, modal/nonmodal overlays, editable/read-only surfaces, selected rows, translucent backgrounds, circular crops and lifted versus flat roles |
| Lists and page layout | `row-list`, `grid`, `tree`, `stack`, `row`, `column-grid`, `splitter`, `drop-zone`, `master-detail`, `selection-actions` | Active/current/selected rows, tree toggles, row actions, collapsed panes, splitter hit areas, drag targets and narrow-layout transitions |
| Structural chrome | `native-window`, `topbar`, `menu-bar`, `windows`, `window-status` | Generated controls; active/inactive, floating/maximized/snapped/docked/rail windows; title details, vertical titles, menu ownership and chrome order in both directions |
| Taskbar and runtime surfaces | `taskbar`, `taskbar-stacks`, `taskbar-order`, `applet`, `region`, `toast`, `diff`, `tooltip`, `visually-hidden` | Stacks and More, Arrange, runtime insertion, notices, added/removed lines, tooltip positioning, focus recovery and continued hidden-text accessibility |

The inventory must distinguish decorative radii from intentional geometry. It must track `radius`, `radius-sm`, `radius-xs` and `radius-pill`, while listing circles, joined seams, flush docked edges, resize handles and inset clipping as separate constraints. A literal zero or `50%` is not automatically a missed token.

The source audit must cover `pudl.css`, `pudl-windows.css`, supporting stylesheets, pseudo-elements and scripts that generate controls or assign styles. Native rendering must be checked separately from PUDL-painted surfaces. Tests must exercise actual generated controls after enhancement rather than infer their appearance from a static template.

## Baseline environments

The primary baseline matrix uses Chromium, Firefox and WebKit with Playwright 1.63.0. The input manifest records the browser builds declared by the installed package. Actual capture must also record `browser.version()`, executable path, OS/build, headless mode, Node version and any executable override. A declared browser version is not evidence that the executable was launched.

Each engine and operating system gets its own baseline. Windows and the Linux Playwright image must not share expected raster output. Linux capture must record the image digest as well as its tag. Browser upgrades require an explicit baseline migration with a comparison against the frozen earlier capture.

The main fixture uses bundled Inter with `pudl.css`, without the system-font override. The manifest includes all bundled font hashes. Capture must wait for `document.fonts.ready`, explicitly load the exercised weight/style/text combinations, check `document.fonts.check`, and verify successful font responses. A fallback-font render must fail the primary capture. Separate cases cover the system-font stylesheet and blocked-font behavior, identified as distinct environments. Monospace text must record its installed font source or remain in a separate platform-dependent comparison set.

Capture uses fresh browser contexts, `en-US`, UTC, device scale factor 1 and fixed CSS viewports of 1280 by 900 and 360 by 900. Both light and dark themes are explicit. Each runs without `data-skin` and with `data-skin="standard"`. Desktop cases run in LTR and RTL. Forced colours and reduced motion have separate cases. Reduced motion is enabled for stable raster capture; a separate interaction case verifies that animations stop under that preference. Deterministic fixture text and cleared persisted preferences prevent unrelated changes between captures. Actual captured scope is recorded separately in [STANDARD-BASELINE.md](STANDARD-BASELINE.md).

Browser viewport resizing is not evidence of browser zoom. A separate zoom review must exercise actual text enlargement and browser zoom using a supported route and record how it was performed. Pinch zoom, device scale and CSS transforms must not be substituted without identifying their different coverage.

## Recorded observations

Each sample records the element and pseudo-element identifier, category, exercised state, bounding box, client/scroll dimensions, padding, gap, all border widths/styles/colours, corner radii, fill layers, shadows, outline, clipping, font family/size/weight/line height, text/glyph colours and relevant computed tokens. Measurements also include adjacent backgrounds and the intended control boundary. Deterministic rounding rules must be recorded in the capture code.

The capture records accessible roles, names, states, tab stops and actual focused element identity through interaction. Runtime switching must retain mounted content, inputs, window state, URL and history. These behavioral expectations are independent of the visual snapshots.

Contrast checks must use effective backgrounds, including transparency, gradients and texture. A representative flat-colour sample is insufficient for a textured or translucent surface. The declared skin treatment must identify the boundary used to distinguish a control; a decorative white bevel alone does not establish its contrast. Visual inspection remains necessary for recognizability and clipped or ambiguous focus indicators.

Screenshots must be cropped by stable fixture regions and stored beside computed-style/geometry JSON. Capture must include actual hover, pressed and focus-visible states, rather than only class substitutions. Overlay positioning, large content and edge clipping require live interactions. Pixel comparisons use the same engine, OS and fonts; any antialiasing tolerance must be named and justified, and must not hide changed geometry or control edges.

## Expected results and comparison gates

The pre-sweep computed values and images become immutable expected artifacts. Post-sweep absence of `data-skin` and explicit Standard must both match them. Test code must never regenerate expected values as part of an ordinary run, and a changed shape token cannot update its own expected result.

New skins retain the component category map and independent behavior, contrast, target, clipping and reflow assertions. Each skin has an explicit approved treatment descriptor for its raised, pressed, sunken, recessed, lifted and flat parts. Standard's gradient/shadow assertions cannot be applied unchanged to a bevel treatment, and the new descriptor cannot simply accept whichever values the implementation happens to produce.

Target dimensions and readable reflow use specification requirements captured separately from skin tokens. Token-based assertions check consistency with the selected skin; they do not replace those independent bounds. A skin can pass its declared dimensions while still failing target or clipping requirements.

The capture sequence is as follows.

1. Verification completes the fixture/state inventory and freezes its capture code with the selected source snapshot.
2. Verification captures each environment twice without source changes, checks repeatability and inspects representative images before accepting expected artifacts.
3. Verification records any existing failures explicitly; baseline capture cannot silently approve a conformance defect.
4. The architect performs the token sweep after the baseline is accepted, while verification compares Standard against the frozen results and exercises token changes across the inventory.
5. Verification checks Bevel against its approved surface treatment and the shared independent requirements before broader skin implementation proceeds.

Palette precedence, persisted-skin fallback, type-scale changes and chrome-order behavior are architect-owned contracts recorded in `docs/SKINS.md`. Every skin must conform to PUDL; faithful exceptions are excluded. New-skin assertions must follow the approved versioned boundaries.
