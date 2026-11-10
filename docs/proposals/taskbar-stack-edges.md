# Taskbar stack edges

Paul authorized implementation in GKC Collaboration message 5419 on 11 November 2026. PUDL owns the drawing; hosts adopt the shared distribution rather than styling generated buttons independently. This work follows the [Architectural Principles](C:/Users/paul/OneDrive/Documents/Architectural%20Principles.md).

## Design

A taskbar stack exposes one raised rear edge for two represented windows and two rear edges for three or more. The numeric count remains the exact count. The applet identity and execution or attention marks stay on the front face. Rear faces carry no state color.

The count uses the existing monospace typography token. A WebKit regression probe showed a 0.15625-pixel width difference between the proportional count's digits despite the tabular-number request. Fixed-pitch numerals keep changes within the same digit count from nudging the neighboring entries. Existing label changes, transitions between singleton and stack content, and changes in the number of count digits retain their normal responsive sizing behavior.

Every taskbar destination already has a six-pixel gap after it, and the dock has four pixels of padding. Four pixels of that existing gap and padding provide the rear-face allowance for all entries. No extra margin or row height is introduced. The decorative edges occupy that space without changing button dimensions or taskbar height as stack membership changes. Existing title, count and responsive layout decisions remain authoritative; the decoration must introduce no additional movement. RTL places the exposed edges at the opposite inline end.

The rear faces use the current skin's raised background and radius, with a neutral secondary-text outline that stays visible against the taskbar ground. They remain raised when the front face is current or pressed. Forced colors uses explicit system-color outlines. The complete pile belongs to one button and one accessible name; its rear faces are decorative, unfocusable children with no independent handlers or animation.

This applies to ordinary grouped taskbar buttons and aggregate pinned stacks. Stack chooser rows, dock pane tabs, authored taskbar commands and menus retain their existing presentation.

## Verification and handoff

Focused browser coverage must include two and three-or-more counts, joins and departures, singleton restoration, pinned and unpinned stacks, folded labels, horizontal overflow, current and pressed faces, state marks, RTL, enlarged text, coarse pointers and forced colors. Skins must derive the rear paint from their existing tokens. Readable and minified copies must pass Chromium, Firefox and WebKit checks, with screenshots inspected before handoff.

## First candidate implementation

The implementation is isolated in `C:/Users/paul/source/repos/pudl-stack-edges` on `feat/taskbar-stack-edges`, based on `6b204a6`. The window renderer adds one decorative span and a capped depth attribute. The stylesheet paints clipped rear faces in the dock's existing space. Only the window script and stylesheet, their minified copies and source maps, related contracts and tests change. Hosts need no new initialization, preference or metadata fields.

Both final matrices passed all 33 focused suite runs with one worker, covering Chromium, Firefox and WebKit. The source evidence is in `tests/output/stack-edges-source-final/`; minified evidence is in `tests/output/stack-edges-minified-final/`. Each matrix runs compact navigation, popup and return behavior, stack state, label folding, font arrival, pins, equal row heights, stack edges, full-mode stacks and ordinary stacks. The dedicated edge suite covers all eight skins in both themes and directions, yielding 96 skin/theme/direction observations per matrix. The new test also checks unchanged geometry when decorations are hidden, two-to-three-to-four membership changes, singleton restoration, pinned aggregates, rear-edge hit testing, keyboard focus recovery, pressed and current front faces, forced colors, enlarged text and emulated touch targets. Firefox's narrow page does not claim mobile emulation.

All 47 minified copies passed freshness verification. JavaScript syntax and whitespace checks passed. The 16-view skin contact sheet, the forced-colors screenshot and individual Standard/Glass screenshots were inspected. The contact sheet is `tests/output/stack-edges-skins.png`. No physical touch, desktop input automation, complete repository CI, host installation or restart is claimed.

Exploratory failures remain retained. The first test incorrectly required a gradient even for skins with a solid raised fill; it now accepts either supported paint form. The enlarged-text test counted intentional rear paint as clipped content; it now checks the foreground bounds while retaining equal-height assertions. A real WebKit single-digit count-width change was resolved with the monospace count token and remains covered by exact geometry assertions. The exploratory artifacts are in `tests/output/stack-edges-initial/`, `stack-edges-probe2/`, `stack-edges-probe3/` and `stack-edges-regressions-source-initial/`. The final matrices were run after those corrections and were not overwritten.

## First candidate limitations

The implementation is ready for source and visual review. It is uncommitted and unpublished. A frozen distribution candidate and manifest are produced under `C:/Users/paul/source/repos/pudl/tests/output/stack-edges-*`; that candidate contains all 193 distribution files, source and minified matrix summaries, the patch, contracts and a skin contact sheet. The manifest and archive checksum identify the supplied bytes independently of the working tree.

The decoration introduces no new layout movement. Existing singleton-title changes and count-digit-width changes still use their normal sizing behavior; this work does not freeze a button's width across different content. The separate title-separator encoding defect in the 0.105.0 baseline remains unchanged in this feature candidate and must be corrected before a release. The original dirty demo checkout and unrelated proposals remain untouched.

PUDL retains implementation ownership pending review. Dinah and yavc.app may review the frozen source and screenshots; this handoff requests no consumer installation, restart or runtime-test round. A release requires its own complete gates and publication step.

## Revised candidate

Review messages 5422 and 5423 requested stronger rear outlines, current and pressed comparison images, and clipping limited to actual stacks. These corrections are implemented. Rear-outline contrast is measured against the taskbar ground in every skin, theme and direction, including current and pressed states. Ordinary and restored singleton entries retain hidden overflow. The original frozen candidate remains unchanged.

Paul subsequently authorized firmer Standard control boundaries and the additional Alloy Bold skin. The [skin decision record](standard-boundaries-alloy-bold.md) defines that expanded scope and its separate admission boundary. The combined candidate includes the compiler, sample preview and rendered checks for that work; it remains uncommitted and unpublished.

The revised combined candidate passed 45 readable and 45 minified focused suite runs across Chromium, Firefox and WebKit, plus 20 unit checks. Evidence is retained in `tests/output/stack-alloy-source-final` and `tests/output/stack-alloy-minified-final`. The frozen combined candidate is recorded under `stack-alloy-*` in the original checkout's ignored test-output directory. The first candidate and failed probes remain intact.
