# Window stack persistence

PUDL maintains a complete logical stack independently of window membership, taskbar order, MRU and dock-tab arrangement. `pudlWindows.state().zOrder` returns a detached array of every open key from bottom to top. Since PUDL 0.101.0, the window URL serializes that stack as `z.order`.

The [interactive sample](../samples/window-stack.html) lets you raise, minimize, dock and close windows, then reload their saved address. Hosts that already persist the window layout URL need no separate array or manual Z-index override. Hosts using region navigation must update `pudl-regions.js` alongside the window script and stylesheet.

## Normalization and visibility

An explicit `z.order` keeps the first occurrence of each valid key named in `open`. Invalid, duplicate and non-open keys are discarded. A key remains valid while its fragment is loading. Omitted open keys are prepended in their `open` order, below the explicitly ordered members. An empty or wholly invalid explicit list therefore starts with the open-key order.

A valid `top` takes precedence over a contradictory stack. Its family moves to the front; parents precede their children, children remain contiguous with their parent, and the selected child is last within that family. Other sibling order remains stable. The current parent relation is content-owned: it holds only while the named parent is open and is itself a root. These rules are applied consistently to rendering, state snapshots and generated URLs.

When an explicit stack has no valid top, PUDL chooses its highest visible eligible member. A valid minimized top remains recorded as a restoration target; it is not unminimized during normalization. If no member is visible, an omitted top remains null. Minimized and hidden dock members retain logical positions for later restoration.

An old URL without `z.order` follows the existing live-stack/open-order fallback and top selection. Once managed state is written, it includes the normalized stack. Back and Forward restore explicit order independently of the current live stack. A changed stack makes a default layout distinguishable from its untouched bare address.

The array is a logical stack. Existing rendering bands remain in effect: edge-docked windows stand above ordinary windows, and their selected tabs and split groups retain their own rules. Snapped windows participate in the ordinary stacking band. The contract does not permit arbitrary interleaving across dock bands.

## Restoration and lifecycle

PUDL stages windows during restoration using the read-only `data-win-restoring` marker. They remain connected and measurable but are hidden until the restored geometry, stack and selection are applied. `pudl:window-open` retains its existing initialization timing and may occur while that marker is present. Applets should initialize their content there without treating restoration as a request to activate or focus themselves.

Fragment arrival order does not determine stack order. Failed fragments are removed from open state and the normalized stack. Replacement and rekey preserve the corresponding logical slot before applying normal activation rules, and closing a parent removes its children. Explicit activation continues to raise windows normally; raising replaces the current history entry as before.

Focus entering a staged window does not count as activation. After restoration, a host that explicitly calls an activation API or focuses a background window can still change the stack. Such actions remain the host's responsibility. Persisting Z order does not suppress deliberate activation or repair an application that steals focus later during asynchronous initialization.
