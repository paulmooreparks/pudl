# Proposal: what parkscomputing.com found missing

Status: proposed, 2026-09-26. Not built.

Adopting PUDL on parkscomputing.com turned up gaps that belong in PUDL rather than in the site. The site's architecture document (`Architecture/pudl-adoption.md` in that repository) lists four under "Proposed upstream to PUDL". Reading the site's `desktop.js` and `applets.js` turned up three more, each a workaround for something PUDL should provide. This document takes them in order of size and recommends a disposition for each.

## 1. `[hidden]` loses to component display rules

`.btn { display: inline-flex }` and every other component that sets `display` override the `hidden` attribute, because an author rule beats the browser's own `[hidden] { display: none }`. Every PUDL project trips over it, and `pudl-windows.css` already carries its own `.win[hidden]` patch for the same reason.

**Recommendation:** add `[hidden]:not([hidden="until-found"]) { display: none !important; }` to `pudl.css`, and drop the per-component patches. The exception keeps `hidden="until-found"`, which the HTML standard defines as hidden but findable by in-page search and which relies on `content-visibility`, not `display`.

## 2. A latched toggle button

Sudoku's hint-entry mode needs a button that stays pressed in, and PUDL has that look only inside a segmented control. The menu button from 0.8.0 already shows it while its panel is open.

**Recommendation:** style `.btn[aria-pressed="true"]` with the sunken pressed treatment, `--raise-active-bg` and `--raise-active-shadow`. `aria-pressed` is the ARIA toggle-button state, so one attribute carries both the look and what assistive technology announces, and the state shows through elevation, not colour alone. A project flips the attribute; PUDL ships no script for it.

## 3. The active title bar needs a token

The active window's title bar is filled with `--accent`. A dark theme usually needs a bright accent for link contrast, and a bright accent makes a garish bar. The site overrides the component's rule to get a quieter bar, the raised gradient tinted toward the accent with an accent underline, and it has to trespass on component CSS because no token exists.

**Recommendation:** add three derived tokens to `pudl-windows.css`, `--win-active-bg`, `--win-active-fg` and `--win-active-border`, defaulting to today's filled bar, so a theme tunes the bar without touching a rule. I would also adopt the site's quieter treatment as the default for the dark theme, since the graphite palette's dark accent is bright for the same reason the site's is, and keep the filled bar for the light theme, where the accent is dark and the bar reads as a classic active window. The active window keeps its stronger shadow and accent-tinted border in both themes, so the signal never rests on the bar's colour alone.

## 4. A window-close event

PUDL fires `pudl:window-open` when a window arrives, and nothing when one leaves. The site destroys applets by listening to `pudl:windows-change` and sweeping for mounts that have left the document, which works but runs on every drag.

**Recommendation:** fire `pudl:window-close` on each window element just before it is removed, whether by its close button, by closing its parent, by Back, or by any other route. Content that set up listeners or timers tears them down there.

## 5. A script interface for windows

The site opens and closes windows by clicking PUDL's own buttons from script, because PUDL exposes no functions. Simulated clicks depend on the markup and on the click handler's details.

**Recommendation:** expose `window.pudlWindows` with `open(key, opener)`, `close(key)`, `raise(key)` and `state()`, each doing exactly what the matching link or button does, URL and history included.

## 6. Moving from one window to another in place

When a link inside a window leads to a sibling article, the site wants the new article to take the old one's place rather than pile up beside it. It does that by remembering the old window and clicking its close button once the new one reports it has opened, with a separate path for a sibling that is already open.

**Recommendation:** a link inside a window marked `data-win-replace` opens its target and closes the window it sits in, in one step and one history entry, keeping the old window's placement for the new one. If the target is already open, it is brought forward and the old window closes. This is navigation within a window, the same thing a link does in a browser tab.

## 7. Applets

The site's applet rule (its D14) is that interactive content runs in a PUDL window or as a full page from one implementation. An applet is a mount element naming a script, a stylesheet and the applet's own page, plus a registered `init(root, opts)` that scopes every lookup and listener to `root` and returns an instance with `destroy()`. `opts.ownUrl` tells the applet whether it owns the page's URL: stand-alone it keeps its state there, and inside a window it leaves the URL to the windows and links to its own page for sharing. The runtime loads each applet's assets once, boots mounts on page load and when a window opens, and destroys instances when their mount leaves.

This belongs in PUDL because the need arises from PUDL's own rule that scripts in a fetched window do not run. Every project that puts interactive content in a window has to solve it, and the contract itself says nothing about any one site. It stays small and is not a component framework: PUDL does not render the applet, manage its state or dictate how it is built. It only defines the handshake between content and whichever host it lands in.

**Recommendation:** ship it as an optional `dist/pudl-applets.js`, with the contract in the README and an applet in a sample page. The names become PUDL's own: `data-applet`, `data-applet-src`, `data-applet-css` and `data-applet-page` on the mount, `pudlApplets.register(name, { init })` in place of the site's global object, and in `opts`, `ownsUrl`, `pageUrl`, and `host`, which is `"page"` or `"window"`. The runtime boots applets on `pudl:window-open` and destroys them on `pudl:window-close` by itself, so a page that loads both scripts needs no wiring, and it still offers `boot(scope)` for content a project adds another way. The site moves to the released form by renaming, and sudoku's code changes only in its first and last lines.

One question for later, not for this release: an applet inside a window cannot keep its state in the URL, because the windows own it. A per-window state parameter, such as `s.<key>`, would let it. That is a change to the URL grammar and deserves its own proposal once a second applet wants it.

## Not proposed now

The site notes that PUDL has no script for resizing the master-detail sidebar. PUDL's README already lists that gap; it is worth its own release rather than riding along here.

## Suggested releases

Items 1 to 3 are small and change no contract, and would ship together as 0.9.0. Items 4 to 7 hang together, because applets rely on the close event and the site's in-place navigation relies on the script interface, and would ship as 0.10.0 with the applet sample.
