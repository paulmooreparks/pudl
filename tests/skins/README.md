# Standard preservation capture

The capture harness records pre-sweep appearance independently of new shape tokens. [COVERAGE.md](COVERAGE.md) defines the inventory and requirements. `baseline-inputs.json` is the earlier planning observation; it is not a rendered baseline.

Capture requires the repository's installed Playwright browsers and bundled font assets. Raster comparison requires Python with Pillow. Capture runs serially and should not overlap broad browser suites.

```powershell
node tests/skins/capture.js --source <frozen-source> --out <new-capture-directory>
node tests/skins/capture.js --source <frozen-source> --out <second-new-capture-directory>
node tests/skins/compare.js <first-capture-directory> <second-capture-directory> --live-noise
```

Every output directory must be new. The harness refuses to overwrite it. Default capture covers Chromium, Firefox and WebKit; 1280px and 360px widths; light and dark; and absent versus explicit Standard. The viewport height is 900px. The primary fixture uses bundled Inter with fixed locale, timezone, device scale and reduced motion. The manifest records actual launched versions and source hashes before and after the run.

`--engines chromium` narrows an investigation. `--phase catalogue` or `--phase structural` runs one phase. `--widths 1280`, `--themes light`, `--direction rtl` and `--forced-colors active` select supplemental environments. `--selections absent` captures only the absent attribute. Such narrowed runs must not be reported as the default matrix.

The catalogue phase renders all base components, variants and declared states. It applies each definition's target selector, captures all declared parts and both pseudo-elements, and records representative real hover, keyboard-focus and pointer-down states. Hidden elements have zero coordinates rather than coordinates derived from the page's scroll position.

The structural phase exercises generated chrome, open menus, window placements, stack popups, Arrange, toasts and tooltips. The applet/region shell fixture records visual boundaries; it does not exercise applet startup or region navigation. Existing behavioral suites retain those responsibilities. A synthesized title double-click drives the maximized visual fixture; this capture is not a pointer interoperability test.

The harness waits for fonts, finite animations and stable live layout. It queries observed nodes synchronously within one page evaluation so detached controls from a rebuilding menu do not masquerade as empty styles. State changes and screenshots must not silently bypass failed readiness conditions.

Computed observations and catalogue images require exact equality. The optional `--live-noise` allowance applies only to live-page images, with at most 100 differing pixels and a maximum per-channel difference of 12. Initial probes showed 3 to 15 antialias pixels with differences of 5 to 10 despite identical computed geometry. Every allowance is printed with its pixel count and bounds. Changed image dimensions, larger raster differences and all computed-data changes remain failures. The comparator never rewrites expected artifacts.

The baseline acceptance record must identify the actual captures and their repeatability results. Probe directories remain evidence of harness development, and must not be described as accepted expectations. The source snapshot must remain available after the live checkout changes.

Passing preservation comparisons establishes unchanged captured Standard appearance. It does not establish contrast, target-size or new-skin conformance. Actual browser zoom, manual assistive technology checks and additional platform environments require separately reported evidence.

The separate `bevel-review.js` harness checks a frozen preview candidate without changing preservation expectations:

```powershell
node tests/skins/bevel-review.js <frozen-source-with-preview> <new-review-directory>
```

It checks catalogue geometry and base part surface treatments in both forms and all three engines, then measures preview reflow, retained edited content and flat-fill text/boundary contrast. It records destructive-button rest, hover and pointer-down contrast and compares Standard's corresponding paint against the original frozen styles. That comparison requires the retained `tests/output/skins-source-20261030-1702` snapshot. Results and limitations are recorded in [SWEEP2-BEVEL-REVIEW.md](SWEEP2-BEVEL-REVIEW.md). Passing this initial review does not admit a skin or replace the remaining interaction matrix.

The independent runtime, behavior and rendered focus checks run separately and require new output directories:

