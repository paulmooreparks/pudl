# PUDL 0.104.0 verification

PUDL 0.104.0 releases the shared pinned taskbar section, site-menu tear-offs, common taskbar folding and the Arrange taskbar toggle. The accepted candidate has source fingerprint `73c8338a72e3c00f82b6a7b47804ed0fa4808e2625d05ed09bca0d85424b703d`. Release preparation changes version metadata and documentation while preserving its runtime implementation.

## Shared verification

The affected minified matrix passed 87 of 87 runs across Chromium, Firefox and WebKit. The final focused minified checks passed 18 of 18 runs. Final readable lifecycle, arrangement, provider and ordering checks passed 12 of 12 runs, and readable menu and preview checks passed 6 of 6 runs. The minifier freshness and whitespace checks passed. Wide and narrow rendered screenshots were inspected.

The initial readable matrix passed 86 of 87 runs. Its WebKit narrow-overflow failure exposed a host-grid sizing assumption, which was corrected and covered at rendered viewport widths. A later focus-return failure exposed the menu controller overwriting the editor return target. The corrected lifecycle check passed in all three engines. Original failures remain retained with their corrections.

## Real-host verification

The frozen candidate was deployed to an isolated beta host. All 805 archived files and 193 deployed distribution files matched its manifest. The shared-section suite and 15 existing regression runs passed across Chromium, Firefox and WebKit. Coverage includes menu pins, applet suppression, unavailable restoration, picture icons, foreground toggling, section ordering, narrow folding, Arrange cancellation and content focus. Signed-in preference persistence passed. The host suite passed 141 tests with six existing skips.

The beta host retains the complete preference envelope and accepts long canonical menu IDs within its total storage limit. Hosts must preserve these references and must not impose a shorter undocumented ID limit.

The same frozen runtime was subsequently deployed to a production host under separate authorization. All 193 live assets matched beta. Eighteen focused production runs passed across Chromium, Firefox and WebKit, along with the complete Chromium launcher suite. Account persistence remains beta-verified only.

## Limitations

The real-site WebKit modified-link navigation probe remains unclaimed. Intermediate account confirmation and picture timeouts were retained without an assigned cause; the final account run passed. Manual assistive-technology and physical-device touch checks have not run. Touch coverage uses browser emulation. A second consumer has verified the candidate archive and bundle files, but its runtime checks remain paused under a separate host instruction.

Publication does not authorize consumer installation, restart or production deployment.

## Publication provenance

The [public release](https://github.com/paulmooreparks/pudl/releases/tag/v0.104.0) is tagged at `1793669234fd1c4ef50bee22a41807b91ff6a11a`. Its reproducible archive contains 491 files, including all 193 distribution assets. The archive is 7,153,096 bytes and has SHA-256 `ac9cb885e81b59528d007d9e097a95ac838e2875eacc8ebad65252e019c08a4d`.

The public archive and checksum were downloaded into a fresh directory. Every packaged blob matches the tag and the distribution file set is complete. All 103 versioned CDN JavaScript and CSS files match their tagged bytes. The branch README contains 25 verified integrity examples. All runtime distribution files are identical to the accepted candidate; the only distribution difference is the version comment in `pudl.css`.

The reference page passed light and dark checks for Start filtering, launcher presentation and focus return without page errors. Its screenshots were inspected. Packaging resolves 934 local references without missing roots or omitted linked files. Retained publication evidence is under `tests/output/release-01040-*`.

The broader [CI run](https://github.com/paulmooreparks/pudl/actions/runs/42351412730) was still running when publication checks completed. The focused shared and real-host results above remain the release verification basis. This release does not lift any consumer testing, installation or restart hold.
