# PUDL 0.96.7

This point release lets a command shortcut pressed with nothing focused reach the front window's applet. Paul approved the proposal in docs/proposals/shortcuts-with-nothing-focused.md on 2 November 2026, and the lead implemented, reviewed and published it from the primary checkout.

The dispatcher in `pudl-commands.js` looks up command scopes along the chain from the focused element to the page. With focus on the body, as it is after a window is activated by its title bar, a fullscreen show ends or a page is drawn, that chain held only the scopes on the body and the root, so a scope on a window's mount never saw its key, and a key the browser also binds, such as F5 or Ctrl+S, went to the browser. Now, when the focused element is the body or the root, the scopes inside the front window (`.win.active`) are tried before the page's; on a page with no window layer whose scopes all share one command table, that applet's scope is tried. A page with two applets and nothing focused still gives no one the key, a focused field anywhere keeps the ordinary lookup from that field, and a modal dialog keeps every key.

## Validation

The new suite tests/shortcuts-unfocused.test.js checks a key with nothing focused going to the front window's applet and being taken from the browser, the same after another window is activated by its title bar, a page-only key still reaching the page, a key in a window's field going to that window rather than the front one, a key in a field outside the windows going nowhere and being left to the browser, a modal dialog keeping the key, a page with one applet, a page with two applets, and the absence of page errors. It passed with the command, command-bar, command-menu-update-continuity, applets, applet-start and desktop-menubar suites in Chromium, Firefox and WebKit. Generated minified copies pass the freshness check.

Under Paul's minimal-testing direction no whole-project matrix or independent second review was run. GitHub CI runs the full suites on the push; its result is follow-up evidence and publication does not wait for it.

## Limits

The menu bar's own shortcut dispatch for a front applet's contributed menus still requires focus inside the applet's content, as the menu bar documentation says; this release changes the commands script only. A host that already focuses the mount on activation sees no change.

## Publication

Publication identity follows the immutable tag. The archive, its checksum, the public download and the versioned CDN files must match the tag before adoption handoff. Main receives verified 0.96.7 CDN examples after publication.
