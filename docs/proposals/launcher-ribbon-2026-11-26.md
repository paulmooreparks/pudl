# Launcher ribbon row

The approved ribbon mockup uses a host-declared product row with Launcher, Updates, Settings and Exit. In ribbon mode the product title selects that row, while its hamburger opens the launcher directly. The launcher retains its header actions. A host that declares no additional actions receives one Launcher button. This addresses the empty startup strip without moving or cloning the launcher's own DOM.

## Design decision

On 26 November 2026, the person approved the recommended host-actions row and its product-tab/hamburger behavior from mockup commit 1e4d29ca50ddff465b3fde5f4d9bf29347c74ab1. The single Launcher button becomes the library default. The proposed changing mode labels were rejected. The control remains a pressed toggle with the fixed localized label Show as ribbon. No styling change is included in this decision.

The mockup's invented content and runtime files remain frozen on their separate branch. This production change can share release 0.110.0 with neutral window counts because neither feature has reached generation. The existing source/rendered, generated metadata, ordinary PR/main and public-byte review gates apply to the combined candidate.

## Host declaration

The proposed additive declaration is a hidden `ul[data-menubar-launcher-actions]` directly inside the existing menubar, beside `ul[data-menubar-source]`. It is present before initialization and retained while the bar runs. It contains ordinary menu-list command rows for the host's additional ribbon actions. PUDL prepends its own Launcher command, so hosts declare Updates, Settings and Exit rather than duplicating the opener. The existing markup parser supplies labels, glyphs, links, disabled reasons and toggle state. Hosts continue to own the source controls and their command handlers.

```html
<nav class="menubar" data-menubar data-menubar-ribbon
     data-menubar-launcher="catalog" aria-label="Harbor menus">
  <ul data-menubar-source hidden>
    <li>Harbor</li>
    <li>Chat<ul><li><button type="button">New conversation</button></li></ul></li>
  </ul>
  <ul data-menubar-launcher-actions hidden>
    <li><button type="button" data-cmd="updates" data-menu-glyph="download">Updates…</button></li>
    <li><button type="button" data-cmd="settings" data-menu-glyph="gear">Settings</button></li>
    <li><button type="button" data-cmd="quit" data-menu-glyph="close">Exit</button></li>
  </ul>
</nav>
```

The data-cmd attributes are illustrative host hooks, not a PUDL command registry. A browser host omits Exit unless it can actually quit its application. A host may declare different actions or none. It must keep their labels, authorization and enabled state in step with the commands they invoke. The original launcher header remains independently mounted and usable in popup and pinned presentations.

## Interaction contract

1. The declaration applies only to a menubar with both launcher and ribbon support. Its product title selects the row while the wide ribbon is active. The hamburger always opens or toggles the launcher. The row's Launcher command opens or toggles the same launcher through the existing cancelable host request, passing the actual visible invoker without recursively clicking the product title.
2. Menu mode and collapsed/narrow mode preserve the existing direct product-title launcher route and compact access. The ribbon toggle stays hidden while collapsed. Existing tab-selection memory and ribbon-mode persistence remain in place. A selected product tab, including at startup, always has its Launcher command rather than an empty toolbar.
3. The generated row uses current source controls. Label, enabled-state and source-list changes refresh it in place. Removed or replaced source controls cannot execute through a retained stale row. Disabled commands remain guarded at invocation, and native modified link activation remains available.
4. The Launcher button participates in the existing launcher request and focus contract. Popup/pane interception, repeated activation, pointer versus keyboard focus, named dialog/region presentation and visible-opener focus return remain supported. The product tab must retain tab semantics while the launcher opens or its presentation changes. The shared launcher controller must not overwrite that tab with popover invocation attributes. Its last visible request invoker supplies normal placement and focus return, while explicit host anchors and the compact taskbar route keep their precedence.
5. The optional actions belong only to the product ribbon row. They do not introduce another folded menu or duplicate shortcuts. Hosts retain their normal command and launcher access outside ribbon mode. Localization provides a Launcher caption independently of the existing Open launcher caption used in compact menus.

