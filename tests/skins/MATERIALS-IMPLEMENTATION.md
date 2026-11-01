# Material skin implementation verification

The measurements below describe the initial candidate. Paul's subsequent title-bar and focus refinements changed these stylesheet bytes; this record does not validate the revised candidates. See [the refinement design](../../docs/proposals/skin-palette-refinements.md) for the current contract.

Matte, Ink, Alloy and Glass were implemented and self-tested on Windows on 1 November 2026. Their definitions, compiler mappings, readable and minified CSS, preview choices and documentation are complete. All four remain unadmitted candidates. This record reports implementation evidence; it does not grant independent admission or authorize publication.

The design is in [material-skins.md](../../docs/proposals/material-skins.md). Base component styles, runtime scripts, fonts and the three existing admitted skin stylesheets are unchanged. The generator still verifies the existing admission hashes.

## Verified CSS

The final generated catalogue binds these readable stylesheets. Minification freshness checks cover their minified copies and source maps.

| Skin | SHA-256 |
| --- | --- |
| Matte | `e2ebea746646d2298e956d820eee3fb771bbe448f0f88d83ef91b317b1982272` |
| Ink | `fe753aff09f0b0a1932a8eb415396388b68fae415a578b209602c33559c38ddb` |
| Alloy | `6bc8f97d81b41ff8fa8da345fa3aca7a8f5c60a3ef439354816c0e9b2e4d3fe4` |
| Glass | `e081e934a54a68126c512e48e0a40a3da3fff6b047870252d910c68622bb831f` |

## Results

Every browser matrix below includes Chromium, Firefox and WebKit. Evidence paths are relative to the repository root. Binary captures and raw results under `tests/output/` are ignored by Git and must be retained separately for review.

| Check | Result | Evidence under `tests/output/` |
| --- | --- | --- |
| Definition and compiler unit tests | 10/10 | `node --test build/skin-definition.test.js build/skin-css.test.js` |
| Skin and minification freshness | Pass; 41 minified copies match | `node build/skins.js --check`, `node build/minify.js --check` |
| Catalogue geometry, type and surface categories | All 154 cases in both forms; 0 findings for each skin | `material-matte-catalogue-2/`, `material-ink-catalogue-2/`, `material-alloy-catalogue-1/`, `material-glass-catalogue-final/` |
| Rendered text contrast, including gradients and pressed states | 96/96 per skin | `material-{matte,ink,alloy}-gradient-1/`, `material-glass-gradient-final/` |
| Extended rendered focus | 66/66 required checks per skin | `material-{matte,ink,alloy}-focus-1/`, `material-glass-focus-final/` |
| Live focus activating an initially inactive window | 6/6 per skin | `material-{matte,ink,alloy,glass}-live-focus/` |
| Narrow RTL, blocked fonts, system fonts and doubled computed text | 168/168 across all seven external skins | `materials-environments/` |
| Palette contrast and category/status separation | 3408/3408 across Standard and all seven external skins | `materials-palettes/` |
| Glass context menus, taskbar stacks, snapping and docking | 24/24 engine/form/suite pairs | `material-glass-behavior/` |
| Integrated skins, taskbar row heights, execution states and status suites | 21/21 normal; 21/21 minified | `material-skins-final-normal.log`, `material-skins-final-minified.log` |
| Final material and host-palette browser tests | 10/10 normal; 10/10 minified | `material-skins-host-final-normal.log`, `material-skins-host-final-minified.log` |

The final material tests verify loaded-link registration, selection without requests, retained input nodes and edits, focus, window state and history, and unchanged control boxes and semantics. They also check hover, pressed and keyboard focus states, actual menu access, later host accent overrides, narrow reflow, and exclusion from forced-colour and print rendering. A nested `data-skin` attribute cannot activate Glass's root-only rules.

Glass is tested over black, white and checkerboard backgrounds. Its reading surfaces remain opaque, and its window menu stays inside the viewport. Chromium exercises both transparency preferences through the browser protocol. The unsupported-filter path is tested by changing the feature query to an unsupported property on a current browser; it is not an old-browser compatibility test. Other engines use the transparency preference reported by Windows. Visual inspection covered representative desktop, narrow RTL, enlarged-text and checkerboard captures.

## Corrections and retained diagnostics

The first catalogue runs exposed missing inactive-tab depth in Matte and Ink, and inset edge lighting on Glass's read-only surfaces. The corrected results above retain the original failed logs beside them. Glass's window selectors were subsequently restricted to the document root, with a regression test and fresh catalogue, gradient and focus evidence for the final hash.

Early browser fixture failures counted a hidden generated taskbar node and assumed that the platform allowed transparency. A later narrow capture also exposed a test setup conflict between the preview's URL selection and the injected optional runtime. The final checks filter hidden nodes, exercise both transparency preferences and assert that runtime and preview selection agree. The original logs remain available.

The focus harness retains its existing Standard controls and CSS-only inactive-header diagnostics outside the 66 required checks. The separate live-focus tests confirm window activation and the rendered focus indicator with the window manager loaded. These diagnostics have not been relabeled as new-skin passes.

## Admission and limits

`node build/skins.js --check --release` intentionally fails at Matte because its registry entry is unadmitted. The existing CI release gate therefore remains blocked until independent review approves the candidates and records their admission hashes. No gate was bypassed, no release version was changed and nothing was committed or published.

This work does not establish Linux rendering, native browser zoom or manual screen-reader interoperability. The integrated run covers the affected suites rather than the complete release matrix. Arbitrary host palettes still require their own skin/theme validation. Independent admission and the full release gates remain separate work.
