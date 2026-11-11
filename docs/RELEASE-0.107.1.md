# PUDL 0.107.1 verification

This release carries the single-application composition feature from the held 0.107.0 candidate. The [contract](MENU-BARS.md#single-application-bar) and [design record](proposals/single-application-menu.md) describe the opt-in. Applet providers require no new marker.

## Cause and correction

The 0.107.0 full branch and tag gates each had one failure among 664 suite results. The new application regression set a wide viewport and immediately tried to focus a title that PUDL had not yet made visible. Its Enter key consequently went to the document textarea. The [Linux WebKit comparison](https://github.com/paulmooreparks/pudl/actions/runs/42941527657) records that sequence in all six baseline attempts, across readable and minified scripts, and passes all six attempts with the expanded-state wait. The failed gates and their artifacts remain recorded in [the held candidate receipt](RELEASE-0.107.0.md).

The correction waits for the bar's collapsed state to clear before giving the identity keyboard focus. The menu runtime is byte-identical to 0.107.0. The version header changes separately. The corrected suite also passes locally in Chromium, Firefox and WebKit against readable and minified scripts.

## Required release gates

The complete branch and tag gates must pass before publication. The archive must be reproduced from the frozen tag and compared with every tagged blob. Its complete manifest must include version, tag, commit, byte counts and SHA-256 and SHA-384 values. CDN stylesheet and script bytes must match the tag before the README examples are updated.

The frozen tag resolves to `e2c05a919dba47ead103b0940e51f3d8200fb01a`. The reproducible archive contains 513 files, including all 196 distribution files, and is 7,227,431 bytes. Every archived file matches its tagged Git blob, and all 995 local references resolve within the archive selection.

| Asset | SHA-256 |
| --- | --- |
| `pudl-0.107.1.zip` | `8b9cac72f0430e9601f56b20e91915dec5a614cd501eafeedf4166ef982be9e6` |
| `pudl-0.107.1-dist-manifest.json` | `8469d48c529a7077b5a36477fb7d001cffeb218c5f0e8ead9edef5964a47f2b5` |

The complete [branch gate](https://github.com/paulmooreparks/pudl/actions/runs/42941998837) passes all five jobs. All four browser artifacts were audited against the frozen commit, with 166 expected suite results each and 664 effective successes. There are no printed failures or runner timeouts.

The first [tag-gate attempt](https://github.com/paulmooreparks/pudl/actions/runs/42941998975/attempts/1) has one failure among 664 suite results. Minified Chromium times out waiting for a new page in the existing `compact-taskbar-popups.test.js` native modified-link check. Its wait starts before the click, and that fixture retains no click-completion or browser-event trace, so the artifact cannot establish whether the click completed. The other 663 suite results pass. All four original artifacts and the attempt metadata are retained separately under `tests/output/release-01071-tag-attempt1/`.

Two [isolated](https://github.com/paulmooreparks/pudl/actions/runs/42943566402) [comparisons](https://github.com/paulmooreparks/pudl/actions/runs/42944262146), each with 80 audited attempts, do not reproduce the timeout across readable and minified assets with current and prior menubar code. The [complete minified sequence with input tracing](https://github.com/paulmooreparks/pudl/actions/runs/42944791882) also passes all 166 audited suite results. These runs provide non-reproduction, not cause closure.

The [second tag-gate attempt](https://github.com/paulmooreparks/pudl/actions/runs/42941998975/attempts/2) passes. Only its failed minified job was repeated; the four original successful jobs remain in the completed gate. The artifact audit selects the latest artifact for each name by creation time, retaining the first failed minified artifact separately. All 664 suite results have effective and process exits of zero, no printed failures and no runner timeouts. Together the branch and completed tag gates contain 1,328 clean audited results at the frozen commit. The original native-popup timeout remains unexplained.

The 105 CDN stylesheet and script files match the tag byte for byte and have verified SHA-384 integrity values. The reference page passes in both themes from the working tree and extracted archive, including Start filtering, launcher popup and pane transitions, and focus return, with no page errors. The README's 25 updated CDN examples match those verified values and accompany this publication receipt.

## Publication decision

Paul authorized publication on 11 November 2026 at 10:38 SGT in bus message 5535. The original native-popup timeout remains unexplained and is an explicitly accepted release limitation. The original artifact lacks the input trace needed to distinguish a missed click, a browser-navigation failure and a test-readiness error. No runtime change was made on speculation. The tag, archive and manifest remained unchanged throughout the investigation.

The [public release](https://github.com/paulmooreparks/pudl/releases/tag/v0.107.1) is published as stable. Fresh public downloads of the archive, checksum and manifest match the hashes above. Verification in a new output folder confirms the ZIP commit, every one of its 513 tagged blobs, all 196 distribution files, and every manifest byte count, SHA-256 and SHA-384 integrity value. The evidence is retained under `tests/output/release-01071-final-public/`.

The earlier candidate's 45 readable and 45 minified menu engine-suite runs, reference checks in both themes, and Dinah's Chromium scratch-host intake remain relevant because the menu runtime is unchanged. They do not replace this release's complete gates. Native-host installation, touch and manual assistive-technology testing are not claimed here.

## Adoption

A host replaces PUDL whole and adds `data-menubar-composition="application"` to its standalone document bar. Dinah takes this release together with a yavc.app release bundling the same PUDL. Its installed acceptance remains Dinah's responsibility. The [public sample](../samples/application-menu.html) exercises a document applet outside a window manager.

yavc.app's read-only candidate intake passes with all 196 bundled files matching the manifest. Its package, launcher/taskbar, editing command, command state, document grouping and Editor session checks pass in Chromium, Firefox and WebKit. The prepared content digest is `7e8ae406a4f6060162c6f9b53e133cdc1b0391db298311108a0935cbff2f4f60`; the consumer has committed and published nothing and plans v0.2.68 after PUDL clearance. Publication is now cleared under Paul's authorization above. yavc.app should verify the unchanged public assets and publish v0.2.68; Dinah should then take both releases and verify the installed standalone host. The consumer rollback remains PUDL 0.106.2 with yavc.app v0.2.67.