The generated Launcher caption uses `data-menubar-text-launcher`, defaulting to Launcher. The existing `data-menubar-launcher-label` remains the independent folded-menu caption, defaulting to Open launcher. Exactly one retained direct-child action list is used; if a host declares several, the first is used and later declarations are ignored with a warning. Extras remain outside global shortcut registration.

The documented launcherButton() return remains the retained product identity. While that identity is a ribbon tab, both modules leave its role, selected state and toolbar association under the menubar's ownership. Launcher state synchronization must not turn it back into a popup opener.

A request invoker is eligible only while it is connected and visible. It remains the preferred focus-return control for that presentation, including pin/close transitions. If it disappears, normal configured/visible-opener fallback applies. Explicit host anchors retain placement precedence, and compact presentation retains its taskbar route. A fresh programmatic open or visible presentation with no request uses the configured fallback instead of an unrelated earlier request; closing an existing presentation may still return to its surviving opener. Destroy/restoration must settle without changing an active product tab into an opener.

These decisions remain subject to source and rendered verification before release. No private renderer, generated DOM or private command metadata becomes a host API.

## Ownership and verification

The implementation engineer owns dist/pudl-menubar.js, dist/pudl-launcher.js, tests/menubar-launcher-ribbon.test.js and tests/fixtures/menubar-launcher-ribbon.html in addition to the existing neutral-count assignment. The lead owns this record and public launcher/menu-bar contract documentation. Build owns its combined release plan and generated metadata. The verifier performs read-only source and rendered review. Owners preserve each other's edits.

The focused regression must exercise the default and declared startup rows, product-title versus hamburger behavior in ribbon and menu modes, the fixed toggle label and pressed state, native and intercepted launcher requests, pinned and compact transitions, current command state, removed controls, labels, modified links, keyboard and RTL access, chooser selection, and preservation of normal front-menu selection. Relevant existing launcher, ribbon, continuity, freshness and responsive launcher suites must remain passing in three engines from one unchanged source. Both new features need a new combined source freeze before generation.

## Retained review findings

The existing shared stylesheet hid the host hamburger in wide ribbon mode. A launcher-host-only exception now preserves the direct opener beside its product tab. The focused regression then exposed an invalid chooser setup: available width belongs to the topbar, so limiting the menubar itself did not establish actual title folding. The corrected fixture setup constrains the topbar and waits for the real folding state. The failed original allocation remains retained.

Independent review found that the launcher beforetoggle handler still wrote aria-expanded to its configured control even when that control was the product tab. The other synchronization paths already skip tabs. This writer requires the same ownership guard and a synchronous boundary assertion before the source can freeze. An asynchronous observer restoring the attributes does not satisfy the contract.

The guard and synchronous open/closed assertion were written on 27 November. The assertion observes the retained tab and toolbar association inside the beforetoggle dispatch, before mutation-observer repair. The pretest handoff is retained at tests/output/neutral-count-corrections-20261127/pretest-handoff.json. Its initial edited files used CRLF rather than the original LF and failed the whitespace gate; final LF identities and focused execution still require independent clearance.

Final LF allocation tests/output/neutral-count-corrections-20261127-2 passes all twelve affected count/ribbon and launcher baseline outcomes in three engines. All nine source/test/fixture/CSS identities remain unchanged across that execution, and the whitespace gate passes. The launcher source hashes to b4d373273d5b0190f573c4d2acbddcde93baff659dd2a1601a8cc05edbc07bbf, and its new regression hashes to 9e4a7e7d0766fe0d2f1c76989262c77304f2366c0c57422a3ffa6cb3bd2df420. The final owner handoff is tests/output/neutral-count-corrections-20261127/final-handoff.json. Independent combined clearance remains required before generation, and both unrelated Firefox originals remain open under their separate release disposition.
