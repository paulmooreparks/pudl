# PUDL 0.107.0 verification

This release adds opt-in single-application menu composition requested for the standalone Editor. The contract is in [MENU-BARS.md](MENU-BARS.md#single-application-bar), and the implementation decision is in [the design record](proposals/single-application-menu.md).

## Candidate checks

The readable menu regression run passed all 45 Chromium, Firefox and WebKit suite runs. After the regression was extended, the final application suite passed in all three engines. It covers the merged identity and menu order, actual document commands, shared contributions, shortcut scope, changed enabled state, ribbon identity and selection, collapsed navigation, focus retention, stale command refusal, empty identities, site pin boundaries and active-document changes. The public sample also exercises a document applet outside any window. Light and dark screenshots were inspected.

The matching minified menu regression run passed all 45 engine-suite runs. The final application regression, including the desktop File mnemonic, also passed in all three engines against both readable and minified scripts. The skin release check and fourteen build unit tests pass. The reference page was checked in light and dark, including Start filtering, launcher popup and pane transitions, and focus return, with no page errors.

The release archive selection contains 512 files, including all 196 distribution files. Its 990 local references resolve within that selection. Full branch and tag gates remain required before publication; candidate checks alone do not clear the release.

## Frozen candidate

The tag `v0.107.0` resolves to `d21b2a56ef0a10a3fdaf8e2ce6598a5d7d3d734c`. The draft release holds the reproducible 7,224,300-byte archive, its ASCII checksum file, and the complete distribution manifest. Every archived file was compared with its tagged Git blob, including the archive comment's commit identity. The manifest was generated from the tag with `build/release-manifest.js` and includes version, tag, commit, byte counts, SHA-256 and SHA-384 integrity values.

| Asset | SHA-256 |
| --- | --- |
| `pudl-0.107.0.zip` | `810e579b270243c42fd17f715ea1196ee5222fe47a8d260fa37d9547d61d1dbc` |
| `pudl-0.107.0-dist-manifest.json` | `3bd673ab0a3456be0cd176b9a0db960774ae90cbb6935464f6d8689e6dead0f6` |

The complete [branch gate](https://github.com/paulmooreparks/pudl/actions/runs/42939237593) and [tag gate](https://github.com/paulmooreparks/pudl/actions/runs/42939237823) both failed and this release remains held. Each gate contains 663 successful suite results and one Linux WebKit failure in the new application regression. The failure times out focusing About Notes after expanding the viewport from its collapsed menu. Every preceding check in that regression passes. All four artifacts from each run are retained locally, including the failed output, and the tag and draft assets remain unchanged.

The [Linux focus comparison](https://github.com/paulmooreparks/pudl/actions/runs/42941527657) establishes the cause. In all six readable and minified baseline attempts, the Enter event arrived at the note textarea at a width of 1600 pixels while the bar still had its collapsed state and the identity title was hidden. All six attempts with a wait for the expanded state passed. The test had assumed that setting the viewport completed PUDL's deferred responsive measurement. Version 0.107.1 corrects that test precondition and retains the same menu runtime.

## Adoption

A host replaces PUDL whole and adds `data-menubar-composition="application"` to its standalone document bar. Its applet menu provider requires no change. The first applet title remains the identity, whose commands appear before the host's own identity commands. Existing host-launcher and pin contracts remain in force. The [sample](../samples/application-menu.html) shows the option without a window manager.

Dinah owns the standalone Editor page change and its installed acceptance. The Markdown attribute correction belongs to yavc.app and is independent of this PUDL feature. This release makes no claim about that correction, native file dialogs, touch or manual assistive-technology testing.

Dinah's scratch-host candidate audit passed in Chromium with the one-attribute opt-in. It showed one YAVC Editor group with File, Edit, View, Insert, Format and Review; the identity contained Key Bindings followed by the host entries, with Close Window last. Editing, saving, refused saves and recovery behaved as before. That audit did not cover other engines, keyboard, ribbon, collapsed navigation or the native window.

The host audit found a temporary startup mnemonic warning. The Editor wrapper returned an empty titles list while loading, which selects PUDL's existing generic content identity and its Copy Link command. Composing that command with the host's explicitly marked Close Window reallocates the colliding letter. The recommended provider correction is an explicit identity with empty items until its real commands are ready. This uses the existing contract; the final application regression already covers an empty identity.
