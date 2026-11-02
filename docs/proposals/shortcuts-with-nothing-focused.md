# Shortcuts when nothing is focused

This is a backlog proposal recorded on 2 November 2026 from an adopter's report. No product edit or release is authorised by this record.

The shortcut dispatcher in `pudl-commands.js` finds the command scopes along the chain from `document.activeElement` to the page. When nothing is focused, which is the state after a window is activated by its title bar, after a fullscreen show ends, or when a page has just been drawn, the active element is the body, and the chain holds only the scopes registered on the body or the root. A scope registered on a window's mount, or on the one applet mount a page has, is never reached, so its shortcut does nothing and a key the browser also binds, such as F5 or Ctrl+S, goes to the browser. The lead confirmed this against the `chain` function in `dist/pudl-commands.js` at 0.96.6.

The proposed change is a fallback inside the dispatcher. When the chain from the active element reaches no scope but the page's, the dispatcher also tries the scope of the active window's mount (`.win.active`), and when the page has exactly one mount with a scope and no window layer, that mount's scope. The command found that way runs as if its mount had focus. A host that already focuses the mount on activation sees no change, and a page with two mounts and nothing focused still gets no guess. Verification should cover a window activated by its title bar, a page with one mount, a page with two, a key the browser binds, and a modal dialog open, in the three engines.

The adopter works round it today by focusing the active window's mount on activation and on applet start, and by re-dispatching a key pressed with nothing focused at the front mount.
