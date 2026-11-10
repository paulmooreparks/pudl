# Standard boundaries and Alloy Bold

Paul requested two changes in GKC Collaboration messages 5427, 5429 and 5430 on 11 November 2026. Standard needs firmer raised-control boundaries, and an additional Alloy-like skin should retain crisp edges while using Standard's stronger active-title colors. The existing skin selection and default remain unchanged.

## Standard boundary correction

Standard's raised border currently mixes a small proportion of the shade color into the surface, controlled by Depth. That makes the line faint by design. This correction targets raised controls through `--raise-border` and `--raise-border-hover`; flat surface dividers retain their separate `--border` token. The rest boundary uses the neutral secondary-text token, which already has a text-contrast contract against application surfaces. Hover uses the foreground token. Theme Depth continues to govern elevation shadows and pressed surfaces.

The stack's exposed rear outline uses the same neutral secondary-text token independently of the selected skin. Its fill and radius still come from the skin's raised treatment. This identifies the stack without borrowing state colors or relying on a soft shadow. The non-text stack cue has a 3:1 minimum against the adjacent taskbar ground. This is a product acceptance floor for the stack cue; it is not a claim that WCAG requires every decorative button border to reach 3:1. [WCAG's explanation of non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) distinguishes required identification cues from optional component boundaries.

## Alloy Bold

The new skin is named Alloy Bold with ID `alloy-bold`. It retains Alloy's control geometry and material treatment while inheriting Standard's active-title background and foreground. The shared Standard defaults remain the source of those formulas, including their distinct dark-mode treatment. No theme's semantic palette is replaced or strengthened by inventing different hues.

Title-bar chrome, state chips, focus rings and inactive windows require rendered comparison in both themes. The skin remains a candidate until its compiler, geometry, behavior, contrast and source/minified admission checks pass. The generated stylesheet and catalogue must come from the existing skin compiler. Dinah offered to verify its host theme library after receiving a frozen candidate; that validation must remain separate from upstream evidence.

## Review findings carried forward

The first stack-edge candidate is retained unchanged under `tests/output/stack-edges-209a8b54be86` in the original PUDL checkout. Review messages 5422 and 5423 found faint rear outlines in dark skins, possible confusion with singleton shadows, missing state comparison images and a clipping rule that affected ordinary entries. The revised implementation strengthens the neutral rear outline, confines visible overflow to entries with stack depth, measures rear-outline contrast in rest/current/pressed states, and adds current/pressed comparison images. Ordinary and restored singleton entries must retain their original clipping.

## Title-chrome correction

The first rendered chrome audit found a 2.59:1 close-glyph hover contrast in Alloy Bold with the dark Bevel palette. The candidate therefore needs a skin-owned close-hover foreground token, using the same neutral-biased danger treatment as execution-state glyphs. The shared window component consumes that token with its existing danger color as the fallback, so other skin identities retain their current close-hover paint. The audit checks the glyph against screenshot pixels from its actual gradient background, along with the execution-state chip and visible keyboard focus.

## Baseline comparison

The historical Standard comparison remains tied to commit `92b25d1`. Its expected CSS receives bounded substitutions for the two approved Standard raised-border declarations and the fixed-pitch stack count. Every substitution must match once. The new decorative span is hidden in the historical fixture so its absence of styling cannot introduce a spare flex gap. All remaining historical paint and geometry stay in the comparison. The initial combined run exposed the old count-font expectation in all three engines; those failures remain in `tests/output/stack-alloy-source1`.

## Readable-asset verification

The final readable-asset matrix passed all 45 focused suite runs across Chromium, Firefox and WebKit with `PUDL_JOBS=1`. Its immutable output directory is `tests/output/stack-alloy-source-final`. The matrix covers stack behavior and geometry, launcher and popup regressions, font arrival, all skin compiler/runtime/material checks, companion palettes and the new title/chrome audits. The 20 compiler, definition, palette and test-runner unit checks also passed.

Stack-outline measurements cover nine skins, both light and dark modes, both directions and resting/current/pressed faces with the Standard palette. The minimum measured contrast against the taskbar ground was 4.557:1. Title and chrome audits cover Standard, Bevel, Gel and Glaze palettes in both modes. The minimum sampled title-text contrast was 5.136:1, and the minimum chrome-glyph contrast was 4.078:1. Keyboard-focus paint and execution-state chips passed their checks. These are scoped measurements, not a claim of a complete manual accessibility audit.

The inspected contact sheets compare resting and current/pressed stacks in all nine skins, and Standard, Alloy and Alloy Bold title bars under all four palettes. Standard's stronger raised boundaries do not alter flat dividers, control dimensions or the selected default. Dinah's custom theme admission and real-host checks remain separate and pending.

## Independent review request

PUDL retains ownership while review is pending. Dinah's offered audit should check its built-in themes and GK Companion's themes against Alloy Bold in an isolated candidate fixture, including active-title text, chrome hover/focus, state chips, long titles and narrow taskbars. Its stack check should include windows joining and leaving the group. This request does not authorize a vendored dependency update, application installation or restart.

yavc.app should review the revised outlines and current/pressed sheets against its findings in message 5422. Paul can judge the Standard and Alloy Bold comparisons at their original size. The skin remains unadmitted until independent review closes. Publication also requires the complete release gates and correction of the previously reported title-separator encoding defect; neither is claimed by this candidate.

## Minified verification and candidate status

The final minified-asset matrix also passed all 45 focused suite runs across Chromium, Firefox and WebKit with one worker. Evidence is retained separately in `tests/output/stack-alloy-minified-final`. Both matrices ran against the same distribution inputs. Compiler freshness, all 48 minified copies, registered hashes for existing admitted skins and `git diff --check` passed. Earlier failed probes remain retained.

The combined result is ready for independent source, visual and isolated host-theme review. The archive manifest and adjacent `handoff.json` identify its immutable distribution fingerprint, archive checksum and complete file hashes. The candidate remains uncommitted and unpublished, Alloy Bold is unadmitted, and no consumer installation or restart has occurred.

## yavc.app visual review

In message 5437, yavc.app Development reviewed the supplied pictures and record without examining the archive or source. Its faint-outline finding is resolved, and its title-bar review confirms the requested Alloy controls with Standard active-title colors. This establishes visual review only. Independent host-theme admission remains pending.

The original state sheet shows Atlas as current and Beacon with the pointer held down in its pressed state. A caption-only supplement labels both explicitly in every skin and theme and includes the resting comparison. A separate Bevel/Ink sheet retains the original UI pixels at 1:1 scale for Paul's review of the stronger singleton borders. The supplement is stored in `C:/Users/paul/source/repos/pudl/tests/output/stack-alloy-review-5437`, with per-image hashes in `supplement.json`. The frozen archive and its original evidence are unchanged.

## Independent host audit

Dinah Team Lead reported no failures in message 5439 for candidate `8739390d5601`. The audit used a throwaway GK Companion copy with the candidate distribution and a temporary admission flag for Alloy Bold. Dinah reports that the copy was deleted and nothing was vendored, installed or committed.

The host ran both its palette rules and rendered skin-control checks across sixteen built-in themes, nine skins and both modes, with no failing pair. It confirmed that Alloy Bold's active-title fill and foreground match Standard in the GK Companion theme while retaining Alloy chrome. At 760 pixels, two-, three- and four-window stacks retained every button's position and dimensions and the 43-pixel row height. Ordinary and restored singleton clipping remained hidden; long titles stayed contained. Standard and Alloy Bold rear edges were visible in both modes, closing Dinah's faint-edge finding.

The host observed the documented two-to-four-pixel neighbor movement when a singleton title becomes a stack label. It attributed no additional movement to the decoration. The second edge of a final stack approaches the status area within roughly two pixels; the host found it readable. These observations remain visible product choices.

This host audit did not exercise live chat state chips, touch, or current/pressed faces beyond the supplied comparison sheet. Shared PUDL fixture checks cover state glyphs and current/pressed paint, but do not establish those omitted real-host cases. Paul's visual acceptance remains pending, and Alloy Bold remains unadmitted. Full release gates and the title-separator correction remain outstanding before publication.

For later intake, Dinah requires a stylesheet link for the new skin in both its main page and slideshow page. Its two title-separator workarounds can be removed only after the corrected release is verified. This record authorizes no host dependency update or restart.

## Visual acceptance

Paul accepted the supplied comparisons on 11 November 2026 with "Those look good." This closes visual acceptance for candidate `8739390d5601`, including the stronger Standard boundaries, Alloy Bold title treatment and Bevel/Ink stack appearance. The labeled supplement remains associated with that candidate; the frozen archive is unchanged.

The acceptance covers the reviewed appearance. Publication, a default-skin change and consumer installation remain separate actions. The title-separator correction and complete release checks are still outstanding. Alloy Bold's registry admission remains deferred to release preparation.

## Release preparation started

Local preparation now targets 0.106.0. Alloy Bold's registry entry admits its reviewed generated hash under the [admission record](../../tests/skins/RELEASE-0.106.0-ADMISSION.md). The title separator is corrected to one UTF-8 middle dot, and item details outside the window layer receive the layer's custom separator explicitly. Both forms pass the focused separator regression in all three engines. Full release checks remain in progress and are tracked in the [release record](../RELEASE-0.106.0.md).

Paul clarified in message 5454 that his latest-release intake request meant yavc.app 0.2.65. It does not authorize PUDL publication or consumer installation. His decision in message 5458 retains the HTML UI; this work adds no native renderer.
