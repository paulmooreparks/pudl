# PUDL 0.103.0

PUDL 0.103.0 adds category/provider resolution for taskbar destinations, image descriptors with glyph fallback and lazy discovery of unopened launcher rows. Static destination registrations remain supported. Hosts supply stable identity, reopening metadata, authorization and independent application readiness. The supported API and exclusion rules are in [Taskbar pins](TASKBAR-PINS.md).

Taskbar menus now preserve common command order and separator groups across pin membership and live window-state changes. Launcher examples remove duplicate headings while preserving accessible names. [Launcher guidance](LAUNCHER.md) describes useful host actions in the header and their activation behavior.

## Verification

The provider candidate passed 60 focused readable/minified checks across Chromium, Firefox and WebKit. The lazy-row follow-up passed 24 checks, and the menu-order follow-up passed 54 checks across the same engines and asset forms. The final menu-order candidate also passed 15 real-host beta runs covering taskbar menus, unopened launcher rows, category eligibility, pin restoration and launcher/window ordering. These runs checked pictures and common command groups without host menu rewrites.

The launcher-header authoring changes passed nine focused source checks across the three engines. All 24 final release checks passed for components, launcher presentation, header actions and taskbar menu ordering across the three engines in readable and minified assets. The three window-control assets match the accepted beta candidate byte for byte. The reference page was checked throughout in both themes, with Start filtering, launcher pin/unpin and focus return exercised. Retained release evidence is under `tests/output/release-01030-*` in the release worktree.

The real-site WebKit modified-link probe and manual assistive-technology verification remain unclaimed. Local native-link checks passed across the three engines. Menu retention is not promised when provider revalidation replaces its owner link. Consumer production promotion is separate from this release.

## Distribution

The public release provides a reproducible tagged archive and SHA-256 checksum. The release process verifies every archived blob and all distribution assets against the tag, then verifies versioned CDN JavaScript and CSS before updating README integrity examples. Publication provenance is recorded after those public checks complete.
