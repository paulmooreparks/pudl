# Neutral window counts

The host needs to show a count of busy chats without presenting that number as a warning. The existing attention badge retains its meaning and appearance. This change adds a separate neutral count to the same generated window controls. The approved interface grows when the count appears and reserves no empty space for it.

The count contract is independent of the launcher ribbon contract approved on 26 November 2026. Both changes will travel in 0.110.0 after a combined source freeze and review. The dedicated branch is feat/window-neutral-count-20261126, based on main f8f7f21ab4479fd5acc5edbe9f8dcc7c13bfb90c. The shared Architectural Principles apply from C:/Users/paul/OneDrive/Documents/Architectural Principles.md.

## Contract

1. A window may declare data-win-count with a positive safe integer. Zero, absent, negative, fractional and nonfinite values render no count. The value is read using the same numeric conversion as the existing attention count.
2. An optional data-win-count-label supplies a localized suffix for the accessible name and tooltip. A value of 3 and a label of busy produce 3 busy. The visible badge contains only 3. Whitespace around the suffix is trimmed; the value is text and is never parsed as markup. Without a label, the accessible phrase is the number alone.
3. The count appears wherever windowMark currently draws an attention count, including taskbar controls, dock tabs, rails, stack rows and selector/overflow rows that already use that renderer. A stack button also shows the sum of its represented windows. Attention precedes the neutral count when both appear. The separate Ctrl+Tab switcher retains its existing icon/title/detail presentation, which currently includes no attention badge. The dock strip's More tabs menu also retains its existing title/state rows rather than gaining new badges.
4. The host owns the count's meaning, timing and localization. PUDL does not infer activity, change a window's execution state or introduce polling. A hidden count occupies no layout space. Ordinary tab widths grow naturally when it appears.
5. Attribute changes refresh generated controls and open selector lists. Whole-window updates copy or remove both attributes; body-only updates preserve them. The neutral count does not enter navigation state or storage.
6. The neutral badge uses the existing plain badge appearance without a warning glyph or semantic warning color. It must remain readable in light, dark, selected and forced-color states. Coexisting marks must not overlap in a rail or selector row. A rail remains 40px wide. A rail tab with a neutral count puts its glyph, counts and execution mark in normal flow and grows vertically; long numbers wrap between digits and remain complete. Existing attention-only rail geometry stays unchanged. No numerical abbreviation or clipping is permitted.

## Stack labels

The stack rule sums all valid values and retains a suffix only when every contributing window has the same trimmed label. Mixed labels produce a bare total, while each stack row retains its own suffix. Windows without a positive count do not affect that comparison. The aggregate uses exact decimal accumulation and display, including totals above the safe integer range of an individual value.

The receiving host lead confirmed this rule on 26 November 2026. The host will set data-win-count and the busy suffix on its Chats window and remove the count at zero. Its Notifications window retains the existing attention attribute.

## Ownership and checks

The implementation engineer owns dist/pudl-windows.js, tests/window-count.test.js and tests/fixtures/window-count.html. The lead owns dist/pudl-windows.css, public contract documentation, this record and release coordination. The verifier reviews the bounded contract and final source/rendered evidence without editing either owner's files. Generated copies, version changes, README integrity and publication belong to a later frozen-source build handoff.

The focused regression must cover live valid/invalid/zero updates, independent labels, attention coexistence/order, taskbar and dock/rail presentations, stack sums and mixed labels, open stack rows, whole-window versus body-only updates, and accessible names. Rendered checks must show natural growth without reservation and readable neutral counts in light/dark/forced colors and RTL. Existing attention and window-update checks must remain passing. The final source must be unchanged across the three browser engines before generation.

The readable source and focused regression are in progress. The initial style execution covered neutral contrast across tab grounds, full maximum-safe count values in rails, both directions, nonoverlapping marks, and scroll/peek activation. Its root-font change did not enlarge the fixed-size badge token, so it supplies no enlarged-badge evidence. The retained runner, results and captures are under tests/output/neutral-count-20261126/lead-style. These runs preceded the final source freeze and supply no release acceptance.