```powershell
node tests/skins/runtime-review.js dist/pudl-skins.js <new-runtime-directory>
node tests/skins/behavior-review.js <frozen-source-with-preview> <new-behavior-directory>
node tests/skins/focus-review.js <frozen-source-with-preview> <new-focus-directory>
```

Run these serially. The runtime source is read once at startup. The behavior harness runs the existing context-menu, taskbar-stack, snap and docked suites against Bevel-styled HTTP fixtures. The focus harness measures actual changed pixels around a keyboard-focused button and retains original Standard as a control. [RUNTIME-REVIEW.md](RUNTIME-REVIEW.md) and [BEHAVIOR-FOCUS-REVIEW.md](BEHAVIOR-FOCUS-REVIEW.md) record their evidence and limitations.

Pass `--extended` to the focus harness to include destructive controls, invalid fields/listboxes and adjacent control surfaces. The admission check uses the ring's rendered contrast against the neighboring surface on each side. Before/after pixel changes remain diagnostic data. [OPAQUE-FOCUS-REVIEW.md](OPAQUE-FOCUS-REVIEW.md) records this expanded review.

The two-colour chrome treatment adds separate band-area and edge checks. `live-focus-review.js` exercises the window manager's keyboard activation path at actual preview positions, and `focus-fallback-review.js` compares the changed paths with frozen Standard. [CHROME-FOCUS-REVIEW.md](CHROME-FOCUS-REVIEW.md) records their commands and the distinction between live states and the retained CSS-only inactive diagnostic.

Gel and Glaze use the same independent geometry harness with an explicit skin selection. Their gradient and rounded-focus checks run separately:

```powershell
node tests/skins/bevel-review.js <frozen-source> <new-output> --skin gel
node tests/skins/gradient-review.js <frozen-source> <new-output> --skin gel
node tests/skins/focus-review.js <frozen-source> <new-output> --extended --skin gel
node tests/skins/focus-fallback-review.js <frozen-source> <new-output>
node tests/skins/palette-review.js <frozen-source> <new-output>
```

Replace `gel` with `glaze` for that candidate. The palette harness checks canonical category assignments, category contrast on three surfaces, category-to-accent separation, status separation and neighboring-category distance under normal and simulated colour vision for every included skin. Earlier reports record the narrower harness scope used at that time. [GEL-REVIEW.md](GEL-REVIEW.md) records the initial Gel evidence.

[GLAZE-REVIEW.md](GLAZE-REVIEW.md) retains the initial palette failure, corrected-palette evidence and the scope of the rendered Glaze review.

Supplemental checks run serially against immutable inputs:

```powershell
node tests/skins/behavior-review.js <frozen-source> <new-output> --skin gel
node tests/skins/live-focus-review.js <frozen-source> <new-output> --skin gel
node tests/skins/environment-review.js <frozen-source> <new-output>
node tests/skins/host-review.js <frozen-runtime-directory> <new-output>
```

The environment harness covers narrow RTL, blocked-font, system-font and enlarged-root-text conditions in both forms for all three skins. Its enlarged-text condition does not emulate browser zoom. The host harness reads both runtime files once and checks host-owned startup, storage suppression and edited-content retention. [ADMISSION-GATES.md](ADMISSION-GATES.md) records the release scope and unresolved requirements.

The final environment harness enlarges actual computed text sizes; the earlier root-only probes are retained as ineffective enlargement evidence. `field-preservation-review.js` adds default field measurements and raster comparisons, with `--control-original` for the original-versus-original diagnostic. `field-raster-review.py` reports the browser-drawn select separately without modifying the original failed results. [FINAL-ADMISSION.md](FINAL-ADMISSION.md) records that scope and the final admission disposition.

`zoom-session.js` prepares a dedicated headed browser for native menu operation. Its capture endpoint must only be used after the native menu's actual zoom setting has been inspected. The recorded attempt could not operate that menu because the Windows helper failed, so it establishes no zoom pass.
