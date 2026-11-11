# PUDL 0.107.0 verification

This release adds opt-in single-application menu composition requested for the standalone Editor. The contract is in [MENU-BARS.md](MENU-BARS.md#single-application-bar), and the implementation decision is in [the design record](proposals/single-application-menu.md).

## Candidate checks

The readable menu regression run passed all 45 Chromium, Firefox and WebKit suite runs. After the regression was extended, the final application suite passed in all three engines. It covers the merged identity and menu order, actual document commands, shared contributions, shortcut scope, changed enabled state, ribbon identity and selection, collapsed navigation, focus retention, stale command refusal, empty identities, site pin boundaries and active-document changes. The public sample also exercises a document applet outside any window. Light and dark screenshots were inspected.

The matching minified menu regression run passed all 45 engine-suite runs. The final application regression, including the desktop File mnemonic, also passed in all three engines against both readable and minified scripts. The skin release check and fourteen build unit tests pass. The reference page was checked in light and dark, including Start filtering, launcher popup and pane transitions, and focus return, with no page errors.

The release archive selection contains 512 files, including all 196 distribution files. Its 990 local references resolve within that selection. Full branch and tag gates remain required before publication; candidate checks alone do not clear the release.

## Adoption

A host replaces PUDL whole and adds `data-menubar-composition="application"` to its standalone document bar. Its applet menu provider requires no change. The first applet title remains the identity, whose commands appear before the host's own identity commands. Existing host-launcher and pin contracts remain in force. The [sample](../samples/application-menu.html) shows the option without a window manager.

Dinah owns the standalone Editor page change and its installed acceptance. The Markdown attribute correction belongs to yavc.app and is independent of this PUDL feature. This release makes no claim about that correction, native file dialogs, touch or manual assistive-technology testing.
