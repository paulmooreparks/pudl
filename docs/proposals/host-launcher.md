# Host launcher

This design extends the Start control to provide a consistent catalog of destinations and tools under the host's title. The host can be a website, a suite of applications or a desktop application. The existing Start API remains the published contract until the extensions are implemented and released.

## Recorded direction

The host launcher includes Dinah and GK Companion alongside web hosts. Their tool entry points belong in the host launcher. Parks Computing should likewise consolidate its Applets menu into that launcher. Tools and Applets can become catalog categories without retaining separate top-level menus that duplicate the same destinations.

The opener retains the host's identity: yavc.app, Dinah, GK Companion or Parks Computing. Its scope remains stable when the active application, document or window changes. A host chooses its catalog and integration policy; an individual applet cannot silently replace that global scope.

| Host | Catalog responsibility |
|---|---|
| yavc.app | The catalog provides access across applications, including when the current application occupies its own subdomain. |
| Dinah | The catalog provides the tool entry points currently reached through Tools. Its exact membership comes from Dinah's own registrations and permissions. |
| GK Companion | The catalog provides its available tools and registered work areas. Its host controls availability and navigation. |
| Parks Computing | The catalog includes its applets alongside suitable site destinations, replacing the duplicate Applets menu. Its article sidebar remains an independent reading-context decision. |
| bytecode.news | The proposed browsing presentation contains the selected section's index or editorial overview, alongside open reading windows. |
| YAVCHN | Feeds and saved material are candidates for the browsing presentation; adoption requires a host-specific comparison. |

Opening a tool belongs in the launcher. Commands that operate on the current document or selection continue in their relevant menus and toolbars. Moving a tool entry point must preserve its shortcuts, permission rules, instance policy and unsaved-work safeguards. Existing destination URLs remain valid. Hosts decide which entries navigate and which invoke commands, and render them as links or buttons accordingly.

## Presentation proposal

The shared control can present a compact destination menu, a searchable categorized panel or a persistent browsing pane. The latter supports outer resizing and the existing category-divider resizing. The host remembers dimensions and presentation preferences, while PUDL constrains restored geometry to the current viewport and emits state changes. The host title is a toggle. Clicking it opens the launcher; clicking it again while the launcher is visible dismisses the popup or collapses the persistent pane. Reopening restores the same catalog and browsing state rather than creating a duplicate. Arrow Down on the title opens or enters the catalog without toggling it closed.

The content area can compose PUDL lists, grouped links, search results and editorial summaries. Hosts supply content and specialized section views. The control must accommodate different browsing formats without taking ownership of article readers, editors or domain-specific tools.

The title opener, focus handling, placement and keyboard behavior belong to PUDL. Category membership, authorization, remote search, routing, persistence and activation policy belong to the host. A Tools category may be useful, but PUDL does not require that name or invent a tool registry. Desktop hosts can use an application bridge or their own router through the same activation contract.

## Integration work

The presentation switch is a pin glyph toggle with an accessible name and tooltip. It uses the standard pressed button surface while pinned and the raised surface in popup mode. The pin replaces the separate Keep open and Use popup labels. Collapsing a pinned pane retains its pinned preference.

PUDL needs opener-relative placement, a title-menu integration contract and the proposed persistent presentation. Existing Start selectors and methods must remain compatible. Each adopting application needs a separate menu/catalog inventory and migration so existing capabilities remain discoverable. This record defines the shared direction; it does not report those application migrations as implemented.

## Interactive review demos

The [demo hub](../../samples/host-launcher.html) links three fully interactive studies. The corresponding public address is https://paulmooreparks.github.io/pudl/samples/host-launcher.html. GitHub Pages serves main from the repository root.

| Study | Review scenario |
|---|---|
| [Application launcher](../../samples/host-launcher-apps.html) | The host title opens the same catalog in desktop and single-application modes. Working tools include an editor with saved drafts, independent sample documents, a diagram with SVG export, a colour picker and a calculator. |
| [Content browser](../../samples/host-launcher-content.html) | A persistent, resizable catalog presents sample editorial content or a compact list alongside real article windows. It starts in Posts and offers Factoids, Feeds and Tools. The reading samples are original demo text rather than copies of the third-party site's articles. |
| [Desktop tools](../../samples/host-launcher-tools.html) | A Dinah/GK Companion-labelled catalog opens working notes, a checklist, notifications, diagnostics, calculator and expense worksheet. This is an illustrative catalog rather than an inventory of either application's production tools. |

The studies load the existing distribution Start, splitter and window controls. `samples/host-launcher.js` is their shared host adapter, and `samples/host-launcher.css` supplies composition. No distribution assets or production host integrations are modified. The adapter prototypes opener-relative placement and switching one retained catalog node between a temporary popup and a persistent pane.

The outer pane divider and category divider use native PUDL pointer and keyboard interaction. Temporary popups use CSS resizing and provide explicit width/height fields for keyboard users. The host stores effective dimensions, presentation, theme and format as per-demo browser preferences; narrow and wide popup dimensions use separate preference keys. Completed split changes store the currently visible size so a preceding keyboard completion cannot overwrite a more recent pointer gesture's effective geometry.

Catalog presentation, category, query, content format and open-window state are shareable in the address. A category named All is represented explicitly where the initial category is Posts. Back and Forward restore the catalog state, and a clean browser context can open a shared address without inheriting the sender's preferences. Window activation raises an existing instance. The single-application study uses query parameters and maximized windows to demonstrate policy; actual subdomain routing and unsaved-work safeguards remain host integration work.

Drafts and checklist entries remain browser-local. Reset demo preferences resets presentation and geometry while retaining that working data. No production accounts, filesystem services, remote feeds or application bridges are contacted. The landing page explains the implementation boundary for adopters.

The next decision is a review of these presentations and state behavior. The samples do not announce a new public launcher API or a production release.

## Demo validation

The focused host-launcher suite passed in Chromium, Firefox and WebKit. It covers title toggling, the pressed pin state, category filtering, pointer and keyboard resizing, retained dimensions, drafts, single-application switching, SVG export, tool calculations, history and clean-context shared URLs. Screenshots cover light and dark themes and a 390px viewport. Evidence is retained under `tests/output/host-demos-pin-verified/`.

An earlier Chromium run exposed size fields being overwritten by the resize observer while being edited. The observer now leaves the focused field alone, and input applies the requested size immediately. An earlier Firefox run failed during browser context cleanup with a protocol error; that evidence remains under `tests/output/host-demos-pin-final/`. The final suite waits for the SVG download to complete before navigation and closes the browser directly. No whole-project matrix was run for this sample-only change.
