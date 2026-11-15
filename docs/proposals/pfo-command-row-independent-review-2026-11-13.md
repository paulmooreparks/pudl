# Command-row shortcut independent review

The held command-row correction requires revision. Exact accessible names are repaired, but host-owned shortcuts can receive metadata for a different key than the host implements. The failure reproduces with source and minified JavaScript in Chromium, Firefox and WebKit.

## Blocking host-binding mismatch

The independent probe registers a command with shortcut Control+F9 and bind:false. A host key handler executes that command only on Control+F9. The candidate row advertises aria-keyshortcuts=F9. Bare F9 is delivered to the page and executes nothing; Control+F9 is delivered and executes once. Captured key/modifier events rule out a missing browser delivery in these cases. The six candidate failures remain in results.json, with probe terminal exit 1 and screenshots. The tag has no shortcut metadata and therefore does not advertise this new incorrect chord.

rowShortcuts() always passes the declaration through normal(), which ignores Control as an unrecognized modifier. That parser belongs to the component dispatcher. The dispatcher explicitly skips bind:false commands, so its accepted chord cannot establish a host-owned binding's meaning. The same assumption also prevents a general claim that a host's Mod-family declaration implements all component-owned Control/Meta alternatives.

For component-owned Control+F9, the probe confirms the legacy parser behavior: bare F9 executes, and the Control-modified press adds no execution. Emitting F9 reflects that existing execution, but it contradicts the visible authored hint. A test expecting F9 proves current parser behavior, not correctness of the authored chord. That legacy behavior cannot waive the new host-binding failure. Keep dispatcher scope unchanged while separating host declaration interpretation from component activation. Unsupported or ambiguous declarations should receive no invented metadata. The correction must retain the exact-name repair and meaningful state and reasons.

The [WAI-ARIA shortcut definition](https://www.w3.org/TR/wai-aria-1.2/#aria-keyshortcuts) describes implemented activation/focus keys. It requires standard modifier/key tokens, with alternatives separated by spaces. Metadata does not install a binding. An advertised bare F9 that the host does not implement fails that contract even though the row remains clickable.

## Other independent observations

The probe completes nine combinations across tag/source/minified and the three engines. Tagged direct rows have names Save Ctrl+Alt+K and Toggle Shift+F8. Tagged folded Save also fails exact-name matching. Candidate direct and actually folded rows have exact Save names, and the direct checked Toggle name excludes its decorative shortcut. Visible shortcut hints remain present.

The metadata observations cover Mod, Ctrl, Cmd and Meta spellings, literal space, literal plus, named Plus/Space aliases, an unknown named key and a control character. Supported component Mod-family chords produce Control, Meta and simultaneous Control+Meta alternatives. Literal space produces Space. Unsupported plus/Space aliases and nonprinting/unknown keys produce no metadata, retaining their hints. The existing dispatcher cannot represent a literal plus through its split-on-plus grammar; this review does not add that alias or expand its contract. Those special-key observations are metadata/source checks, not proof of OS-reserved key delivery or every keyboard layout.

The supplied focused suites separately exercise normal/spelling execution for the represented modifier alternatives, dynamic metadata changes/removal, disabled refusal and meaningful reasons, checked state and exactly-once folded click execution. The new converter is row-only. Ordinary controls retain their older metadata conversion; that limitation is outside this held diff and is not certified as repaired. Browser accessibility snapshots and role-name queries do not establish actual screen-reader speech.

## Provenance

The worktree is pudl-command-row-fixes on fix/command-row-shortcut-accessibility over v0.107.1, e2c05a919dba47ead103b0940e51f3d8200fb01a. Source SHA256 is 3d9b3c2fb3d4cf03b5c5c2ca50b2fad12df6c38ca8a0a5e08eca47451b4837cb. Minified SHA256 is b67931b2369d241a1696e1e8c1959747dbbd7f2df6486000fe016ee314ca4cf7; its map is 32306101e79e994eba4e9e30fd997e4c1e4f9f1592d4e63476f6925a483a52b4. Evidence is tests/output/verification-command-row-20261113-2002. before-independent.json contains actual measurements of runtime, documentation, fixtures and tests before execution. audit.json repeats those measurements afterward with no drift. tag-hashes.json confirms the copied tagged commands, menu, toolbar and CSS against raw git blobs.

## Final accounting and handback

The six focused suites pass 18/18 source in 74 seconds and 18/18 minified in 76 seconds, serially on checked port 8897. Both terminal exits are 0. All 36 raw/effective suite exits are zero with no printed failures or timeouts. These supplied regression passes do not close the independent host-binding failure; its nine-record probe retains six candidate failures and terminal exit 1. All original evidence and assertions remain intact.

All owned runners, browsers and servers have exited, and port 8897 has no listener. Execution ownership returns to the lead with REVISE disposition. Packaging remains blocked pending a host-binding metadata correction and independent revalidation. No runtime, existing test, commit, package, release, installation or consumer file was changed.
