# PUDL 0.106.1 verification

PUDL 0.106.1 corrects a desktop menu race found during the duplicate 0.106.0 tag gate. Publication and consumer intake remain pending the complete gates. The 0.106.0 tag and assets remain immutable and its release is marked prerelease with a hold notice.

## Cause and correction

The Linux WebKit event trace shows Alt+Tab moving focus into the Log window, then focus returning to the editor. The editor becomes current synchronously while its menu redraw waits for an animation frame. The next Alt+O can therefore reach the accelerator handler while its title-letter table still describes Log. The handler formerly rejected an unknown letter before checking whether its menu source was current.

The handler now refreshes a changed menu source before consulting the table. A deterministic regression first draws Log's menu, then focuses the editor and dispatches its mnemonic in the same task. It fails on the old implementation and passes with the correction. This tests the event ordering without adding a delay or forcing a redraw in the test.

The second failure was an immediate image assertion after closing the last running window. Closing it replaces the button with a native destination link and a new image element. Linux source and minified traces show the replacement initially hidden with the glyph visible, then the image load event revealing it and hiding the glyph. This satisfies the documented loading contract. The regression now asserts that a visible identity mark remains during loading and waits for the replacement picture before checking it. Runtime picture code is unchanged.

The original failing artifacts and the Linux probe archive remain under `tests/output`. The earlier unrelated native provider-navigation timeout remains unexplained and is not claimed resolved by these corrections.

## Validation and intake

The corrected menu and picture suites pass locally in Chromium, Firefox and WebKit against readable inputs. Minified focused checks and the complete hosted gates remain required. The release includes all 0.106.0 features and needs complete distribution replacement. Alloy Bold's stylesheet must be linked in each host document that offers it. Existing preferences and skin defaults require no migration.

Dinah's 18-suite and hidden native-window checks passed against 0.106.0, with no installed intake. yavc.app independently verified all 196 distribution files and passed its applet and launcher/taskbar matrices. Those results remain scoped to 0.106.0 and do not substitute for checking the corrected release. A matching yavc.app content release precedes Dinah's final intake. The authorized standalone Editor implementation starts after the launcher correction and stack delivery are installed and verified in GK Companion.
