# Shared-topbar fitting correction

This candidate is isolated in C:/Users/paul/source/repos/pudl-topbar-fixes on fix/topbar-fitting, based on tagged v0.107.1 commit e2c05a919dba47ead103b0940e51f3d8200fb01a. Primary design/host-launcher-demos and the uncommitted scheduler worktree are separate and were not used as runtime inputs.

## Scope and implementation

Intrinsic toolbar measurement now resets helper-owned folded stages before filtering groups by authored visibility. This lets stage-5 groups participate in full-width measurement while hidden attributes and host display:none rules remain effective. Original stage values are restored after measurement. Keep groups, priority and end ordering retain their existing policies.

A successfully enhanced folding toolbar receives an internal readiness class after its fold controls have been constructed. Single-row clipping applies only in that state. Before enhancement the toolbar and its groups can wrap within available width, retaining native controls. Host-hidden controls remain hidden. The class is generated state, not a new host configuration input.

An enhanced menubar sharing a topbar with a folding toolbar, fold-order child or ribbon now establishes the one-row layout before horizontal allocation. It no longer requires ribbon opt-in. The selector is limited to enhanced shared compositions; unenhanced bars retain wrapping. The menubar JavaScript itself is unchanged. No launcher, tone, scheduler or date extension is included.

## Reproduction and verification

The two original supplied pages are retained as fixtures with asset URLs changed to the worktree's own dist files. The new regression separately checks narrow-load widening, shared-row fitting without ribbon and native no-script bounds. Original tagged execution failed all three checks in each engine, 0/3 suite runs and exit 1, in tests/output/topbar-original-red-browser-20261113. The first attempt before the node_modules junction existed failed to resolve Playwright; that harness failure remains separately in topbar-original-red-20261113 and is not product reproduction evidence. An initial edit attempt made no source change because of line-ending mismatch; its unchanged red execution remains in topbar-first-green-20261113 despite that directory's premature name.

The corrected focused suite passes 3/3 engines in topbar-expanded-source-20261113. It additionally checks repeated forced intrinsic measurement, narrowing/widening, LTR/RTL, authored hidden and CSS-hidden groups, end groups, keyboard opening and Escape dismissal of folded command menus. Captures show narrow no-script controls, a single shared enhanced row and restored wide commands. No sleeps or arbitrary test delays were added; the suite awaits font readiness and animation-frame layout work.

Final source/minified matrix results and asset hashes will be appended after terminal completion. Independent verification is required before packaging. No commit, tag, release, installation, restart or archive change is performed by this correction.

## Final candidate handoff

The serial source regression matrix passed 27/27 in 85 seconds, terminal exit 0, in tests/output/topbar-final-source-20261113. The matching minified matrix passed 27/27 in 114 seconds, terminal exit 0, in tests/output/topbar-final-min-20261113. The nine suites per engine are topbar-fitting, toolbar-fields, toolbar-fold, toolbar-refit, toolbar-work, menubar-application, menubar-ribbon, menubar-toggle and ribbon-tab-tips. All 54 raw/effective result records passed without printed failures or watchdog timeouts. tests/output/topbar-final-audit-20261113.json retains their records alongside the three original failing tagged suite records. Earlier evidence is unchanged.

Exact sizes and SHA256 comparisons with tagged bytes are in tests/output/topbar-candidate-hashes-20261113.json. Readable toolbar JavaScript is 53274 bytes with SHA256 6baf776897b8e97ea6de9bfeb3efb8fca4df15eaaaa63b39278ffec1f76960ae. Readable base CSS is 265142 bytes with SHA256 4a22b5ce602813da099ffb9908420cde1d8678171218c3ae989cd0fe9b8b494d. Menu and menubar JavaScript, readable and minified, remain byte-identical to v0.107.1. Generated CSS/toolbar copies and maps are synchronized; all 48 minified files pass freshness. Syntax and whitespace checks pass.

The candidate diff changes dist/pudl-toolbar.js and dist/pudl.css, their four generated files, two new original-repro fixtures, tests/topbar-fitting.test.js and this record. No existing test was edited. The Chromium no-script capture was visually inspected and shows every original native button within the narrow toolbar. Engine-specific source/min captures are retained in each final run's topbar-fitting screenshots directory. Native no-script controls are tested for visibility and bounds, not a PFO service action. Host-specific native form/link actions, actual screen-reader output, older supported engines, browser-chrome zoom and the deployed PFO page are not certified by this matrix.

All owned runners and browsers have exited, and port 8784 has no listener. The worktree uses a node_modules junction to the primary checkout, which must be treated as a junction during eventual cleanup. There is no commit, release, packaging, installation or restart. Independent verification must assess this exact diff and its hidden-group measurement, enhanced shared-row and no-script policies before any packaging decision.
