# Start launcher research

This research proposes a first-class launcher control. It records recommendations for discussion, not an approved implementation contract. The existing [launcher proposal](launcher.md), accepted and built in 0.8.0, supplies the menu/popover foundation; the README already describes a categorized launcher with filtering. The missing work is a documented discovery experience, reusable presentation and integration with applications and their open instances.

## Lessons from other projects

| Project | Documented behavior | Proposed lesson for PUDL |
| --- | --- | --- |
| [Xfce Whisker Menu](https://docs.xfce.org/panel-plugins/xfce4-whiskermenu-plugin/start) | Favorites, category browsing and recent applications coexist with a search field focused on opening; search matches descriptions as well as names. | Support recognition and search together. A person who knows the task but not the application name should still find it. |
| [KDE Plasma launcher](https://docs.kde.org/stable_kf6/en/plasma-desktop/plasma-desktop/panel.html) | Favorites and an applications browsing structure support starting applications; recently opened files are also reachable. | Keep user-selected shortcuts close to the entry point, with an explicit route to the complete catalog. |
| [GNOME Activities](https://help.gnome.org/gnome-help/shell-apps-open.html) | Typing finds applications by names or related terms; favorites and an all-applications view provide visible alternatives. | Give pointer users a complete visible path and keyboard users a short path to the same catalog. |
| [PowerToys Run](https://learn.microsoft.com/en-us/windows/powertoys/run) | A keyboard launcher searches applications and running processes and exposes secondary result actions. | Distinguish starting a tool from returning to an existing instance, and make meaningful secondary actions visible. |

These are design references rather than comparative usability measurements. Their documented features do not establish which layout will work best in PUDL.

## Recommended shape

The launcher should have a consistently placed, visibly labeled Start button with a glyph. A host may choose another appropriate label, such as Apps. A hamburger alone gives too little information about what opens.

The opening panel should show a search field named Search applications, a small user-arranged Pinned area when pins exist, and an explicit All applications route. A first-time reader with no pins should see the catalog immediately. The catalog should have stable alphabetical order, with category filtering available when the catalog is large enough to benefit. Hovering across categories should not change the contents.

Application rows should carry an icon, a name and a concise purpose. Longer explanations belong in a details view or the full catalog page. Showing a paragraph on every row makes the catalog expensive to scan and scroll. The supplied desktop screenshot shows this cost in its permanent application sidebar; an anchored launcher could recover that working width while an optional full catalog remains available for exploration.

Search should match names, descriptions and host-supplied keywords. Exact application-name matches should precede weaker description matches, with a stable tie order. Terms such as draw or flowchart should be able to find a diagram tool when the host supplies those associations. Empty results should explain what was searched and offer a clear way to reset the query. The initial scope should remain applications; documents and commands can be separate, explicitly named result groups if a later design requires them.

An application with open instances should say so. The default activation policy must be specified by the host and visibly explained where ambiguous. Returning to an existing window and opening another instance must be distinct actions. Multiple open instances should be identified by their document or workspace titles. The launcher should consume host application/window state rather than infer it by watching arbitrary page mutations.

Pinned ordering should remain under the reader's control. Any Recently used section should be optional and separately labeled, leaving the stable catalog order alone. Hosts own persistence and history policy; the control should not silently create another store of application usage.

On a wide layout the panel should open against its button with bounded height and an independently scrolling catalog. A narrow layout should use a sheet with a continuously reachable search field and Back control. Both presentations should share the catalog and activation rules. Search should not rebuild unchanged rows, and updates to open-instance indicators should preserve focus and scroll.

## Semantics and validation

The control should compose PUDL's existing popover, filtering, list and window primitives. Navigation destinations remain real links, while commands such as creating an additional instance are buttons. Search fields and navigation lists should not be forced into command-menu semantics merely because the control is called a Start menu. Keyboard opening, Escape, focus return, arrow navigation and shortcuts need one documented contract across both presentations. Browser or operating-system shortcuts must not be assumed available for capture.

A prototype should compare known-name search, unknown-name task discovery, category browsing, returning to an existing window and starting an additional instance. It should include an empty-pins first use, an unavailable application, multiple open documents, no search results, touch and keyboard interaction, zoom, RTL and screen-reader names. The design should keep usable catalog navigation when enhancement is unavailable.

The next design step is a clickable comparison of the opening panel and All applications view, using both a small catalog and a catalog of at least fifty applications. This would make density, discoverability and launch-versus-return behavior reviewable before committing to a new public API.

## HTML mockups

The category selector is a native PUDL navigation list, with the current row marked by its accent edge and bold text. The divider between categories and applications uses the existing split-pane handle and pudl-split.js. Pointer dragging and arrow keys resize the panes, Home and End reach the limits, and Enter or a double-click resets the split. The category list remains a list on narrow screens, with a wider handle for touch. No vertical button or segmented-control variant is introduced.

`samples/start-menu-mockup.html` puts categories on the right; `samples/start-menu-left-mockup.html` puts them on the left. They share `start-menu-mockup.css` and `start-menu-mockup.js` and load the existing PUDL stylesheet. Custom category surfaces, list-row type and padding, custom field chrome, the hand-styled popup and decorative workspace illustration have been removed. The distribution and public control API are unchanged.

Both versions have a searchable twelve-application catalog, a Pinned category, category/result counts, short metadata descriptions, a native empty-state component and links to working PUDL samples. Typing starts a whole-catalog search; choosing a category can then narrow those matches. Query and category are addressable, and Back restores category history. Clear remains in place and is disabled when the query is empty. The panel opens against the Start button and becomes a narrow-screen sheet with two resizable lists. Escape and the close button restore focus to Start; outside dismissal leaves focus with the clicked control.

Both variants passed focused interaction checks in Chromium, Firefox and WebKit with no page errors. Desktop light/dark and 390px-wide captures were reviewed. Selected and unselected category rows, application rows and the search group were compared against unmodified PUDL instances for typography, padding, backgrounds, borders and shadows. Their appearance matches; custom CSS supplies composition and layout. All application targets resolve to existing sample files. These checks establish mockup behavior and the tested component properties, not a production accessibility audit or control contract.

The catalog and fixed pins are illustrative. The mockups do not record preferences in browser storage, discover installed applications, or implement multi-instance window selection. Those remain contract decisions for the eventual component.
