# Command-row host-binding repair independent review

The held host-binding metadata repair closes the six independent failures. The unchanged original probe now advertises Control+F9 for the host-owned declaration, while delivered bare F9 does nothing and Control+F9 executes once in Chromium, Firefox and WebKit with both source and minified JavaScript. Tagged name-contamination observations and all prior failure evidence remain preserved.

## Contract and source review

Host-owned rows now use a separate authored-chord parser when bind:false. That parser does not call normal() or spelling(), does not add component modifier alternatives, and preserves Control, Meta, simultaneous modifiers and explicitly authored alternative lists. It accepts standard Space, Plus and AltGraph tokens. Ambiguous shorthand, duplicate modifiers, nonprinting or unrecognized named keys and invalid alternative lists omit metadata while preserving visible hints. The accepted named-key list is intentionally bounded; absence of metadata is not a claim that a host could never implement another key.

The component-owned conversion and activation dispatcher remain unchanged. Their existing Control spelling limitation therefore remains visible in the independent probe's bound-command control; this repair does not claim to fix it. Ordinary controls retain their older metadata path. The row-only exact-name repair, checked state, meaningful detail/reasons and disabled refusal remain intact.

The new host-binding suite exercises actual delivered Control-only, Meta-only, simultaneous and explicitly listed alternatives, with execution counts that reject invented simultaneous alternatives. It also covers dynamic updates/removal, folded rows and changes between component-owned and host-owned binding. Space/Plus and AltGraph are metadata grammar checks, not fresh proof of physical or OS-reserved key delivery. The host remains responsible for implementing its declaration. These boundaries agree with the [WAI-ARIA shortcut contract](https://www.w3.org/TR/wai-aria-1.2/#aria-keyshortcuts), which describes implemented shortcuts and does not itself install key handling.

## Independent evidence

Evidence is tests/output/verification-command-host-20261113-2130. probe.cjs is byte-identical to the earlier independent script. Its nine records include three tagged controls and six candidate combinations. The probe exits 0 with no failures. Candidate direct and actually folded names remain exact Save; candidate rows retain Control+F9 metadata with host counts zero for bare F9 and one after Control+F9. No candidate page errors occur. Full key-delivery records and captures remain attached to those observations.

Source SHA256 is 92e25714274d1a9b76ebfd7e2235fd75747adec5739587abd6698048c7122b62. Minified SHA256 is 9d2dbcce2215c13dce267bf9ea69bdb7359e66f559e58efc7b85c4c330a2ca26; its map is d0a3d97692ae20ce4b1f999729cd4b1a1aeea1d5a3e5329bf35c9c42e2ac78bc. before-independent.json contains actual held-file measurements before execution. audit.json repeats them afterward with no runtime, documentation, fixture or test drift and confirms original-probe byte identity.

## Final accounting and handback

The seven focused suites pass source 21/21 in 79 seconds and minified 21/21 in 102 seconds, serially on checked port 8903. Both terminal exits are 0. All 42 raw/effective suite exits are zero without printed failures or timeouts. Complete runner directories and logs are retained beside the audit. The old failed probe and earlier REVISE report remain historical evidence.

All owned runners, browsers and servers have exited, and port 8903 has no listener. Execution ownership returns to the lead with PASS for this bounded repair. Packaging remains the lead's decision. No runtime, existing test, commit, release, installation or consumer file was changed. OS/browser reserved delivery, every keyboard layout and actual assistive speech remain unverified.
