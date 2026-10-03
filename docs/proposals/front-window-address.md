# Crafted window addresses

Status: shipped in PUDL 0.39.0, 2026-10-02.

This design addresses the article-sharing goal in [GitHub issue 10](https://github.com/paulmooreparks/pudl/issues/10). The implementation exports a host-chosen address through Copy the link. Selecting the browser address bar continues to export the current workspace.

## Architectural decision

A host may craft a URL around the state it wants to export. The shared address need not reproduce the sender's current workspace. This follows Paul's clarification of [Architectural Principles](<C:/Users/paul/OneDrive/Documents/Architectural Principles.md>): all state needed to reconstruct the chosen view must be represented by that URL, with no hidden alternative authority.

The issue proposed replacing the visible workspace address with the front article's address while restoring other windows from `history.state`. That mechanism is excluded. Exporting an article-only link is permitted, but the current larger workspace keeps its own full URL. No architectural exception is needed.

## Host contract

A window can supply `data-win-href` with its share address. That address may be a clean article path or a URL encoding another chosen state. The host is responsible for serving that state independently of the sender's history. PUDL does not append the current search, other windows or their placements.

When the attribute is absent, sharing uses the title bar's `data-win-action="page"` link. An explicitly empty or invalid attribute disables sharing. The window menu and the article's menu-bar command use the same resolver. When there is no usable address, neither menu offers a window-copy command. A standalone page's existing menu-bar behavior is unchanged.

The resolver accepts HTTP(S) URLs, including other origins, and resolves relative values against the element's document base. It reads the current markup on each request, so the host can change the exported state when the content changes. Open as a page keeps its independent destination.

`pudlWindows.shareURL(key)` returns the absolute URL or null. `pudlWindows.copyLink(key)` returns a promise of automatic clipboard success. Both default to the active, visible front window. If the clipboard is unavailable or refuses the write, a native prompt offers the URL for manual copying. No usable URL returns false without a prompt or event.

A copy attempt emits `pudl:window-link-copy` from the window, bubbling with `{ key, href, ok }`. Hosts can use it for confirmation. False means that automatic copying failed; PUDL cannot determine whether the reader copied manually. Window-menu text and the fallback prompt are translatable through the layer's `data-win-text-copy-link` and `data-win-text-copy-link-manual` attributes.

Clipboard writes use the documented [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText). The fallback uses the documented [browser prompt](https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt); browser policy can suppress it, so a host should also expose the address as an ordinary link when manual copying must always be available.

## Implementation

The windows module owns URL resolution and copying. The menu-bar module delegates to it for window content. The existing workspace serializer, history handling, region navigation and generated window-action links remain unchanged.

The sharing sample renders its article directly at `samples/shared-window.html`. Opening notes and arranging the windows produces a full workspace URL. Copy the link on the article exports its article-only address without changing that workspace. The sample also provides an ordinary article link, which works without JavaScript, and reports the copy result in a status region.

The README and web contract describe the public attribute, functions and event. The changelog explicitly distinguishes this solution from the original request to change what copying the address bar exports. The 0.44.0 issue review retains this resolution and rechecks the sharing regressions; the originally proposed history-only mode remains excluded.

## Verification

The browser regression suite checks that sharing preserves the workspace URL, history payload, history length and window state. It opens both the crafted article URL and the full workspace URL independently, checks reload and history traversal, and verifies that the article is present without JavaScript.

Further checks cover the page-link fallback, both menu surfaces, dynamic and invalid attributes, relative and absolute addresses, missing window keys, successful clipboard results, and refused or unavailable clipboard access. Existing window-menu expectations include the new command.

All 42 suites passed in Chromium, Firefox and WebKit in [release-commit CI](https://github.com/paulmooreparks/pudl/actions/runs/36967764008), including the sharing and menu glyph regressions. All 22 reference sections were inspected in both themes. The 18 distributed CSS and JavaScript files were verified byte-for-byte against the release tag on jsDelivr before updating the README's integrity hashes. `git diff --check` is clean.
