# PUDL 0.105.0 verification

PUDL 0.105.0 releases compact taskbar navigation and responsive launcher presentation. Its accepted candidate has fingerprint `1190a954d851598a5b7bb6c69d309e3f1f115d93b6094e88562e6c9e712e396f`. Release preparation preserves the accepted design and adds taskbar measurement corrections found by the full skin suite. Taskbar natural widths retain fractional CSS pixels, preventing a later layout pass from enlarging an unchanged entry through a rounded minimum. Font completion now invalidates cached taskbar text widths in every mode; the full Firefox comparison exposed fallback-font widths surviving until a later resize or skin switch. A controlled delayed-font regression covers this invalidation. Other runtime assets match the accepted candidate; version metadata and documentation are updated.

## Shared and host verification

The final Escape correction passed 3 readable and 21 minified suite runs across Chromium, Firefox and WebKit. The regression first reproduced the original defect in all three engines. Earlier taskbar, launcher and resize verification, including retained intermediate failures and their corrections, is recorded in the [taskbar design](proposals/compact-taskbar-navigation.md) and [responsive launcher design](proposals/responsive-launcher.md).

The final isolated beta build is `responsive-launcher-1190a954d851-a3085de35372`. All 14 focused host runs passed, including Windows followed by two Escape presses, focus restoration, nested popup and modal priority, handled keys, desktop isolation, Size and destination behavior. All 817 candidate archive files and 193 installed distribution assets matched the manifest. All 192 publicly served assets, including actual versioned URLs, matched; LICENSE remains unserved. The host preserved its activation notification and independent preference persistence fixes.

Host evidence includes 41 screenshots, logs, hashes and rollback under `.local/beta/responsive-launcher-1190a954d851/`, recorded in the consumer's `Architecture/compact-taskbar-beta-integration.md`. Original failures remain retained. Paul accepted the beta visually and authorized this release.

## Release gates

Release gates cover the full readable suite in Chromium, Firefox and WebKit, the full minified Chromium suite, generated fonts, skin assets, minifier freshness, reference rendering in both themes and package reference closure. Publication requires passing results, including hosted CI for the release commit. Local evidence is retained under `tests/output/release-01050-*`; publication provenance records the final counts and public artifact checks.

The first full readable run retained a Chromium palette comparison failure. Its historical Standard baseline expected a taskbar tab approximately 27.19 pixels high, while the approved shared taskbar geometry uses 26 pixels in that fixture. The baseline now points to the accepted 0.105.0 runtime commit, preserving full paint and geometry comparisons without removing taskbar coverage. The full skin suite also exposed fractional-width rounding during repeated taskbar measurement. That runtime correction retains the measured CSS width. Two taskbar fixtures still expected navigation entries in Windows; they now exercise the pin popup and ordinary dock scrolling. The first serial local matrix exceeded the shared browser lock's 900-second lease after 239 completed suites, so it is retained as incomplete. Full hosted matrices and separate local runs provide the final release gates. Original local and hosted CI results are retained; corrected results are recorded with publication provenance.

## Verification limits

Physical-device touch, manual assistive-technology checks and real-site WebKit native modified-link behavior remain unclaimed. Browser touch emulation is covered. Consumer desktop testing remains subject to its existing hold. Publication does not authorize consumer installation, restart or production deployment; production remains on 0.104.0 at preparation time.