The first implementation allocation with all twelve local focused outcomes passing is retained under tests/output/window-count-20261126-6. It is superseded because it routed the separate Ctrl+Tab switcher through the shared mark renderer, introducing additional state, attention and glyph presentation beyond this request. The bounded correction restores that switcher's existing presentation and retains its baseline tests. This corrects the proposal's earlier assumption that the switcher already used windowMark.

## Count source freeze

The corrected count allocation is tests/output/window-count-20261126-7. All twelve original count, window-update, state-presentation and baseline-switcher child receipts have raw and effective exit zero, no deadline and no printed failure. The original switcher function is restored. Twelve focused count captures and six baseline captures remain retained. These local receipts have revision=null and do not establish hosted or minified acceptance.

The earlier style allocation passed 91 checks in each engine against the following unchanged source identities. It adds attention-only rail geometry/paint comparison with the accepted stylesheet in normal and forced colors to the long-count, contrast, RTL and scroll/peek checks. Its enlarged-badge precondition was invalid as described above. Before/after hashes are retained in tests/output/neutral-count-20261126/lead-style/final-source-before.json and final-source-after.json. This boundary has since changed to correct enlarged-count taskbar containment.

| Count input | SHA256 |
| --- | --- |
| dist/pudl-windows.js | a195e50a22155f0a93003ed2e67611b59e829e2d46f2c89f007ef185012a8a6a |
| dist/pudl-windows.css | 4d0130f820345760208bf043a16dd59bf04723748a3c2ea3179fffb52cf57d07 |
| tests/window-count.test.js | 93dad4a0c2549864fb3f2142cfdebf639673065968478ca778616425efcda37e |
| tests/fixtures/window-count.html | 26f07fabbdbaf7cb27ace2a76eb78b3521667bfb58300319133a9f99c4acab0b |

Earlier originals remain retained. Allocation1 used the wrong existing stack-row marker; allocation3 assumed that a one-member group remained a stack. Allocation5 found a lost switcher detail class and an unexplained Firefox invalid-value wait timeout. A later read-only probe and later passes do not establish the cause of that timeout. Allocation6 passed but was rejected for the scope expansion described above. No assertions or deadlines were relaxed to obtain the corrected outcome.

Independent count review and the combined ribbon/controller source freeze remain pending. Generation is held until both features receive the required source and rendered disposition.

## Enlarged-badge correction

The replacement allocation at tests/output/neutral-count-20261126/lead-style-doubled asserts the computed neutral and attention badge fonts before checking geometry. It observes 11px and 22px in all three engines and passes 113 rail checks per engine. Capture inspection exposed taskbar clipping outside those assertions. The next allocation at lead-style-doubled-taskbar adds taskbar containment and fails in all engines because enlarged badge height exceeds the fixed entry height, after its horizontal width cap was removed.

The corrected taskbar rule retains complete natural entry width and uses the existing folding and horizontal scroll path. A taskbar containing a neutral count grows its shared entry-height token with the badge text, preserving alignment across its controls. Normal-size entries and attention-only bars retain their prior height. The corrected allocation at lead-style-doubled-taskbar-fixed passes 137 checks per engine. It retains the earlier failures unchanged and does not establish combined release acceptance. Before/after source identities and rendered captures accompany that allocation.

The separate pressure.cjs execution in that directory passes in all three engines. At a 320px viewport and computed 22px badge text, each maximum-safe count can be scrolled fully into view in LTR and RTL. The check verifies every digit against the badge, entry and visible dock rectangles and retains eighteen captures. Capture inspection covered both directions in each engine. The unchanged windows stylesheet at this boundary hashes to 6fac4162affac947ac7f4b429c8110675bb7d9eaa9f0e590b5ff2fbd48452f5f.

The permanent count suite now includes actual 11px/22px taskbar containment and 320px LTR/RTL scroll checks. Final LF allocation tests/output/neutral-count-corrections-20261127-2 passes all twelve affected count, ribbon and launcher baseline outcomes across three engines. The final owner handoff and lead receipt inspection are retained under tests/output/neutral-count-corrections-20261127. The test hashes to 41cbb59c05de5a0fadb9c5ebee8e35bce7dd865e167908bf680f8aa228284c19. All nine recorded inputs match before and after execution. The initial CRLF attempt and whitespace finding remain retained, and independent combined clearance is still required before generation.
