# Response: applets and their hosts

Status: accepted with changes, 2026-09-28, released in 0.20.0. Answers `Architecture/pudl-proposal-applet-hosts.md` in the parkscomputing repository.

The proposal's principle, that an applet knows itself and never its host, is kept throughout. Its four sections, and what became of them:

1. **The registry** is accepted as proposed: `pudlApplets.define(name, { src, css, page, ver })`, with mounts that carry only the name, and the attribute form kept canonical rather than a custom element. Two details were added. A mount's own attributes win over the registry one at a time, not all or nothing. And the order of loading does not matter: a mount that meets a name before its `define()` waits for it, because the runtime starts the page's mounts as soon as it runs, before a site's registry script that loads after it.

2. **The embedded host** is accepted, split into the two questions it combined. How to size is `opts.fit`, `"fill"` or `"flow"`, inferred as proposed (a window fills, anything else flows) and set by the mount's `data-applet-fit` where the inference is wrong, as on a bare page. Whether the applet may write the address is `opts.ownsUrl`, which is now true only on the applet's own page. Before, an applet embedded in an article was told it owned the article's address, which is the bug the proposal would have met first.

3. **The sizing patterns** are in the README's applet section as proposed, with one addition: the measuring wrapper needs `container-type: size` for `cqb` to resolve.

4. **Applet state** is accepted as a handshake: `state()` and `setState(s)` on the instance, `opts.state` for the state the host kept, and `opts.changed(s)`, which fires `pudl:applet-change` on the mount, an event like PUDL's others rather than a callback of the host's. The proposal left placement entirely to the project. PUDL instead takes the embedded case itself, as an opt-in, `data-applet-param`, since keeping a string in the page's query is what the windows already do with theirs: the parameter is replaced rather than pushed, so an article's history is not one entry per move, and `pudl-regions.js` carries it like the windows' parameters and never fetches regions because of it. A window's continuity stays the project's, through the event.

Found on the way and fixed in the same release: applets inside a region swapped by `pudl-regions.js` were never destroyed, and those arriving with a new region never started.
