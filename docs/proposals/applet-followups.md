# Response: what the second applet shook out

Status: accepted with changes, 2026-09-28, released in 0.21.0. Answers `Architecture/pudl-proposal-applet-followups.md` in the parkscomputing repository.

1. **Preset links and reaching an instance** are accepted as one mechanism, as proposed, and instances stay private.
   - `data-applet-preset="name"` on a link is handled by the runtime. It is caught before other scripts see the click, so a preset inside a region is never taken for a region navigation.
   - The instance it sets up must be in the same window as the link, or, like the link, in no window. The proposal asked only to prefer that one. A link that reached into some other window's applet when its own had none would surprise the reader more than a navigation does, so with no instance beside it the link navigates. Among several candidates, the nearest before the link wins.
   - The state is the mount's `data-applet-param` value when the link carries that parameter, and otherwise the link's whole query. That is the convention the site already follows: an applet's own-page query and its state string share one grammar.
   - A mount that keeps its state in the address gets the preset as a new history entry, because the link it stands in for would have been one. Back undoes it.
   - `pudl:applet-state` fires just before `init` with a writable `detail.state`, as proposed. It is not cancelable, because there is nothing for cancelling to mean: a listener that wants no state sets `null`. The listener must answer synchronously, so a host keeping state in IndexedDB reads it ahead of time.
2. **The fill pattern for intrinsically sized content** is in the README beside the measuring wrapper. The pointer mapping uses the element's bounding rectangle rather than `clientWidth`, so it holds under CSS transforms, and the text says to leave the canvas without border or padding.
3. **Observed.** `data-applet-fit="flow"` on an article's mount, for an article that opens in a window, now has its example: the article reader's colour-mixing article. The site's `<meta name="applet-page">` stays the site's. PUDL has no server, and a page that is nothing but its applet is already told apart by `ownsUrl` and by a `data-applet-fit="fill"` on its mount.
