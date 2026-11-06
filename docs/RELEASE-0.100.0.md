# PUDL 0.100.0

Launcher destinations execute immediately through their original event. Their row receives a static 180 ms selection background before an unpinned popup dismisses. Pinned catalogs remain open. Keyboard and pointer activation share the behavior, disabled and repeated plain actions are guarded, and presentation changes cancel pending dismissal. Native modified clicks, downloads and non-self link targets retain their behavior. Full-page navigation or a modal can supersede the visible interval.

Managed actions use `pudlLauncher.activated(root, actionElement)` when accepted, then execute normally. Existing calls without an element remain valid. Header destinations can opt in with `data-launcher-activate`. Hosts adopting the shared policy must remove delayed click replay and immediate popup-close code. See [the integration contract](LAUNCHER.md).

Start category headings and counts now have balanced vertical padding in either category placement and narrow layouts. The interactive host demos use the shared feedback behavior.

## Validation

All 12 source and 12 minified focused suite runs passed in Chromium, Firefox and WebKit. They cover feedback timing, synchronous execution, focus preservation, rejected and disabled actions, duplicate guarding, native exclusions, reduced motion, cancellation, pin intent, heading spacing and the interactive application, content and desktop-tool demos. Generated minified assets pass the freshness check. No whole-project matrix or manual assistive-technology check was run. CI on publication is additional evidence.

Taskbar pinning and complete window stack persistence are outside this release. The specification remains 0.52.3.

## Publication

The [public release](https://github.com/paulmooreparks/pudl/releases/tag/v0.100.0) is tagged at 4032b35ff0411df406aea76f8b93f9ba4e20bb6e. Its reproducible archive contains 470 files, including all 193 distribution files, and has SHA-256 264be25fd610c0e749edd50a7624ca0c01de82ad6c4a2e0ee940d77093e89532. Public archive and checksum downloads match, every archived blob matches the tag, and all 103 versioned CDN CSS and JavaScript files match their tagged bytes. The branch README contains 25 verified CDN examples for this release.
