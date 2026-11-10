# PUDL 0.106.0 release verification

## Intake hold

The release is marked prerelease while two later WebKit failures are investigated. Consumer intake and the dependent standalone Editor implementation are held. The tag and published assets remain unchanged. Any correction to tagged inputs requires 0.106.1.

The duplicate tag run 42889384107 failed the desktop menu's Alt-letter opening check and the destination-picture visibility assertion immediately after closing the last running window. The documentation follow-up run 42889704949 also failed the provider suite. These failures do not erase the passing 660-suite pre-tag gate, but that gate does not explain them. Linux source and minified probes now capture keyboard, focus and popover events and image-node replacement and readiness.

Dinah independently reports 18 passing host suites and a hidden native-window check of stack depths, stable geometry, skin switching and the corrected separator. Its intake remains uncommitted and uninstalled. A matching yavc.app release bundling the cleared PUDL version is also required before Dinah can ship it.

PUDL 0.106.0 is published as [v0.106.0](https://github.com/paulmooreparks/pudl/releases/tag/v0.106.0), fixed at commit `173aeff691839deef5153f78b9533307e780345b`. It supplies taskbar stack edges, firmer Standard raised boundaries, Alloy Bold and the corrected title/detail separator. Paul authorized publication and GK Companion intake in message 5469 after accepting the visual candidate. The standalone Editor follows that delivery and the host's launcher-label correction.

## Published artifacts

- Archive: [pudl-0.106.0.zip](https://github.com/paulmooreparks/pudl/releases/download/v0.106.0/pudl-0.106.0.zip), 7,207,814 bytes and SHA-256 `9eb094a2c67d910e32b8b5a5d11f686b9820dd5dc33cbd61faf914021ffea2bf`.
- Checksum: [pudl-0.106.0.zip.sha256](https://github.com/paulmooreparks/pudl/releases/download/v0.106.0/pudl-0.106.0.zip.sha256), ASCII with LF for portable checksum tools.
- Distribution manifest: [pudl-0.106.0-dist-manifest.json](https://github.com/paulmooreparks/pudl/releases/download/v0.106.0/pudl-0.106.0-dist-manifest.json), SHA-256 `364160290db2051822b8c20d3b401b595743053b93a51ba9f218ea187f5e17bc`.

The archive was built twice from the pushed tag with identical bytes. A fresh download of the public archive, checksum and manifest verified all 505 archived files against tagged Git blobs, including exactly all 196 distribution files. The ZIP comment identifies the commit. All 105 CSS/JavaScript files fetched from jsDelivr at this exact tag match those bytes, and the branch README's 25 CDN examples use their verified SHA-384 hashes. The tag and archive remain unchanged by this verification follow-up.

## Completed verification and limits

[Hosted run 42886505549](https://github.com/paulmooreparks/pudl/actions/runs/42886505549) passed all five jobs for the release commit. Its retained artifacts contain 165 readable suites in each of Chromium, Firefox and WebKit and 165 minified Chromium suites, for 660 successful runs. Every individual result has effective exit zero, with no printed failures or timeouts. Generated fonts, token freshness, release skin admission and minifier freshness pass. Twenty local build unit checks also passed.

The final-input focused checks additionally covered readable and minified assets in all three engines. The reference page was checked in both themes, including Start, Launcher and focus return, and then checked again from the extracted package. Package closure resolves 970 local references with no omissions. Independent visual and throwaway-host reviews, including Paul's visual acceptance, are scoped below and in the linked admission record.

Physical touch, manual assistive-technology acceptance and the omitted live-host chat-state cases remain unclaimed. A prior native provider-navigation timeout did not reproduce in ten focused Linux repetitions or the final full gate; its original artifact is retained and its cause remains open. The diagnosed font-fallback and focus-scroll measurement races and their reproductions are recorded below. The tag-triggered duplicate CI run [42889384107](https://github.com/paulmooreparks/pudl/actions/runs/42889384107) was still running when this receipt was written; the completed gate above checked the identical immutable commit.

## Consumer handoff

Dinah owns GK Companion intake. It replaces the distribution whole in both vendor locations, links Alloy Bold in the main page and separate slideshow document, removes its two separator workarounds, and verifies themes, stack membership changes and clipping before installation. The new catalogue admits Alloy Bold at stylesheet SHA-256 `c68ce257c012822cfc29a37e2050be1c1380441c2b3d8f17149239fdd848955d`. Existing skin selection and defaults remain unchanged, and no database or preference migration is required.

The pre-intake host commit is the rollback. Intake should include current and pressed stacks, bold-title state chips and native destination navigation where the host offers it, in addition to the accepted geometry checks. Dinah reports the Open Document launcher-label correction already installed. After the PUDL intake is installed and verified in GK Companion, the authorized standalone Editor implementation can start under Dinah's recorded host contract. PUDL retains ownership of this release handoff until Dinah accepts it.

## Preparation and gate history

PUDL 0.106.0 preparation combines the accepted taskbar stack appearance, stronger Standard raised boundaries, Alloy Bold and correction of the default title/detail separator. Publication follows the full hosted release gates; the candidate review itself is not a release. Paul approved the visual candidate and in message 5469 authorized delivery into GK Companion, including publication and consumer intake after the required gates pass. The standalone Editor work follows that delivery and the host's garbled Open Document label correction.

## Accepted appearance

The visual candidate is `8739390d5601a1f063024c2ad4eb4489f2ecf70046d40c3a97b485ef4508f447`. Its archive SHA-256 is `6fcfe12338eccf8f25622ce02cc0cf8abdeeff08d16ee2d8a1149fcd2e9628ec`. All 413 packaged files, including 196 distribution files, were verified against its manifest. Independent review and Paul's visual acceptance are captured in the [decision record](proposals/standard-boundaries-alloy-bold.md) and [Alloy Bold admission](../tests/skins/RELEASE-0.106.0-ADMISSION.md).

Two windows receive one rear edge, and three or more receive two, while the exact count remains. The decoration uses existing spacing and preserves foreground state marks. RTL mirrors it. Standard boundaries strengthen raised controls while flat dividers remain unchanged. Alloy Bold supplies Alloy control treatment with Standard active-title colors. The existing default skin remains unchanged.

## Separator correction

The 0.105.0 stylesheet and script contain a doubly encoded separator. The corrected files contain one UTF-8 middle dot, with a space on each side. The regression checks independent stylesheet fallbacks, title-bar and taskbar rendering, accessible names and custom separators. The final readable and minified inputs passed the separator regression in Chromium, Firefox and WebKit.

The new regression also exposed an existing custom-separator inconsistency. The layer receives the separator token, but taskbars outside that layer cannot inherit it. Live DOM inspection confirmed that the title detail inherited the custom separator while the taskbar detail had no token and used its stylesheet default. Each rendered item detail now receives the same separator explicitly, so dock, taskbar and chooser entries agree with their accessible names. Original failed probes and live-state evidence remain under `tests/output/release-01060-separator-*`.

## Required release gates

The final inputs must pass generated fonts, token/schema checks, release skin freshness, unit tests, minifier freshness, complete readable suites in Chromium/Firefox/WebKit and the complete minified Chromium suite. The reference page requires inspection in both themes. Package closure, immutable commit/tag identity, hosted CI, public archive/checksum and CDN verification remain required before declaring a published release. No hosted CI, commit, tag or publication is claimed here.

The first complete local attempt was stopped after an unintended legacy-codepage round trip in the version-update helper changed reference-page Unicode text. That file and the base stylesheet were reconstructed from their original UTF-8 bytes with only the intended version and approved border changes. The incomplete run remains in `tests/output/release-01060-full-source` and is not counted as a release pass. The release instructions now require explicit UTF-8 reads and writes and a bounded version diff.

The next broad local runs exposed token freshness in both readable and minified Chromium: the approved Standard paint declarations had been placed inside the generated specification block. That block is now regenerated unchanged from the vendored specification, and the Standard paint override follows it as authored component styling. No vendored token or generator formula changed. The interrupted broad runs remain under `release-01060-full-source-clean` and `release-01060-full-minified`, with completed-suite summaries and original failures retained. Final-input focused matrices and hosted full release-commit CI provide the replacement gates; incomplete local runs are not counted as complete passes.

Generated fonts, the 20 build unit checks, release skin hashes, minifier freshness and package closure pass locally. The planned package resolves 970 local references across 505 files, including all 196 distribution files. The reference page passed Start and launcher checks in both themes without browser errors, and its complete light/dark captures were inspected. The final-input focused matrices passed all 36 suite runs, six suites in each engine for readable and minified assets. Hosted full-suite CI remains the publication gate.

## Host adoption

Hosts replace the complete distribution. Hosts offering Alloy Bold add `pudl-skin-alloy-bold.css` to each document that renders PUDL, including separate slideshow documents. Existing selection and pin preferences require no migration. Remove title-separator workarounds only after verifying the corrected release. A release does not change the chosen default skin or authorize consumer installation, restart or deployment.

Physical touch, manual assistive-technology checks and omitted live-host chat state cases remain unclaimed. The scoped independent host audit is evidence for the reviewed candidate and its stated limits.

Dinah's follow-up in message 5468 reports a separate installed GK Companion theme failure: its rendered Standard primary-text measurement was 4.52:1 in the hidden audit and 4.46:1 on Paul's machine. The host reports darkening its light accent, hover and danger colors to a minimum 5.02:1 across nine skins and adding a 4.9:1 internal guard. It attributes the difference to font-sensitive rendered sampling and reports the fix installed and pushed. PUDL did not independently repeat that host fix. The earlier sixteen-theme audit therefore retains its machine and font scope; it does not guarantee every consumer environment. The shared Alloy Bold four-palette audit has a measured title-text minimum of 5.136:1.

## First hosted release gate

The first release commit is `a2110f89bdebdfd740c40e9e41aee7d736b73920`, checked by [hosted run 42877763287](https://github.com/paulmooreparks/pudl/actions/runs/42877763287). Publication remains blocked by that run. Readable Chromium passed 164 of 165 suites; its material-skin geometry check saw the grouped taskbar width change from 143.234375 to 143.203125 pixels after selecting Ink. Minified Chromium had the same skin failure and a separate native provider-link navigation timeout, passing 163 of 165. The original job logs and complete artifacts are retained locally. A subsequent unchanged-input local skin run passed in all three engines on Windows; that is non-reproduction, not cause closure. A separate Linux probe branch captures per-child font and geometry state and failed navigation targets. No tag or release is published while these findings remain open.

The Linux investigation used the browser's platform-font inspection. Standard and Matte resolved the count to DejaVu Sans Mono Bold, while Ink resolved the unchanged CSS family to Liberation Mono Bold; their advances were 7.234375 and 7.203125 pixels. The font-loading set reported loaded in both cases. This is resolved for the skin-isolation test by binding its code-font token to the already committed Inter font. The assertion still compares exact geometry, and the default-font stack tests remain unchanged. The controlled Linux probe passed both readable and minified skin suites with an 8-pixel count in every skin, plus ten provider-navigation repetitions. The original provider timeout did not reproduce; its cause remains open, and the test now retains source URL, target URL, destination href and page errors on a future failure. This diagnostic change does not alter its timeout or success conditions. A fresh complete hosted run is required for the corrected release commit.

## Second hosted release gate

The corrected commit `bf3763159b656a57376ee9f4d719ac9e10e864d8` was checked by [hosted run 42881874063](https://github.com/paulmooreparks/pudl/actions/runs/42881874063). Fonts, readable Chromium/Firefox and minified Chromium passed. WebKit passed 164 of 165 suites and failed the existing RTL path-bar focus-scroll check: immediately after focusing the first off-screen link, the read still showed the initial end position. The full run therefore remains a failure and no tag is published. The original WebKit log and artifact are retained under `release-01060-ci-webkit-second-*`. The path-bar stylesheet is unchanged by this release. A separate Linux probe compares the immediate assertion with an observable focus/visibility wait and records subsequent rendering-frame state. This is an investigation, not a claim that the cause is closed.

The timing probe reproduced the RTL failure with the link already focused and fonts loaded. The immediate position was still the initial end; two rendering frames later the list had moved 126 pixels and the first place was visible. A condition wait passed all twenty readable/minified Linux WebKit repetitions. The path-bar test now waits up to five seconds for the focused place to be visible before each focus-scroll measurement. It neither invokes scrolling nor relaxes the existing geometry assertions. This closes the immediate-measurement race; the production path-bar code remains unchanged. The original failure and frame trace remain in `release-01060-path-*` artifacts. The corrected final commit still requires a fresh complete hosted gate.

## Tag-triggered follow-up findings

The duplicate tag run [42889384107](https://github.com/paulmooreparks/pudl/actions/runs/42889384107) failed WebKit after the complete pre-tag gate had passed the identical commit. Its two failures are an Alt-menu opening timeout in `desktop-menubar.test.js` and an immediate close-last destination-picture visibility assertion in `taskbar-providers.test.js`. The tag, release archive and asset identities remain unchanged. The original tag-run log and WebKit artifact are retained under `release-01060-tag-webkit-*`. Consumer handoff completion is held while these cases are investigated; the earlier clean run does not close these new findings.
