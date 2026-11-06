# PUDL 0.99.0

The host launcher is now a shared control in `pudl-launcher.js`. It keeps a Start catalog mounted while switching between popup, pinned pane, collapsed pane and closed presentations. The controller owns placement, bounded popup dimensions, pin state, focus and cleanup. Hosts keep the catalog, destination actions, URLs and saved preferences. Load the new module after Start and the splitter; existing Start catalogs work without it. The [launcher contract](LAUNCHER.md) defines the markup hooks, initialization options, API and events.

Immediate unpinning restores the popup that was just pinned. Activating an enabled destination or clicking outside the pinned catalog clears that return intent, so subsequent unpinning closes the launcher. Disabled destinations leave the intent intact. Query/category state, mounted rows and host work survive presentation changes. The transient intent is not persisted across reloads.

The standard menu bar can open the launcher directly from its identity title and hamburger through `data-menubar-launcher`, including keyboard and collapsed-menu activation. Its other menus and active application menus retain their existing behavior. Hosts without the attribute retain the ordinary identity menu. `pudlMenubar.launcherButton()` exposes the retained opener and its visible collapsed counterpart for placement and focus return.

The [host studies](../samples/host-launcher.html) now use the shared controller. They demonstrate real site/application menus, a right-aligned segmented demo selector, standard full-width taskbars with bulk controls, Size settings in a PUDL popover, and title, top-button and taskbar launcher positions. The content study places orientation links directly on the desktop background, with articles opening over them. The reference page includes an interactive launcher example, and the component inventory records the composed structure.

## Validation

The focused source suites passed 39 runs across Chromium, Firefox and WebKit, covering the launcher, Start, applet startup, menu integration, splitters, component surfaces and consistency. Evidence is retained under `tests/output/release-0990-source/`. All 15 minified suite runs passed, and the reference example passed in light and dark themes without page errors. Those checks are retained under `tests/output/release-0990-minified/` and `tests/output/release-0990-reference.json`.

The independent launcher fixture checks multiple controllers, both unpin paths, disabled destinations, retained catalog nodes and query, no-op presentation without DOM writes, viewport bounds, destruction, focus restoration and reinitialization. Native popup state is reported synchronously during `beforetoggle`; asynchronous toggle delivery does not leave the public state stale. The demo suite retains the taskbar, background article, menu, shared URL, narrow layout, draft and working-tool checks. Generated assets pass the freshness check.

No whole-project matrix was run locally. GitHub CI on the release push is follow-up evidence. This release retains specification 0.52.3; the README's stale specification label is corrected to match the vendored tokens.

## Publication

The release is public at https://github.com/paulmooreparks/pudl/releases/tag/v0.99.0. Its immutable commit is 1f64a1f2cd2310e8569223e5f72b49bd5f96ad1c and its annotated tag object is 68fcc2b6031539cc27f0c33d0e7a336e1c8d621c. The reproducible archive contains 468 files including all 193 distribution files, occupies 7043672 bytes, and has SHA-256 163a5e6fe44e4f989049529c695d7d89359a2bcf12cbb5d2fc7c02b5b90c5e87. Unauthenticated downloads of the archive and checksum match; every archived blob and the ZIP commit comment match the tag. All 103 versioned CDN CSS and JavaScript files match the tagged bytes. Main's 25 CDN examples use the verified 0.99.0 hashes. Package closure found no missing roots, file differences or unresolved references.
